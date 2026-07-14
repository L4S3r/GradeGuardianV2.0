'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// 1.  SECURITY SETUP
// ─────────────────────────────────────────────────────────────────────────────
const BASE_DIR         = path.join(__dirname, '..');
const SALT_FILE        = path.join(BASE_DIR, 'secret_salt.txt');
const FACULTY_KEY_FILE = path.join(BASE_DIR, 'faculty_key.txt');

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

module.exports = {
  IS_PRODUCTION,
  SECRET_SALT,
  JWT_SECRET,
  HMAC_SECRET,
  BCRYPT_ROUNDS,
  FACULTY_SECRET_KEY,
  getOrCreateSalt,
  getOrCreateFacultyKey,
};
