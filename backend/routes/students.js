'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { query }                             = require('../config/database');
const { hashPassword, verifyPassword, createJwt } = require('../utils/crypto');
const { buildGradeDataString, computeHash } = require('../utils/crypto');
const { formatStudent, formatGradeResponse, formatAuditLog } = require('../utils/formatters');
const { validateBody }                      = require('../middleware/validation');
const { requireStudent }                    = require('../middleware/auth');
const { authLimiter, makeLimiter }          = require('../middleware/rateLimiter');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 8.  STUDENT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
router.post('/student/register', authLimiter, validateBody({
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


router.post('/student/login', authLimiter, validateBody({
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


router.get('/student/me', requireStudent, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM students WHERE student_id = $1', [req.user.sub]);
    if (!rows.length) return res.status(404).json({ detail: 'Student not found' });
    res.json(formatStudent(rows[0]));
  } catch (err) { next(err); }
});


router.get('/student/grades', requireStudent, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM grades WHERE student_id = $1', [req.user.sub]);
    const results  = [];
    for (const g of rows) {
      const dataStr    = buildGradeDataString(g.id, g.student_id, g.course_code, g.grade, g.letter_grade, g.recorded_at);
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


router.get('/student/grades/:gradeId/logs', requireStudent, async (req, res, next) => {
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


router.post('/student/verify/batch', makeLimiter(10), requireStudent, async (req, res, next) => {
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

module.exports = router;
