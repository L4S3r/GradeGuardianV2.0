'use strict';

const express = require('express');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 13. ROOT & HEALTH
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', (_req, res) => {
  res.json({ message: 'GradeGuardian API is online', status: 'Secure' });
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
