'use strict';

const crypto     = require('crypto');
const fs         = require('fs');
const path       = require('path');
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const { Pool }   = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ─────────────────────────────────────────────────────────────────────────────
// 1.  SECURITY SETUP
// ─────────────────────────────────────────────────────────────────────────────
const BASE_DIR          = __dirname;
const SALT_FILE         = path.join(BASE_DIR, 'secret_salt.txt');
const FACULTY_KEY_FILE  = path.join(BASE_DIR, 'faculty_key.txt');

const IS_PRODUCTION = ['production', 'prod'].includes(
  (process.env.ENVIRONMENT || process.env.VERCEL_ENV || 'development').toLowerCase()
);

function getOrCreateSalt() {
  if (fs.existsSync(SALT_FILE)) {
    try { return fs.readFileSync(SALT_FILE, 'utf8').trim(); } catch (_) {}
  }
  const newSalt = crypto.randomBytes(32).toString('hex');
  try { fs.writeFileSync(SALT_FILE, newSalt, 'utf8'); } catch (_) {}
  return newSalt;
}

function getOrCreateFacultyKey() {
  if (fs.existsSync(FACULTY_KEY_FILE)) {
    try {
      const key = fs.readFileSync(FACULTY_KEY_FILE, 'utf8').trim();
      if (key) return key;
    } catch (_) {}
  }
  const newKey = `GG-FACULTY-${crypto.randomBytes(24).toString('base64url')}`;
  try { fs.writeFileSync(FACULTY_KEY_FILE, newKey, 'utf8'); } catch (_) {}
  return newKey;
}

// ── SECRET_SALT ───────────────────────────────────────────────────────────────
// Required in production. In development, auto-generated and saved to a local file.
let SECRET_SALT = process.env.SECRET_SALT || getOrCreateSalt();
if (IS_PRODUCTION && !process.env.SECRET_SALT) {
  throw new Error('CRITICAL SECURITY ERROR: SECRET_SALT environment variable is required in production.');
}

// ── JWT_SECRET ────────────────────────────────────────────────────────────────
// Required in all environments. No hardcoded fallback.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Add it to your .env file.');
}

const JWT_ALGORITHM    = 'HS256';
const JWT_EXPIRE_HOURS = parseInt(process.env.JWT_EXPIRE_HOURS || '24', 10);

// ── HMAC_SECRET ───────────────────────────────────────────────────────────────
// Used by computeHash() for grade integrity. Required in all environments.
const HMAC_SECRET = process.env.HMAC_SECRET;
if (!HMAC_SECRET) {
  throw new Error('CRITICAL: HMAC_SECRET environment variable is not set. Add it to your .env file.');
}

// ── BCRYPT_ROUNDS ─────────────────────────────────────────────────────────────
// Cost factor for bcrypt password hashing. Default 12 (good balance for 2026 hardware).
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// ── FACULTY_SECRET_KEY ────────────────────────────────────────────────────────
// Required to register professor accounts. Auto-generated locally for dev if missing.
const FACULTY_SECRET_KEY = process.env.FACULTY_SECRET_KEY || getOrCreateFacultyKey();

// ─────────────────────────────────────────────────────────────────────────────
// Security helpers
// ─────────────────────────────────────────────────────────────────────────────
const SQL_INJECTION_PATTERN = /\b(DROP|ALTER|TRUNCATE|DELETE|INSERT|UPDATE|UNION|EXEC|xp_)\b/i;

