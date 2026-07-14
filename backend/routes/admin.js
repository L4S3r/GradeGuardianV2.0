'use strict';

const express = require('express');
const crypto  = require('crypto');

const { query }                             = require('../config/database');
const { buildGradeDataString, computeHash } = require('../utils/crypto');
const { professorMiddleware }               = require('../middleware/auth');
const { adminLimiter }                      = require('../middleware/rateLimiter');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 12. ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin/rehash-grades', adminLimiter, ...professorMiddleware, async (req, res, next) => {
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

module.exports = router;
