import hmac
import hashlib
import secrets
import os
import re
import uuid
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, String, Float, DateTime, Integer, ForeignKey, inspect, text, or_
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel, ConfigDict, Field, field_validator
import jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from dotenv import load_dotenv

# Determine backend directory path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from .env file inside backend directory
env_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Initialize Supabase Client (if credentials present)
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    supabase_client: Optional[Client] = (
        create_client(SUPABASE_URL, SUPABASE_KEY) if (SUPABASE_URL and SUPABASE_KEY) else None
    )
except Exception:
    supabase_client = None

# ─────────────────────────────────────────────────────────────────────────────
# 1.  SECURITY SETUP
# ─────────────────────────────────────────────────────────────────────────────

SALT_FILE = os.path.join(BASE_DIR, "secret_salt.txt")

def get_or_create_salt():
    if os.path.exists(SALT_FILE):
        try:
            with open(SALT_FILE, "r") as f:
                return f.read().strip()
        except Exception:
            pass
    new_salt = secrets.token_hex(32)
    try:
        with open(SALT_FILE, "w") as f:
            f.write(new_salt)
    except Exception:
        # Read-only filesystem (e.g. Vercel Lambda execution)
        pass
    return new_salt

# Get salt from environment or generate/read from file
SECRET_SALT = os.getenv("SECRET_SALT")
if not SECRET_SALT:
    SECRET_SALT = get_or_create_salt()
    print("Using secret salt:", SECRET_SALT)

# Get JWT secret and security configs from environment
JWT_SECRET      = os.getenv("JWT_SECRET", os.getenv("JWT_SECRET_KEY", "gradeguardian_production_super_secret_jwt_key_2026_x99"))
JWT_ALGORITHM   = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
HMAC_SECRET     = os.getenv("HMAC_SECRET", "gradeguardian_production_hmac_secret_salt_2026_v2").encode('utf-8')
FACULTY_SECRET_KEY = os.getenv("FACULTY_SECRET_KEY", "DOCTOR-SECURE-2026")

def sanitize_sql_input(text: Optional[str]) -> Optional[str]:
    """Sanitizes input parameters against SQL injection patterns, control characters, and unsafe tokens."""
    if not text:
        return text
    # Strip dangerous SQL quotes, semicolons, null bytes, and comment operators
    cleaned = re.sub(r"[\x00'\";\\--]", "", text)
    # Rejects suspicious SQL DDL/DML injection payloads
    sql_keywords = r"\b(DROP|ALTER|TRUNCATE|DELETE|INSERT|UPDATE|UNION|EXEC|xp_)\b"
    if re.search(sql_keywords, cleaned, re.IGNORECASE):
        raise HTTPException(
            status_code=400,
            detail="Potential SQL injection payload or unauthorized character sequence detected."
        )
    return cleaned.strip()

# Use this identical function in BOTH backends
def build_grade_data_string(grade_id, student_id, course_code, grade, letter_grade, recorded_at):
    # Normalize: accept datetime object or any ISO string variant
    if hasattr(recorded_at, 'strftime'):
        ts_str = recorded_at.strftime('%Y-%m-%dT%H:%M:%S')
    else:
        # Strip +00:00, Z, microseconds — always keep exactly YYYY-MM-DDTHH:MM:SS
        ts_str = str(recorded_at).replace('+00:00', '').replace('Z', '').split('.')[0][:19]
    
    grade_val = "{:.1f}".format(float(grade))
    return f"{grade_id}|{student_id}|{course_code}|{grade_val}|{letter_grade}|{ts_str}"

def compute_hash(data_string: str) -> str:
    return hmac.new(
        SECRET_SALT.encode(),
        data_string.encode(),
        hashlib.sha256
    ).hexdigest()

def hash_password(password: str) -> str:
    """Simple PBKDF2 password hash (no extra deps needed)."""
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode(), SECRET_SALT.encode(), 260_000
    ).hex()