function sanitizeSqlInput(value) {
  if (!value) return value;
  const cleaned = value.replace(/[\x00'";\\]|--/g, '');
  if (SQL_INJECTION_PATTERN.test(cleaned)) {
    const err = new Error('Potential SQL injection payload or unauthorized character sequence detected.');
    err.status = 400;
    throw err;
  }
  return cleaned.trim();
}

function buildGradeDataString(gradeId, studentId, courseCode, grade, letterGrade, recordedAt) {
  // Normalize timestamp to exactly YYYY-MM-DDTHH:MM:SS (no timezone, no micros) in UTC
  let dateObj;
  if (recordedAt instanceof Date) {
    dateObj = recordedAt;
  } else {
    let rawStr = String(recordedAt).trim();
    if (!rawStr.includes('T') && rawStr.includes(' ')) {
      rawStr = rawStr.replace(' ', 'T');
    }
    // If it has timezone offset like +03 or +00, new Date() parses it correctly.
    // If it has no timezone, we assume UTC (add 'Z') to match DB/Vercel behavior
    if (!rawStr.endsWith('Z') && !rawStr.includes('+') && !/-\d{2}:\d{2}$/.test(rawStr) && !/-\d{2}$/.test(rawStr)) {
      rawStr += 'Z';
    }
    dateObj = new Date(rawStr);
  }

  const tsStr = dateObj.toISOString().replace('Z', '').split('.')[0];
  const gradeVal = parseFloat(grade).toFixed(1);
  return `${gradeId}|${studentId}|${courseCode}|${gradeVal}|${letterGrade}|${tsStr}`;
}

// NOTE: computeHash uses HMAC_SECRET (separate from SECRET_SALT).
// SECRET_SALT is used only for bcrypt legacy PBKDF2 fallback paths.
// HMAC_SECRET is the dedicated key for grade integrity signatures.
function computeHash(dataString) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(dataString).digest('hex');
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(plain, hashed) {
  if (!hashed) return false;
  return bcrypt.compare(plain, hashed);
}

function createJwt(subject, role = 'professor') {
  return jwt.sign(
    { sub: subject, role },
    JWT_SECRET,
    { algorithm: JWT_ALGORITHM, expiresIn: `${JWT_EXPIRE_HOURS}h` }
  );
}

function decodeJwt(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    if (!payload.role) payload.role = 'professor';
    return payload;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const e = new Error('Token expired — please log in again'); e.status = 401; throw e;
    }
    const e = new Error('Invalid token'); e.status = 401; throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.  DATABASE SETUP (Supabase PostgreSQL)
// ─────────────────────────────────────────────────────────────────────────────
let DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL || DATABASE_URL.includes('[YOUR-PASSWORD]') || DATABASE_URL.includes('[password]')) {
  console.warn('[WARN] DATABASE_URL not configured. Set it in .env');
}
if (DATABASE_URL.startsWith('postgres://')) {
  DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://');
}

// Build Pool config — always pass ssl: { rejectUnauthorized: false } for
// Supabase's self-signed pooler certificate chain (applies to all sslmode values).
const poolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10s — gives Vercel cold starts enough time to reach Supabase
};

