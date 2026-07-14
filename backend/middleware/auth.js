'use strict';

const { query } = require('../config/database');
const { decodeJwt } = require('../utils/crypto');

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

module.exports = {
  extractBearerToken,
  requireAuth,
  requireProfessor,
  requireStudent,
  loadProfessor,
  professorMiddleware,
};
