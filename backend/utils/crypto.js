'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { JWT_SECRET, HMAC_SECRET, BCRYPT_ROUNDS } = require('../config/security');

const JWT_ALGORITHM    = 'HS256';
const JWT_EXPIRE_HOURS = parseInt(process.env.JWT_EXPIRE_HOURS || '24', 10);

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

  const tsStr   = dateObj.toISOString().replace('Z', '').split('.')[0];
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

module.exports = {
  buildGradeDataString,
  computeHash,
  hashPassword,
  verifyPassword,
  createJwt,
  decodeJwt,
};
