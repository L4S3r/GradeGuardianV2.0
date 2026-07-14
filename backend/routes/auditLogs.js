'use strict';

const express = require('express');

const { query }               = require('../config/database');
const { formatAuditLog }      = require('../utils/formatters');
const { professorMiddleware } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 9.  AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/audit-logs', ...professorMiddleware, async (req, res, next) => {
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

module.exports = router;