if (DATABASE_URL) {
  // Strip ?sslmode=... from the URL so pg doesn't double-parse SSL options,
  // then apply our own ssl object to avoid the self-signed cert rejection.
  poolConfig.connectionString = DATABASE_URL.split('?')[0];
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

if (DATABASE_URL) {
  const host = DATABASE_URL.split('@')[1] || 'PostgreSQL';
  console.log(`[INFO] Database Engine: Remote Supabase PostgreSQL (${host})`);
}

// DB query helper
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.5 SCHEMA & MIGRATION
// ─────────────────────────────────────────────────────────────────────────────
async function runMigrations() {
  // Create tables if they don't exist
  await query(`
    CREATE TABLE IF NOT EXISTS professors (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      employee_id   TEXT UNIQUE NOT NULL,
      department    TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS students (
      id            TEXT PRIMARY KEY,
      student_id    TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      department    TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS grades (
      id                    TEXT PRIMARY KEY,
      professor_id          TEXT REFERENCES professors(id),
      student_id            TEXT NOT NULL,
      course_name           TEXT,
      course_code           TEXT,
      grade                 FLOAT,
      original_grade        FLOAT,
      original_letter_grade TEXT,
      letter_grade          TEXT,
      recorded_at           TIMESTAMPTZ DEFAULT NOW(),
      hash                  TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS courses (
      id           TEXT PRIMARY KEY,
      professor_id TEXT REFERENCES professors(id),
      course_code  TEXT NOT NULL,
      course_name  TEXT NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id            SERIAL PRIMARY KEY,
      grade_id      TEXT REFERENCES grades(id),
      action        TEXT,
      status        TEXT,
      checked_at    TIMESTAMPTZ DEFAULT NOW(),
      error_details TEXT
    )
  `);

  // Simple column migrations (idempotent)
  const addColIfMissing = async (table, column, colDef) => {
    try {
      await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${colDef}`);
    } catch (_) {}
  };
  await addColIfMissing('grades', 'original_grade', 'FLOAT');
  await addColIfMissing('grades', 'original_letter_grade', 'TEXT');

  console.log('[INFO] Database migrations complete.');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.  EXPRESS APP & MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
const app = express();

// Trust proxy (Vercel, Cloudflare, etc.)
app.set('trust proxy', 1);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Helmet — security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })
);
// Additional headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS
// ALLOWED_ORIGINS must be set in .env. No hardcoded production URLs.
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:8000';
const allowedOrigins = rawOrigins.trim() === '*' ? '*' : rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: allowedOrigins !== '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
}));

// ─── Rate limiters ───────────────────────────────────────────────────────────
function makeLimiter(max, windowMs = 60_000) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ detail: 'Too Many Requests' }),
  });
}

const globalLimiter  = makeLimiter(100);
const authLimiter    = makeLimiter(5);
const gradeLimiter   = makeLimiter(30);
const batchLimiter   = makeLimiter(20);
const verifyLimiter  = makeLimiter(20);
const adminLimiter   = makeLimiter(5);

app.use(globalLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// 4.  AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
function extractBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ detail: 'Not authenticated' });
  try {
    req.user = decodeJwt(token);
    next();
  } catch (err) {
    res.status(err.status || 401).json({ detail: err.message });
  }
}

function requireProfessor(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ detail: 'Not authenticated' });
  try {
    const payload = decodeJwt(token);
    if (payload.role !== 'professor') return res.status(403).json({ detail: 'Forbidden: Professor role required' });
    req.user = payload;
    next();
  } catch (err) {
    res.status(err.status || 401).json({ detail: err.message });
  }
}

function requireStudent(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ detail: 'Not authenticated' });
  try {
    const payload = decodeJwt(token);
    if (payload.role !== 'student') return res.status(403).json({ detail: 'Students only' });
    req.user = payload;
    next();
  } catch (err) {
    res.status(err.status || 401).json({ detail: err.message });
  }
}

// Fetch the professor row from DB and attach to req.professor
async function loadProfessor(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM professors WHERE id = $1', [req.user.sub]);
    if (!rows.length) return res.status(401).json({ detail: 'Professor not found' });
    req.professor = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// Combined middleware: JWT auth → professor check → DB load
const professorMiddleware = [requireProfessor, loadProfessor];

// ─────────────────────────────────────────────────────────────────────────────
// 5.  VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function validateBody(schema) {
  return (req, res, next) => {
    for (const [field, rules] of Object.entries(schema)) {
      const val = req.body[field];
      if (rules.required && (val === undefined || val === null || val === '')) {
        return res.status(422).json({ detail: `${field} is required` });
      }
      if (val !== undefined && val !== null) {
        if (rules.maxLength && String(val).length > rules.maxLength) {
          return res.status(422).json({ detail: `${field} exceeds max length of ${rules.maxLength}` });
        }
        if (rules.minLength && String(val).length < rules.minLength) {
          return res.status(422).json({ detail: `${field} must be at least ${rules.minLength} characters` });
        }
        if (rules.type === 'number') {
          const n = parseFloat(val);
          if (isNaN(n)) return res.status(422).json({ detail: `${field} must be a number` });
          if (rules.min !== undefined && n < rules.min) return res.status(422).json({ detail: `${field} must be >= ${rules.min}` });
          if (rules.max !== undefined && n > rules.max) return res.status(422).json({ detail: `${field} must be <= ${rules.max}` });
        }
        // SQL safety on string fields
        if (rules.sqlSafe && typeof val === 'string') {
          try { sanitizeSqlInput(val); } catch (e) { return res.status(400).json({ detail: e.message }); }
        }
      }
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.  AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
app.post('/auth/register', authLimiter, validateBody({
  name:               { required: true, maxLength: 120, sqlSafe: true },
  employee_id:        { required: true, maxLength: 50,  sqlSafe: true },
  department:         { required: true, maxLength: 100, sqlSafe: true },
  email:              { required: true, maxLength: 254, sqlSafe: true },
  password:           { required: true, minLength: 8, maxLength: 128 },
  faculty_secret_key: { required: true, maxLength: 256 },
}), async (req, res, next) => {
  try {
    const { name, employee_id, department, email, password, faculty_secret_key } = req.body;

    // Constant-time comparison against cryptographic Faculty Key
    const keyBuf     = Buffer.from(faculty_secret_key.trim());
    const expectedBuf = Buffer.from(FACULTY_SECRET_KEY);
    const keysMatch  = keyBuf.length === expectedBuf.length && crypto.timingSafeEqual(keyBuf, expectedBuf);
    if (!keysMatch) {
      return res.status(403).json({ detail: 'Invalid Faculty Secret Authorization Key. Only authorized Alexandria University Doctors/TAs can create professor accounts.' });
    }

    const cleanName   = sanitizeSqlInput(name);
    const cleanEmpId  = sanitizeSqlInput(employee_id);
    const cleanDept   = sanitizeSqlInput(department);
    const cleanEmail  = sanitizeSqlInput(email);

    // Check duplicates
    const emailExists = await query('SELECT id FROM professors WHERE email = $1', [cleanEmail]);
    if (emailExists.rows.length) return res.status(400).json({ detail: 'Email already registered' });

    const empExists = await query('SELECT id FROM professors WHERE employee_id = $1', [cleanEmpId]);
    if (empExists.rows.length) return res.status(400).json({ detail: 'Employee ID already registered' });

    const id           = uuidv4();
    const passwordHash = await hashPassword(password);

    await query(
      'INSERT INTO professors (id, name, employee_id, department, email, password_hash) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, cleanName, cleanEmpId, cleanDept, cleanEmail, passwordHash]
    );

    const { rows } = await query('SELECT * FROM professors WHERE id = $1', [id]);
    const professor  = rows[0];
    const token      = createJwt(professor.id);

    res.status(201).json({
      access_token: token,
      token_type:   'bearer',
      professor:    formatProfessor(professor),
    });
  } catch (err) { next(err); }
});


app.post('/auth/login', authLimiter, validateBody({
  email:    { required: true, maxLength: 254, sqlSafe: true },
  password: { required: true, maxLength: 128 },
}), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query('SELECT * FROM professors WHERE email = $1', [email]);
    const professor = rows[0];
    if (!professor || !(await verifyPassword(password, professor.password_hash))) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }
    const token = createJwt(professor.id);
    res.json({ access_token: token, token_type: 'bearer', professor: formatProfessor(professor) });
  } catch (err) { next(err); }
});


app.get('/professors/me', ...professorMiddleware, async (req, res) => {
  res.json(formatProfessor(req.professor));
});

// ─────────────────────────────────────────────────────────────────────────────
// 7.  GRADE ENDPOINTS (professor-scoped)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/grades', ...professorMiddleware, async (req, res, next) => {
  try {
    const { student_id, course_code, course_name, search } = req.query;
    const profId = req.professor.id;

    let sql    = 'SELECT * FROM grades WHERE professor_id = $1';
    const params = [profId];
    let idx    = 2;

    if (search) {
      const s = `%${sanitizeSqlInput(search)}%`;
      sql += ` AND (student_id ILIKE $${idx} OR course_code ILIKE $${idx+1} OR course_name ILIKE $${idx+2})`;
      params.push(s, s, s);
      idx += 3;
    } else {
      if (student_id) { sql += ` AND student_id ILIKE $${idx++}`; params.push(`%${sanitizeSqlInput(student_id)}%`); }
      if (course_code) { sql += ` AND course_code ILIKE $${idx++}`; params.push(`%${sanitizeSqlInput(course_code)}%`); }
      if (course_name) { sql += ` AND course_name ILIKE $${idx++}`; params.push(`%${sanitizeSqlInput(course_name)}%`); }
    }

    const { rows } = await query(sql, params);
    const results  = [];
    const failLogs = [];

    for (const g of rows) {
      const dataStr    = buildGradeDataString(g.id, g.student_id, g.course_code, g.grade, g.letter_grade, g.recorded_at);
      const currentHash = computeHash(dataStr);
      const isVerified  = currentHash === g.hash;

      // H-3: Only audit FAIL events
      if (!isVerified) {
        failLogs.push([g.id, 'Automatic Integrity Check', 'FAIL', 'Hash mismatch detected']);
      }
      results.push(formatGradeResponse(g, isVerified));
    }

    for (const [gid, action, status, details] of failLogs) {
      const { rows: lastLog } = await query(
        'SELECT * FROM audit_logs WHERE grade_id = $1 ORDER BY checked_at DESC, id DESC LIMIT 1',
        [gid]
      );
      if (lastLog.length > 0 && lastLog[0].status === 'FAIL' && lastLog[0].action === action) {
        continue;
      }
      await query(
        'INSERT INTO audit_logs (grade_id, action, status, error_details) VALUES ($1,$2,$3,$4)',
        [gid, action, status, details]
      );
    }
    res.json(results);
  } catch (err) { next(err); }
});


app.post('/grades', gradeLimiter, ...professorMiddleware, validateBody({
  student_id:   { required: true, maxLength: 50 },
  course_name:  { required: true, maxLength: 150 },
  course_code:  { required: true, maxLength: 20 },
  grade:        { required: true, type: 'number', min: 0, max: 100 },
  letter_grade: { required: true, maxLength: 5 },
}), async (req, res, next) => {
  try {
    const { student_id, course_name, course_code, grade, letter_grade } = req.body;
    const id  = uuidv4();
    const now = new Date();
    // Truncate to second precision (no microseconds), naive UTC
    now.setMilliseconds(0);

    const dataString = buildGradeDataString(id, student_id, course_code, grade, letter_grade, now);
    const hash       = computeHash(dataString);

    await query(
      `INSERT INTO grades (id, professor_id, student_id, course_name, course_code, grade, original_grade, original_letter_grade, letter_grade, recorded_at, hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, req.professor.id, student_id, course_name, course_code, parseFloat(grade), parseFloat(grade), letter_grade, letter_grade, now, hash]
    );

    const { rows } = await query('SELECT * FROM grades WHERE id = $1', [id]);
    res.status(201).json(formatGradeResponse(rows[0], true));
  } catch (err) { next(err); }
});


