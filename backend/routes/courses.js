'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { query }               = require('../config/database');
const { formatCourse }        = require('../utils/formatters');
const { validateBody }        = require('../middleware/validation');
const { professorMiddleware } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 11. COURSE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/courses', ...professorMiddleware, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM courses WHERE professor_id = $1', [req.professor.id]);
    res.json(rows.map(formatCourse));
  } catch (err) { next(err); }
});

router.post('/courses', ...professorMiddleware, validateBody({
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

module.exports = router;
