'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { query }                                     = require('../config/database');
const { buildGradeDataString, computeHash }         = require('../utils/crypto');
const { formatGradeResponse, formatAuditLog }       = require('../utils/formatters');
const { sanitizeSqlInput }                          = require('../middleware/validation');
const { validateBody }                              = require('../middleware/validation');
const { professorMiddleware }                       = require('../middleware/auth');
const { gradeLimiter, batchLimiter, verifyLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 7.  GRADE ENDPOINTS (professor-scoped)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/grades', ...professorMiddleware, async (req, res, next) => {
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
      const dataStr     = buildGradeDataString(g.id, g.student_id, g.course_code, g.grade, g.letter_grade, g.recorded_at);
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


router.post('/grades', gradeLimiter, ...professorMiddleware, validateBody({
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


router.post('/grades/batch', batchLimiter, ...professorMiddleware, async (req, res, next) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(422).json({ detail: 'grades must be a non-empty array' });
    }
    if (grades.length > 1000) {
      return res.status(422).json({ detail: 'Maximum 1000 grades per batch' });
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


router.put('/grades/:gradeId', ...professorMiddleware, validateBody({
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


router.post('/repair/:gradeId', ...professorMiddleware, async (req, res, next) => {
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


router.get('/grades/:gradeId/logs', ...professorMiddleware, async (req, res, next) => {
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


router.post('/verify/batch', verifyLimiter, ...professorMiddleware, async (req, res, next) => {
  try {
    const { grade_ids } = req.body;
    if (!Array.isArray(grade_ids) || grade_ids.length === 0) {
      return res.status(422).json({ detail: 'grade_ids must be a non-empty array' });
    }
    if (grade_ids.length > 1000) return res.status(422).json({ detail: 'Maximum 1000 grade IDs per request' });

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

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

router.post('/grades/parse-pdf', ...professorMiddleware, async (req, res, next) => {
  try {
    const { fileData } = req.body;
    if (!fileData) {
      return res.status(422).json({ detail: 'Missing fileData' });
    }

    const buffer = Buffer.from(fileData, 'base64');
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `gg_upload_${Date.now()}.pdf`);

    await fs.promises.writeFile(tempFilePath, buffer);

    const parserScript = path.join(__dirname, '..', 'utils', 'pdfParser.py');
    
    execFile('python', [parserScript, tempFilePath], { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (err) {
        console.error('Failed to delete temp PDF file:', err);
      }

      if (error) {
        console.error('PDF Parser script execution failed:', error, stderr);
        return res.status(500).json({ detail: 'Failed to execute PDF parser script' });
      }

      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) {
          return res.status(422).json({ detail: parsed.error });
        }
        res.json(parsed);
      } catch (err) {
        console.error('Failed to parse PDF parser output as JSON:', err, stdout);
        res.status(500).json({ detail: 'Invalid parser output format' });
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
