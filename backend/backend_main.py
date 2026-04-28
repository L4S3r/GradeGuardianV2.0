import hmac
import hashlib
import secrets
import os
import uuid
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, String, Float, DateTime, Integer, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, ConfigDict, Field
import jwt

# ─────────────────────────────────────────────────────────────────────────────
# 1.  SECURITY SETUP
# ─────────────────────────────────────────────────────────────────────────────
SALT_FILE = "secret_salt.txt"

def get_or_create_salt():
    if os.path.exists(SALT_FILE):
        with open(SALT_FILE, "r") as f:
            return f.read().strip()
    new_salt = secrets.token_hex(32)
    with open(SALT_FILE, "w") as f:
        f.write(new_salt)
    return new_salt

SECRET_SALT   = os.getenv("SECRET_SALT",   get_or_create_salt())
JWT_SECRET    = os.getenv("JWT_SECRET",    secrets.token_hex(32))   # sign tokens
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72   # professors stay logged in for 3 days


def build_grade_data_string(grade_id, student_id, course_code, grade, recorded_at):
    ts_str    = recorded_at.replace("Z", "").split(".")[0]
    grade_val = "{:.1f}".format(float(grade))
    return f"{grade_id}|{student_id}|{course_code}|{grade_val}|{ts_str}"

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
    return hash_password(plain) == hashed

def create_jwt(professor_id: str) -> str:
    payload = {
        "sub": professor_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str) -> str:
    """Returns professor_id or raises HTTPException."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired — please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ─────────────────────────────────────────────────────────────────────────────
# 2.  DATABASE SETUP
# ─────────────────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./grades.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


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
    letter_grade = Column(String)
    recorded_at  = Column(DateTime, default=datetime.utcnow)
    hash         = Column(String)


class AuditLogDB(Base):
    __tablename__ = "audit_logs"
    id           = Column(Integer, primary_key=True, index=True)
    grade_id     = Column(String, ForeignKey("grades.id"), index=True)
    action       = Column(String)
    status       = Column(String)
    checked_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    error_details = Column(String, nullable=True)


Base.metadata.create_all(bind=engine)


# ─────────────────────────────────────────────────────────────────────────────
# 3.  PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class ProfessorRegister(BaseModel):
    name:        str
    employee_id: str
    department:  str
    email:       str
    password:    str

class ProfessorLogin(BaseModel):
    email:    str
    password: str

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

class GradeResponse(GradeCreate):
    id:           str
    professor_id: Optional[str] = None
    recorded_at:  datetime
    hash:         str
    is_verified:  bool = Field(default=True)
    model_config  = ConfigDict(from_attributes=True)

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
app = FastAPI(
    title="GradeGuardian API",
    description="Multi-professor grade management with HMAC integrity checks.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

def get_current_professor(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> ProfessorDB:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    professor_id = decode_jwt(credentials.credentials)
    professor = db.query(ProfessorDB).filter(ProfessorDB.id == professor_id).first()
    if not professor:
        raise HTTPException(status_code=401, detail="Professor not found")
    return professor


# ─────────────────────────────────────────────────────────────────────────────
# 5.  AUTH ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/auth/register", response_model=TokenResponse, status_code=201)
async def register(data: ProfessorRegister, db: Session = Depends(get_db)):
    # Check duplicates
    if db.query(ProfessorDB).filter(ProfessorDB.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(ProfessorDB).filter(ProfessorDB.employee_id == data.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already registered")

    professor = ProfessorDB(
        id            = str(uuid.uuid4()),
        name          = data.name,
        employee_id   = data.employee_id,
        department    = data.department,
        email         = data.email,
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
async def login(data: ProfessorLogin, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    query = db.query(GradeDB).filter(GradeDB.professor_id == current.id)
    if student_id:
        query = query.filter(GradeDB.student_id == student_id)

    grades  = query.all()
    results = []

    for g in grades:
        data_str     = build_grade_data_string(g.id, g.student_id, g.course_code, g.grade, g.recorded_at.isoformat())
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
    now    = datetime.now(timezone.utc)

    db_grade = GradeDB(
        id           = new_id,
        professor_id = current.id,
        student_id   = grade_data.student_id,
        course_name  = grade_data.course_name,
        course_code  = grade_data.course_code,
        grade        = grade_data.grade,
        letter_grade = grade_data.letter_grade,
        recorded_at  = now,
    )

    data_to_hash   = build_grade_data_string(new_id, grade_data.student_id, grade_data.course_code, grade_data.grade, now.isoformat())
    db_grade.hash  = compute_hash(data_to_hash)

    db.add(db_grade)
    db.commit()
    db.refresh(db_grade)
    return db_grade


@app.post("/repair/{grade_id}")
async def repair_grade(
    grade_id: str,
    db: Session = Depends(get_db),
    current: ProfessorDB = Depends(get_current_professor),
):
    grade = db.query(GradeDB).filter(GradeDB.id == grade_id, GradeDB.professor_id == current.id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    data_string  = build_grade_data_string(grade.id, grade.student_id, grade.course_code, grade.grade, grade.recorded_at.isoformat())
    grade.hash   = compute_hash(data_string)
    db.add(AuditLogDB(grade_id=grade.id, action="Admin Repair", status="REPAIRED", error_details="Manual re-seal"))
    db.commit()
    return {"status": "success", "message": "Integrity restored"}


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
    current: ProfessorDB = Depends(get_current_professor),
):
    grade_ids = data.get("grade_ids", [])
    results   = []

    for g_id in grade_ids:
        grade = db.query(GradeDB).filter(GradeDB.id == g_id, GradeDB.professor_id == current.id).first()
        if not grade:
            results.append({"grade_id": g_id, "is_valid": False, "error": "Not found"})
            continue

        data_string  = build_grade_data_string(grade.id, grade.student_id, grade.course_code, grade.grade, grade.recorded_at.isoformat())
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
    return results


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


@app.get("/")
async def root():
    return {"message": "GradeGuardian API v2 is Online", "status": "Secure"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)