def verify_password(plain: str, hashed: str) -> bool:
    if hashed.startswith("$2b$") or hashed.startswith("$2a$"):
        try:
            import bcrypt
            return bcrypt.checkpw(plain.encode(), hashed.encode())
        except Exception:
            pass
    return hash_password(plain) == hashed

def create_jwt(subject: str, role: str = "professor") -> str:
    payload = {
        "sub": subject,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str) -> dict:
    """Returns JWT payload dictionary or raises HTTPException."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if "role" not in payload:
            payload["role"] = "professor"
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired — please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ─────────────────────────────────────────────────────────────────────────────
# 2.  DATABASE SETUP (SQLite / Supabase PostgreSQL)
# ─────────────────────────────────────────────────────────────────────────────
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "grades.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

if not DATABASE_URL or "[YOUR-PASSWORD]" in DATABASE_URL or "[password]" in DATABASE_URL:
    DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine_kwargs = {}
if "sqlite" in DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Optimized for Supabase PostgreSQL pooler & Vercel serverless environment
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine       = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()

if "sqlite" in DATABASE_URL:
    print("[INFO] Database Engine: Local SQLite (grades.db)")
else:
    db_target = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else "PostgreSQL"
    print(f"[INFO] Database Engine: Remote Supabase PostgreSQL ({db_target})")


class StudentDB(Base):
    __tablename__ = "students"
    id            = Column(String, primary_key=True, index=True)
    student_id    = Column(String, unique=True, nullable=False, index=True)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, nullable=False, index=True)
    department    = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ProfessorDB(Base):
    __tablename__ = "professors"
    id            = Column(String, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    employee_id   = Column(String, unique=True, nullable=False, index=True)
    department    = Column(String, nullable=False)
    email         = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class GradeDB(Base):
    __tablename__ = "grades"
    id           = Column(String, primary_key=True, index=True)
    professor_id = Column(String, ForeignKey("professors.id"), index=True, nullable=True)
    student_id   = Column(String, index=True)
    course_name  = Column(String)
    course_code  = Column(String)
    grade        = Column(Float)
    original_grade = Column(Float, nullable=True)  # Stores grade before any tampering
    original_letter_grade = Column(String, nullable=True)  # Stores letter grade before any tampering
    letter_grade = Column(String)
    recorded_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    hash         = Column(String)

class CourseDB(Base):
    __tablename__ = "courses"
    id           = Column(String, primary_key=True, index=True)
    professor_id = Column(String, ForeignKey("professors.id"), index=True)
    course_code  = Column(String, index=True)
    course_name  = Column(String)
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLogDB(Base):
    __tablename__ = "audit_logs"
    id           = Column(Integer, primary_key=True, index=True)
    grade_id     = Column(String, ForeignKey("grades.id"), index=True)
    action       = Column(String)
    status       = Column(String)
    checked_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    error_details = Column(String, nullable=True)

# ─────────────────────────────────────────────────────────────────────────────
# 2.5 MIGRATION HELPER
# ─────────────────────────────────────────────────────────────────────────────
def run_migrations(engine):
    """Ensures existing tables have the latest columns (simple auto-migration)."""
    inspector = inspect(engine)
    if "grades" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("grades")]
        with engine.connect() as conn:
            if "original_letter_grade" not in columns:
                print("Adding missing column: original_letter_grade")
                conn.execute(text("ALTER TABLE grades ADD COLUMN original_letter_grade VARCHAR"))
            if "original_grade" not in columns:
                print("Adding missing column: original_grade")
                conn.execute(text("ALTER TABLE grades ADD COLUMN original_grade FLOAT"))
            conn.commit()

run_migrations(engine)

Base.metadata.create_all(bind=engine)


# ─────────────────────────────────────────────────────────────────────────────
# 3.  PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class StudentRegister(BaseModel):
    name:       str
    student_id: str
    department: str
    email:      str
    password:   str

    @field_validator('name', 'student_id', 'department', 'email', mode='before')
    @classmethod
    def validate_sql_safety(cls, v: str) -> str:
        if isinstance(v, str):
            sanitize_sql_input(v)
        return v

class StudentLogin(BaseModel):
    student_id: str
    password:   str

    @field_validator('student_id', mode='before')
    @classmethod
    def validate_sql_safety(cls, v: str) -> str:
        if isinstance(v, str):
            sanitize_sql_input(v)
        return v

class StudentOut(BaseModel):
    id:         str
    student_id: str
    name:       str
    email:      str
    department: str
    model_config = ConfigDict(from_attributes=True)

class ProfessorRegister(BaseModel):
    name:               str
    employee_id:        str
    department:         str
    email:              str
    password:           str
    faculty_secret_key: str = Field(..., description="Faculty authorization secret key required for doctor/TA registration")

    @field_validator('name', 'employee_id', 'department', 'email', mode='before')
    @classmethod
    def validate_sql_safety(cls, v: str) -> str:
        if isinstance(v, str):
            sanitize_sql_input(v)
        return v

class ProfessorLogin(BaseModel):
    email:    str
    password: str

    @field_validator('email', mode='before')
    @classmethod
    def validate_sql_safety(cls, v: str) -> str:
        if isinstance(v, str):
            sanitize_sql_input(v)
        return v

class ProfessorResponse(BaseModel):
    id:          str
    name:        str
    employee_id: str
    department:  str
    email:       str
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    professor:    ProfessorResponse

class GradeCreate(BaseModel):
    student_id:   str
    course_name:  str
    course_code:  str
    grade:        float
    letter_grade: str

class GradeUpdate(BaseModel):
    grade:        float
    letter_grade: str

class GradeResponse(GradeCreate):
    id:           str
    professor_id: Optional[str] = None
    recorded_at:  datetime
    hash:         str
    original_grade: Optional[float] = None  # Original grade before tampering
    original_letter_grade: Optional[str] = None  # Original letter grade before tampering
    is_verified:  bool = Field(default=True)
    model_config  = ConfigDict(from_attributes=True)

class CourseCreate(BaseModel):
    course_code: str
    course_name: str

class CourseResponse(CourseCreate):
    id:           str
    professor_id: str
    model_config  = ConfigDict(from_attributes=True)

class BatchGradeCreate(BaseModel):
    grades: List[GradeCreate]

class AuditLogResponse(BaseModel):
    grade_id:      str
    action:        Optional[str] = None
    status:        str
    checked_at:    datetime
    error_details: Optional[str] = None
    model_config   = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# 4.  APP & MIDDLEWARE
# ─────────────────────────────────────────────────────────────────────────────
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "false").lower() in ("true", "1", "t")

app = FastAPI(
    title="GradeGuardian API",
    description="Multi-professor grade management with HMAC integrity checks.",
    version="2.0.0",
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)

if not ENABLE_DOCS:
    @app.get("/docs", include_in_schema=False)
    @app.get("/redoc", include_in_schema=False)
    @app.get("/openapi.json", include_in_schema=False)
    async def block_docs():
        raise HTTPException(status_code=404, detail="Not Found")

# Initialize Rate Limiter (e.g., max 100 requests per minute per IP)
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = ["*"] if raw_origins.strip() == "*" else [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_jwt(credentials.credentials)

def require_student(payload: dict = Depends(get_current_user_payload)) -> dict:
    if payload.get("role") != "student":
        raise HTTPException(status_code=403, detail="Students only")
    return payload

def get_current_professor(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> ProfessorDB:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_jwt(credentials.credentials)
    if payload.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Forbidden: Professor role required")
    prof_id = payload.get("sub") if isinstance(payload, dict) else payload
    professor = db.query(ProfessorDB).filter(ProfessorDB.id == prof_id).first()
    if not professor:
        raise HTTPException(status_code=401, detail="Professor not found")
    return professor


# ─────────────────────────────────────────────────────────────────────────────
# 5.  AUTH ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/auth/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, data: ProfessorRegister, db: Session = Depends(get_db)):
    # 2nd Layer Authentication Gate: Verify Faculty Secret Authorization Key
    if not data.faculty_secret_key or data.faculty_secret_key.strip() != FACULTY_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Faculty Secret Authorization Key. Only authorized Alexandria University Doctors/TAs can create professor accounts."
        )

    # Sanitize input fields against SQL injection
    clean_name = sanitize_sql_input(data.name)
    clean_emp_id = sanitize_sql_input(data.employee_id)
    clean_dept = sanitize_sql_input(data.department)
    clean_email = sanitize_sql_input(data.email)

    # Check duplicates using parameterized queries
    if db.query(ProfessorDB).filter(ProfessorDB.email == clean_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(ProfessorDB).filter(ProfessorDB.employee_id == clean_emp_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already registered")

    professor = ProfessorDB(
        id            = str(uuid.uuid4()),
        name          = clean_name,
        employee_id   = clean_emp_id,
        department    = clean_dept,
        email         = clean_email,
        password_hash = hash_password(data.password),
    )
    db.add(professor)
    db.commit()
    db.refresh(professor)

    token = create_jwt(professor.id)
    return TokenResponse(
        access_token=token,
        professor=ProfessorResponse.model_validate(professor),
    )


@app.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: ProfessorLogin, db: Session = Depends(get_db)):
    professor = db.query(ProfessorDB).filter(ProfessorDB.email == data.email).first()
    if not professor or not verify_password(data.password, professor.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_jwt(professor.id)
    return TokenResponse(
        access_token=token,
        professor=ProfessorResponse.model_validate(professor),
    )


@app.get("/professors/me", response_model=ProfessorResponse)
async def get_me(current: ProfessorDB = Depends(get_current_professor)):
    return current


# ─────────────────────────────────────────────────────────────────────────────
# 6.  GRADE ENDPOINTS  (professor-scoped)
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/grades", response_model=List[GradeResponse])
async def get_grades(
    student_id: Optional[str] = None,
    course_code: Optional[str] = None,
    course_name: Optional[str] = None,
    search:      Optional[str] = None,
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    query = db.query(GradeDB).filter(GradeDB.professor_id == current.id)

    # Advanced Multi-field Search
    if search:
        clean_search = sanitize_sql_input(search)
        search_filter = f"%{clean_search}%"
        query = query.filter(or_(
            GradeDB.student_id.ilike(search_filter),
            GradeDB.course_code.ilike(search_filter),
            GradeDB.course_name.ilike(search_filter)
        ))
    else:
        if student_id: query = query.filter(GradeDB.student_id.contains(sanitize_sql_input(student_id)))
        if course_code: query = query.filter(GradeDB.course_code.contains(sanitize_sql_input(course_code)))
        if course_name: query = query.filter(GradeDB.course_name.contains(sanitize_sql_input(course_name)))

    grades  = query.all()
    results = []

    for g in grades:
        data_str     = build_grade_data_string(g.id, g.student_id, g.course_code, g.grade, g.letter_grade, g.recorded_at.isoformat())
        current_hash = compute_hash(data_str)
        is_verified  = (current_hash == g.hash)

        db.add(AuditLogDB(
            grade_id      = g.id,
            action        = "Automatic Integrity Check",
            status        = "PASS" if is_verified else "FAIL",
            error_details = None if is_verified else "Hash mismatch",
        ))
        results.append({
            "id":           g.id,
            "professor_id": g.professor_id,
            "student_id":   g.student_id,
            "course_name":  g.course_name,
            "course_code":  g.course_code,
            "grade":        g.grade,
            "letter_grade": g.letter_grade,
            "original_grade": g.original_grade,
            "original_letter_grade": g.original_letter_grade,
            "recorded_at":  g.recorded_at.isoformat(),
            "hash":         g.hash,
            "is_verified":  is_verified,
        })

    db.commit()
    return results


@app.post("/grades", response_model=GradeResponse, status_code=201)
async def create_grade(
    grade_data: GradeCreate,
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    new_id = str(uuid.uuid4())
    # In create_grade and create_batch_grades (v2)
    now = datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)  # naive, no micros

    db_grade = GradeDB(
        id           = new_id,
        professor_id = current.id,
        student_id   = grade_data.student_id,
        course_name  = grade_data.course_name,
        course_code  = grade_data.course_code,
        grade        = grade_data.grade,
        original_grade = grade_data.grade,  # Store original on creation
        original_letter_grade = grade_data.letter_grade,  # Store original letter on creation
        letter_grade = grade_data.letter_grade,
        recorded_at  = now,
    )

    data_to_hash   = build_grade_data_string(new_id, grade_data.student_id, grade_data.course_code, grade_data.grade, grade_data.letter_grade, now.isoformat())
    db_grade.hash  = compute_hash(data_to_hash)

    db.add(db_grade)
    db.commit()
    db.refresh(db_grade)
    return db_grade

@app.post("/grades/batch", response_model=List[GradeResponse], status_code=201)
async def create_batch_grades(
    batch_data: BatchGradeCreate,
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    now = datetime.now(timezone.utc)
    created_grades = []

    for grade_data in batch_data.grades:
        new_id = str(uuid.uuid4())
        db_grade = GradeDB(
            id           = new_id,
            professor_id = current.id,
            student_id   = grade_data.student_id,
            course_name  = grade_data.course_name,
            course_code  = grade_data.course_code,
            grade        = grade_data.grade,
            original_grade = grade_data.grade,
            original_letter_grade = grade_data.letter_grade,
            letter_grade = grade_data.letter_grade,
            recorded_at  = now,
        )
        data_to_hash   = build_grade_data_string(new_id, grade_data.student_id, grade_data.course_code, grade_data.grade, grade_data.letter_grade, now.isoformat())
        db_grade.hash  = compute_hash(data_to_hash)
        db.add(db_grade)
        created_grades.append(db_grade)

    db.commit()
    return created_grades

@app.put("/grades/{grade_id}", response_model=GradeResponse)
async def update_grade(
    grade_id: str,
    update_data: GradeUpdate,
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    grade = db.query(GradeDB).filter(GradeDB.id == grade_id, GradeDB.professor_id == current.id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    old_grade = grade.grade
    grade.grade = update_data.grade
    grade.letter_grade = update_data.letter_grade
    
    # Update the secure backup so "Repair" restores the legitimate edit, not the creation grade
    grade.original_grade = update_data.grade
    grade.original_letter_grade = update_data.letter_grade

    # Recompute hash for integrity with the new values
    data_string = build_grade_data_string(grade.id, grade.student_id, grade.course_code, grade.grade, grade.letter_grade, grade.recorded_at.isoformat())
    grade.hash = compute_hash(data_string)

    # Securely log the edit in the audit log
    db.add(AuditLogDB(
        grade_id=grade.id,
        action="Grade Edited",
        status="EDITED",
        error_details=f"Grade changed from {old_grade} to {update_data.grade}"
    ))
    db.commit()
    db.refresh(grade)
    return grade

@app.post("/repair/{grade_id}", response_model=GradeResponse)
async def repair_grade(
    grade_id: str,
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    grade = db.query(GradeDB).filter(GradeDB.id == grade_id, GradeDB.professor_id == current.id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    # Prevent legitimizing a tampered record if we don't actually have the backups
    if grade.original_grade is None or grade.original_letter_grade is None:
        raise HTTPException(status_code=400, detail="Cannot repair: secure backup data is missing.")

    # Restore grade from original_grade if available
    if grade.original_grade is not None:
        grade.grade = grade.original_grade

    # Restore letter grade from original_letter_grade if available
    if grade.original_letter_grade is not None:
        grade.letter_grade = grade.original_letter_grade
    
    data_string  = build_grade_data_string(grade.id, grade.student_id, grade.course_code, grade.grade, grade.letter_grade, grade.recorded_at.isoformat())
    grade.hash   = compute_hash(data_string)
    db.add(AuditLogDB(grade_id=grade.id, action="Admin Repair", status="REPAIRED", error_details="Grade restored to original value"))
    db.commit()
    db.refresh(grade)
    return grade


@app.get("/grades/{grade_id}/logs")
def get_grade_logs(
    grade_id: str,
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    logs = db.query(AuditLogDB).filter(AuditLogDB.grade_id == grade_id).all()
    return {"logs": logs}


@app.post("/verify/batch")
async def verify_batch(
    data: dict,
    db: Session = Depends(get_db),
):
    grade_ids = data.get("grade_ids", [])
    results   = []

    for g_id in grade_ids:
        grade = db.query(GradeDB).filter(GradeDB.id == g_id).first()
        if not grade:
            results.append({"grade_id": g_id, "is_valid": False, "error": "Not found"})
            continue

        data_string  = build_grade_data_string(grade.id, grade.student_id, grade.course_code, grade.grade, grade.letter_grade, grade.recorded_at.isoformat())
        current_hash = compute_hash(data_string)
        is_valid     = (current_hash == grade.hash)

        db.add(AuditLogDB(
            grade_id      = grade.id,
            action        = "Batch Verification",
            status        = "PASS" if is_valid else "FAIL",
            error_details = None if is_valid else "Integrity mismatch",
        ))
        results.append({
            "grade_id": grade.id,
            "is_valid": is_valid,
            "error":    None if is_valid else "Integrity check failed",
        })

    db.commit()
    return {"results": results, "status": "success"}


# ─────────────────────────────────────────────────────────────────────────────
# 6.  STUDENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/student/register", status_code=201)
@limiter.limit("5/minute")
async def student_register(request: Request, data: StudentRegister, db: Session = Depends(get_db)):
    if db.query(StudentDB).filter(StudentDB.student_id == data.student_id).first():
        raise HTTPException(400, "Student ID already registered")
    if db.query(StudentDB).filter(StudentDB.email == data.email).first():
        raise HTTPException(400, "Email already registered")

    student = StudentDB(
        id=str(uuid.uuid4()),
        student_id=data.student_id,
        name=data.name,
        email=data.email,
        department=data.department,
        password_hash=hash_password(data.password),
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    token = create_jwt(subject=student.student_id, role="student")
    return {
        "access_token": token,
        "student": StudentOut.model_validate(student).model_dump()
    }


@app.post("/student/login")
@limiter.limit("10/minute")
async def student_login(request: Request, data: StudentLogin, db: Session = Depends(get_db)):
    student = db.query(StudentDB).filter(StudentDB.student_id == data.student_id).first()
    if not student or not verify_password(data.password, student.password_hash):
        raise HTTPException(401, "Invalid Student ID or password")

    token = create_jwt(subject=student.student_id, role="student")
    return {
        "access_token": token,
        "student": StudentOut.model_validate(student).model_dump()
    }


@app.get("/student/me")
async def student_me(payload: dict = Depends(require_student), db: Session = Depends(get_db)):
    student_id = payload.get("sub")
    student = db.query(StudentDB).filter(StudentDB.student_id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    return StudentOut.model_validate(student).model_dump()


@app.get("/student/grades", response_model=List[GradeResponse])
async def get_my_grades(
    payload: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    student_id = payload.get("sub")
    grades = db.query(GradeDB).filter(GradeDB.student_id == student_id).all()
    results = []
    for g in grades:
        data_str = build_grade_data_string(
            g.id, g.student_id, g.course_code,
            g.grade, g.letter_grade, g.recorded_at.isoformat()
        )
        is_verified = (compute_hash(data_str) == g.hash)
        db.add(AuditLogDB(
            grade_id=g.id,
            action="Student View",
            status="PASS" if is_verified else "FAIL",
            error_details=None if is_verified else "Hash mismatch detected on student view",
        ))
        results.append({
            "id": g.id,
            "professor_id": g.professor_id,
            "student_id": g.student_id,
            "course_name": g.course_name,
            "course_code": g.course_code,
            "grade": g.grade,
            "original_grade": g.original_grade,
            "original_letter_grade": g.original_letter_grade,
            "letter_grade": g.letter_grade,
            "recorded_at": g.recorded_at,
            "hash": g.hash,
            "is_verified": is_verified,
        })
    db.commit()
    return results


@app.get("/student/grades/{grade_id}/logs")
async def get_my_grade_logs(
    grade_id: str,
    payload: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    student_id = payload.get("sub")
    grade = db.query(GradeDB).filter(
        GradeDB.id == grade_id,
        GradeDB.student_id == student_id,
    ).first()
    if not grade:
        raise HTTPException(404, "Grade not found")

    logs = db.query(AuditLogDB).filter(AuditLogDB.grade_id == grade_id).order_by(
        AuditLogDB.checked_at.desc()
    ).limit(20).all()

    return {"logs": [AuditLogResponse.model_validate(l).model_dump() for l in logs]}


@app.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    # Return only logs for this professor's grades
    grade_ids = [g.id for g in db.query(GradeDB.id).filter(GradeDB.professor_id == current.id).all()]
    return (
        db.query(AuditLogDB)
        .filter(AuditLogDB.grade_id.in_(grade_ids))
        .order_by(AuditLogDB.checked_at.desc())
        .limit(50)
        .all()
    )


@app.get("/statistics/summary")
async def get_professor_statistics(
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    """Provides a summary of grading statistics for the logged-in professor."""
    grades = db.query(GradeDB).filter(GradeDB.professor_id == current.id).all()
    
    if not grades:
        return {"total_grades": 0, "average_grade": 0, "course_stats": {}, "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}}

    course_map = {}
    distribution = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for g in grades:
        if g.course_code not in course_map:
            course_map[g.course_code] = {"sum": 0.0, "count": 0, "name": g.course_name}
        course_map[g.course_code]["sum"] += g.grade
        course_map[g.course_code]["count"] += 1

        letter = g.letter_grade[0].upper() if g.letter_grade else "F"
        if letter in distribution:
            distribution[letter] += 1
        else:
            distribution["F"] += 1

    return {
        "total_grades_submitted": len(grades),
        "overall_average": round(sum(g.grade for g in grades) / len(grades), 2),
        "course_stats": {
            code: {"average": round(data["sum"] / data["count"], 2), "students": data["count"], "name": data["name"]}
            for code, data in course_map.items()
        },
        "grade_distribution": distribution
    }

# ─────────────────────────────────────────────────────────────────────────────
# 7.  COURSE ENDPOINTS (professor-scoped)
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/courses", response_model=List[CourseResponse])
async def get_courses(db: Session = Depends(get_db), current: ProfessorDB = Depends(get_current_professor)):
    return db.query(CourseDB).filter(CourseDB.professor_id == current.id).all()

@app.post("/courses", response_model=CourseResponse, status_code=201)
async def create_course(
    course_data: CourseCreate,
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor)
):
    new_course = CourseDB(id=str(uuid.uuid4()), professor_id=current.id, **course_data.model_dump())
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course


@app.get("/")
async def root():
    return {"message": "GradeGuardian API is online", "status": "Secure"}

@app.post("/admin/rehash-grades")
async def rehash_grades(
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),  # must be authenticated
):
    grades = db.query(GradeDB).all()
    for g in grades:
        data_str = build_grade_data_string(
            g.id, g.student_id, g.course_code,
            g.grade, g.letter_grade, g.recorded_at.isoformat()
        )
        g.hash = compute_hash(data_str)
    db.commit()
    return {"recomputed": len(grades)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)