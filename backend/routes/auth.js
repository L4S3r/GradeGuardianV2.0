'use strict';

const express = require('express');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');

const { query }                        = require('../config/database');
const { FACULTY_SECRET_KEY }           = require('../config/security');
const { hashPassword, verifyPassword, createJwt } = require('../utils/crypto');
const { sanitizeSqlInput }             = require('../middleware/validation');
const { validateBody }                 = require('../middleware/validation');
const { authLimiter }        = require('../middleware/rateLimiter');
const { professorMiddleware: profMW } = require('../middleware/auth');
const { formatProfessor }              = require('../utils/formatters');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 6.  AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
router.post('/auth/register', authLimiter, validateBody({
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
    const keyBuf      = Buffer.from(faculty_secret_key.trim());
    const expectedBuf = Buffer.from(FACULTY_SECRET_KEY);
    const keysMatch   = keyBuf.length === expectedBuf.length && crypto.timingSafeEqual(keyBuf, expectedBuf);
    if (!keysMatch) {
      return res.status(403).json({ detail: 'Invalid Faculty Secret Authorization Key. Only authorized Alexandria University Doctors/TAs can create professor accounts.' });
    }

    const cleanName  = sanitizeSqlInput(name);
    const cleanEmpId = sanitizeSqlInput(employee_id);
    const cleanDept  = sanitizeSqlInput(department);
    const cleanEmail = sanitizeSqlInput(email);

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
    const professor = rows[0];
    const token     = createJwt(professor.id);

    res.status(201).json({
      access_token: token,
      token_type:   'bearer',
      professor:    formatProfessor(professor),
    });
  } catch (err) { next(err); }
});


router.post('/auth/login', authLimiter, validateBody({
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


router.get('/professors/me', ...profMW, async (req, res) => {
  res.json(formatProfessor(req.professor));
});

module.exports = router;