app.post('/grades/batch', batchLimiter, ...professorMiddleware, async (req, res, next) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(422).json({ detail: 'grades must be a non-empty array' });
    }
    if (grades.length > 100) {
      return res.status(422).json({ detail: 'Maximum 100 grades per batch' });
    }

    const now = new Date();
    now.setMilliseconds(0);
    const created = [];

    for (const g of grades) {
      const id         = uuidv4();
      const dataString = buildGradeDataString(id, g.student_id, g.course_code, g.grade, g.letter_grade, now);
      const hash       = computeHash(dataString);
      await query(
        `INSERT INTO grades (id, professor_id, student_id, course_name, course_code, grade, original_grade, original_letter_grade, letter_grade, recorded_at, hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [id, req.professor.id, g.student_id, g.course_name, g.course_code, parseFloat(g.grade), parseFloat(g.grade), g.letter_grade, g.letter_grade, now, hash]
      );
      const { rows } = await query('SELECT * FROM grades WHERE id = $1', [id]);
      created.push(formatGradeResponse(rows[0], true));
    }
    res.status(201).json(created);
  } catch (err) { next(err); }
});


app.put('/grades/:gradeId', ...professorMiddleware, validateBody({
  grade:        { required: true, type: 'number', min: 0, max: 100 },
  letter_grade: { required: true, maxLength: 5 },
}), async (req, res, next) => {
  try {
    const { gradeId } = req.params;
    const { grade, letter_grade } = req.body;

    const { rows } = await query('SELECT * FROM grades WHERE id = $1 AND professor_id = $2', [gradeId, req.professor.id]);
    if (!rows.length) return res.status(404).json({ detail: 'Grade not found' });

    const g      = rows[0];
    const oldVal = g.grade;

    const dataString = buildGradeDataString(gradeId, g.student_id, g.course_code, grade, letter_grade, g.recorded_at);
    const hash       = computeHash(dataString);

    await query(
      `UPDATE grades SET grade=$1, letter_grade=$2, original_grade=$3, original_letter_grade=$4, hash=$5 WHERE id=$6`,
      [parseFloat(grade), letter_grade, parseFloat(grade), letter_grade, hash, gradeId]
    );
    await query(
      `INSERT INTO audit_logs (grade_id, action, status, error_details) VALUES ($1,$2,$3,$4)`,
      [gradeId, 'Grade Edited', 'EDITED', `Grade changed from ${oldVal} to ${grade}`]
    );

    const { rows: updated } = await query('SELECT * FROM grades WHERE id = $1', [gradeId]);
    res.json(formatGradeResponse(updated[0], true));
  } catch (err) { next(err); }
});


app.post('/repair/:gradeId', ...professorMiddleware, async (req, res, next) => {
  try {
    const { gradeId } = req.params;
    const { rows } = await query('SELECT * FROM grades WHERE id = $1 AND professor_id = $2', [gradeId, req.professor.id]);
    if (!rows.length) return res.status(404).json({ detail: 'Grade not found' });

    const g = rows[0];
    if (g.original_grade === null || g.original_letter_grade === null) {
      return res.status(400).json({ detail: 'Cannot repair: secure backup data is missing.' });
    }

    const dataString = buildGradeDataString(gradeId, g.student_id, g.course_code, g.original_grade, g.original_letter_grade, g.recorded_at);
    const hash       = computeHash(dataString);

    await query(
      `UPDATE grades SET grade=$1, letter_grade=$2, hash=$3 WHERE id=$4`,
      [g.original_grade, g.original_letter_grade, hash, gradeId]
    );
    await query(
      `INSERT INTO audit_logs (grade_id, action, status, error_details) VALUES ($1,$2,$3,$4)`,
      [gradeId, 'Admin Repair', 'REPAIRED', 'Grade restored to original value']
    );

    const { rows: repaired } = await query('SELECT * FROM grades WHERE id = $1', [gradeId]);
    res.json(formatGradeResponse(repaired[0], true));
  } catch (err) { next(err); }
});


app.get('/grades/:gradeId/logs', ...professorMiddleware, async (req, res, next) => {
  try {
    const { gradeId } = req.params;
    // H-2: Verify grade belongs to requesting professor
    const { rows } = await query('SELECT id FROM grades WHERE id = $1 AND professor_id = $2', [gradeId, req.professor.id]);
    if (!rows.length) return res.status(404).json({ detail: 'Grade not found' });

    const { rows: logs } = await query(
      'SELECT * FROM audit_logs WHERE grade_id = $1 ORDER BY checked_at DESC LIMIT 50',
      [gradeId]
    );
    res.json({ logs: logs.map(formatAuditLog) });
  } catch (err) { next(err); }
});


app.post('/verify/batch', verifyLimiter, ...professorMiddleware, async (req, res, next) => {
  try {
    const { grade_ids } = req.body;
    if (!Array.isArray(grade_ids) || grade_ids.length === 0) {
      return res.status(422).json({ detail: 'grade_ids must be a non-empty array' });
    }
    if (grade_ids.length > 100) return res.status(422).json({ detail: 'Maximum 100 grade IDs per request' });

    const results = [];
    for (const gId of grade_ids) {
      const { rows } = await query('SELECT * FROM grades WHERE id = $1 AND professor_id = $2', [gId, req.professor.id]);
      if (!rows.length) { results.push({ grade_id: gId, is_valid: false, error: 'Not found' }); continue; }

      const g          = rows[0];
      const dataString = buildGradeDataString(g.id, g.student_id, g.course_code, g.grade, g.letter_grade, g.recorded_at);
      const isValid    = computeHash(dataString) === g.hash;

      if (!isValid) {
        const { rows: lastLog } = await query(
          'SELECT * FROM audit_logs WHERE grade_id = $1 ORDER BY checked_at DESC, id DESC LIMIT 1',
          [g.id]
        );
        if (!(lastLog.length > 0 && lastLog[0].status === 'FAIL' && lastLog[0].action === 'Batch Verification')) {
          await query(
            `INSERT INTO audit_logs (grade_id, action, status, error_details) VALUES ($1,$2,$3,$4)`,
            [g.id, 'Batch Verification', 'FAIL', 'Integrity mismatch detected']
          );
        }
      }
      results.push({ grade_id: g.id, is_valid: isValid, error: isValid ? null : 'Integrity check failed' });
    }
    res.json({ results, status: 'success' });
  } catch (err) { next(err); }
});


// ─────────────────────────────────────────────────────────────────────────────
// 8.  STUDENT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
app.post('/student/register', authLimiter, validateBody({
  name:       { required: true, maxLength: 120, sqlSafe: true },
  student_id: { required: true, maxLength: 50,  sqlSafe: true },
  department: { required: true, maxLength: 100, sqlSafe: true },
  email:      { required: true, maxLength: 254, sqlSafe: true },
  password:   { required: true, minLength: 8, maxLength: 128 },
}), async (req, res, next) => {
  try {
    const { name, student_id, department, email, password } = req.body;

    const exists1 = await query('SELECT id FROM students WHERE student_id = $1', [student_id]);
    if (exists1.rows.length) return res.status(400).json({ detail: 'Student ID already registered' });

    const exists2 = await query('SELECT id FROM students WHERE email = $1', [email]);
    if (exists2.rows.length) return res.status(400).json({ detail: 'Email already registered' });

    const id           = uuidv4();
    const passwordHash = await hashPassword(password);

    await query(
      'INSERT INTO students (id, student_id, name, email, department, password_hash) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, student_id, name, email, department, passwordHash]
    );

    const { rows } = await query('SELECT * FROM students WHERE id = $1', [id]);
    const student   = rows[0];
    const token     = createJwt(student.student_id, 'student');

    res.status(201).json({ access_token: token, student: formatStudent(student) });
  } catch (err) { next(err); }
});


app.post('/student/login', authLimiter, validateBody({
  student_id: { required: true, maxLength: 50, sqlSafe: true },
  password:   { required: true, maxLength: 128 },
}), async (req, res, next) => {
  try {
    const { student_id, password } = req.body;
    const { rows } = await query('SELECT * FROM students WHERE student_id = $1', [student_id]);
    const student = rows[0];
    if (!student || !(await verifyPassword(password, student.password_hash))) {
      return res.status(401).json({ detail: 'Invalid Student ID or password' });
    }
    const token = createJwt(student.student_id, 'student');
    res.json({ access_token: token, student: formatStudent(student) });
  } catch (err) { next(err); }
});


app.get('/student/me', requireStudent, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM students WHERE student_id = $1', [req.user.sub]);
    if (!rows.length) return res.status(404).json({ detail: 'Student not found' });
    res.json(formatStudent(rows[0]));
  } catch (err) { next(err); }
});


app.get('/student/grades', requireStudent, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM grades WHERE student_id = $1', [req.user.sub]);
    const results  = [];
    for (const g of rows) {
      const dataStr   = buildGradeDataString(g.id, g.student_id, g.course_code, g.grade, g.letter_grade, g.recorded_at);
      const isVerified = computeHash(dataStr) === g.hash;

      if (!isVerified) {
        const { rows: lastLog } = await query(
          'SELECT * FROM audit_logs WHERE grade_id = $1 ORDER BY checked_at DESC, id DESC LIMIT 1',
          [g.id]
        );
        if (!(lastLog.length > 0 && lastLog[0].status === 'FAIL' && lastLog[0].action === 'Student View')) {
          await query(
            `INSERT INTO audit_logs (grade_id, action, status, error_details) VALUES ($1,$2,$3,$4)`,
            [g.id, 'Student View', 'FAIL', 'Hash mismatch detected on student view']
          );
        }
      }
      results.push(formatGradeResponse(g, isVerified));
    }
    res.json(results);
  } catch (err) { next(err); }
});


app.get('/student/grades/:gradeId/logs', requireStudent, async (req, res, next) => {
  try {
    const { gradeId } = req.params;
    const { rows } = await query('SELECT id FROM grades WHERE id = $1 AND student_id = $2', [gradeId, req.user.sub]);
    if (!rows.length) return res.status(404).json({ detail: 'Grade not found' });

    const { rows: logs } = await query(
      'SELECT * FROM audit_logs WHERE grade_id = $1 ORDER BY checked_at DESC LIMIT 20',
      [gradeId]
    );
    res.json({ logs: logs.map(formatAuditLog) });
  } catch (err) { next(err); }
});


app.post('/student/verify/batch', makeLimiter(10), requireStudent, async (req, res, next) => {
  try {
    const { grade_ids } = req.body;
    if (!Array.isArray(grade_ids) || grade_ids.length === 0) {
      return res.status(422).json({ detail: 'grade_ids must be a non-empty array' });
    }
    if (grade_ids.length > 100) return res.status(422).json({ detail: 'Maximum 100 grade IDs per request' });

    const results = [];
    for (const gId of grade_ids) {
      const { rows } = await query('SELECT * FROM grades WHERE id = $1 AND student_id = $2', [gId, req.user.sub]);
      if (!rows.length) { results.push({ grade_id: gId, is_valid: false, error: 'Not found' }); continue; }

      const g          = rows[0];
      const dataString = buildGradeDataString(g.id, g.student_id, g.course_code, g.grade, g.letter_grade, g.recorded_at);
      const isValid    = computeHash(dataString) === g.hash;

      if (!isValid) {
        const { rows: lastLog } = await query(
          'SELECT * FROM audit_logs WHERE grade_id = $1 ORDER BY checked_at DESC, id DESC LIMIT 1',
          [g.id]
        );
        if (!(lastLog.length > 0 && lastLog[0].status === 'FAIL' && lastLog[0].action === 'Student Batch Verification')) {
          await query(
            `INSERT INTO audit_logs (grade_id, action, status, error_details) VALUES ($1,$2,$3,$4)`,
            [g.id, 'Student Batch Verification', 'FAIL', 'Integrity mismatch detected on student verify']
          );
        }
      }
      results.push({ grade_id: g.id, is_valid: isValid, error: isValid ? null : 'Integrity check failed' });
    }
    res.json({ results, status: 'success' });
  } catch (err) { next(err); }
});


// ─────────────────────────────────────────────────────────────────────────────
// 9.  AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
app.get('/audit-logs', ...professorMiddleware, async (req, res, next) => {
  try {
    const { rows: gradeRows } = await query('SELECT id FROM grades WHERE professor_id = $1', [req.professor.id]);
    const gradeIds = gradeRows.map(r => r.id);
    if (!gradeIds.length) return res.json([]);

    const placeholders = gradeIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await query(
      `SELECT * FROM audit_logs WHERE grade_id IN (${placeholders}) ORDER BY checked_at DESC LIMIT 50`,
      gradeIds
    );
    res.json(rows.map(formatAuditLog));
  } catch (err) { next(err); }
});


// ─────────────────────────────────────────────────────────────────────────────
// 10. STATISTICS
// ─────────────────────────────────────────────────────────────────────────────
app.get('/statistics/summary', ...professorMiddleware, async (req, res, next) => {
  try {
    const { rows: grades } = await query('SELECT * FROM grades WHERE professor_id = $1', [req.professor.id]);
    if (!grades.length) {
      return res.json({ total_grades: 0, average_grade: 0, course_stats: {}, grade_distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 } });
    }

    const courseMap    = {};
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    for (const g of grades) {
      if (!courseMap[g.course_code]) courseMap[g.course_code] = { sum: 0, count: 0, name: g.course_name };
      courseMap[g.course_code].sum   += parseFloat(g.grade);
      courseMap[g.course_code].count += 1;

      const letter = (g.letter_grade || 'F')[0].toUpperCase();
      if (letter in distribution) distribution[letter]++;
      else distribution['F']++;
    }

    const course_stats = {};
    for (const [code, data] of Object.entries(courseMap)) {
      course_stats[code] = { average: Math.round((data.sum / data.count) * 100) / 100, students: data.count, name: data.name };
    }

    res.json({
      total_grades_submitted: grades.length,
      overall_average:        Math.round(grades.reduce((a, g) => a + parseFloat(g.grade), 0) / grades.length * 100) / 100,
      course_stats,
      grade_distribution: distribution,
    });
  } catch (err) { next(err); }
});


// ─────────────────────────────────────────────────────────────────────────────
// 11. COURSE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
app.get('/courses', ...professorMiddleware, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM courses WHERE professor_id = $1', [req.professor.id]);
    res.json(rows.map(formatCourse));
  } catch (err) { next(err); }
});

app.post('/courses', ...professorMiddleware, validateBody({
  course_code: { required: true, maxLength: 20 },
  course_name: { required: true, maxLength: 150 },
}), async (req, res, next) => {
  try {
    const { course_code, course_name } = req.body;
    const id = uuidv4();
    await query('INSERT INTO courses (id, professor_id, course_code, course_name) VALUES ($1,$2,$3,$4)', [id, req.professor.id, course_code, course_name]);
    const { rows } = await query('SELECT * FROM courses WHERE id = $1', [id]);
    res.status(201).json(formatCourse(rows[0]));
  } catch (err) { next(err); }
});


// ─────────────────────────────────────────────────────────────────────────────
// 12. ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
app.post('/admin/rehash-grades', adminLimiter, ...professorMiddleware, async (req, res, next) => {
  try {
    const adminKey    = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'] || '';

    if (!adminKey) {
      return res.status(503).json({ detail: 'Admin operations are disabled: ADMIN_KEY environment variable is not configured.' });
    }
    // Constant-time comparison
    const a = Buffer.from(providedKey.trim());
    const b = Buffer.from(adminKey.trim());
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ detail: 'Invalid admin authorization key.' });
    }

    const { rows: grades } = await query('SELECT * FROM grades WHERE professor_id = $1', [req.professor.id]);
    let recomputed = 0;
    for (const g of grades) {
      const dataStr = buildGradeDataString(g.id, g.student_id, g.course_code, g.grade, g.letter_grade, g.recorded_at);
      const hash    = computeHash(dataStr);
      await query('UPDATE grades SET hash = $1 WHERE id = $2', [hash, g.id]);
      recomputed++;
    }
    res.json({ recomputed, professor_id: req.professor.id });
  } catch (err) { next(err); }
});


// ─────────────────────────────────────────────────────────────────────────────
// 13. ROOT & HEALTH
// ─────────────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'GradeGuardian API is online', status: 'Secure' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// ─────────────────────────────────────────────────────────────────────────────
// 14. RESPONSE FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────
function formatProfessor(p) {
  return { id: p.id, name: p.name, employee_id: p.employee_id, department: p.department, email: p.email };
}

function formatStudent(s) {
  return { id: s.id, student_id: s.student_id, name: s.name, email: s.email, department: s.department };
}

function formatGradeResponse(g, isVerified) {
  return {
    id:                    g.id,
    professor_id:          g.professor_id,
    student_id:            g.student_id,
    course_name:           g.course_name,
    course_code:           g.course_code,
    grade:                 parseFloat(g.grade),
    letter_grade:          g.letter_grade,
    original_grade:        g.original_grade !== null ? parseFloat(g.original_grade) : null,
    original_letter_grade: g.original_letter_grade,
    recorded_at:           g.recorded_at instanceof Date ? g.recorded_at.toISOString() : g.recorded_at,
    // hash excluded from response (M-4 — HMAC oracle prevention)
    is_verified:           isVerified,
  };
}

function formatAuditLog(l) {
  return {
    grade_id:      l.grade_id,
    action:        l.action,
    status:        l.status,
    checked_at:    l.checked_at instanceof Date ? l.checked_at.toISOString() : l.checked_at,
    error_details: l.error_details,
  };
}

function formatCourse(c) {
  return { id: c.id, professor_id: c.professor_id, course_code: c.course_code, course_name: c.course_name };
}


// ─────────────────────────────────────────────────────────────────────────────
// 15. GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ detail: err.message || 'Internal Server Error' });
});


// ─────────────────────────────────────────────────────────────────────────────
// 16. START SERVER
// ─────────────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8000', 10);

// Export app immediately so Vercel serverless can serve requests on cold starts
// without waiting for migrations to finish. This prevents connection timeout
// errors from crashing the entire function invocation.
module.exports = app;

// Track whether migrations have already run this process lifetime.
// In serverless each cold start is a fresh process, but warm invocations reuse it.
let migrationsDone = false;

async function ensureMigrations() {
  if (migrationsDone) return;
  try {
    await runMigrations();
    migrationsDone = true;
  } catch (err) {
    // Non-fatal: tables most likely already exist from a prior deployment.
    // Log a warning and let the request continue — don't crash the process.
    console.warn('[WARN] Migration attempt failed (non-fatal):', err.message);
  }
}

// Kick off migrations in the background immediately on cold start.
// If it times out on this invocation it will retry on the next cold start.
ensureMigrations();

// Local dev: also listen on PORT so `npm run dev` works normally.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[INFO] GradeGuardian Express API running on port ${PORT}`);
  });
}
