'use strict';

const { Pool } = require('pg');

// ─────────────────────────────────────────────────────────────────────────────
// 2.  DATABASE SETUP (Supabase PostgreSQL)
// ─────────────────────────────────────────────────────────────────────────────
let DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL || DATABASE_URL.includes('[YOUR-PASSWORD]') || DATABASE_URL.includes('[password]')) {
  console.warn('[WARN] DATABASE_URL not configured. Set it in .env');
}
if (DATABASE_URL.startsWith('postgres://')) {
  DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://');
}

// Build Pool config — always pass ssl: { rejectUnauthorized: false } for
// Supabase's self-signed pooler certificate chain (applies to all sslmode values).
const poolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10s — gives Vercel cold starts enough time to reach Supabase
};

if (DATABASE_URL) {
  // Strip ?sslmode=... from the URL so pg doesn't double-parse SSL options,
  // then apply our own ssl object to avoid the self-signed cert rejection.
  poolConfig.connectionString = DATABASE_URL.split('?')[0];
  const isLocal = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');
  if (!isLocal) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

if (DATABASE_URL) {
  const host = DATABASE_URL.split('@')[1] || 'PostgreSQL';
  console.log(`[INFO] Database Engine: Remote Supabase PostgreSQL (${host})`);
}

// DB query helper
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.5 SCHEMA & MIGRATION
// ─────────────────────────────────────────────────────────────────────────────
async function runMigrations() {
  // Create tables if they don't exist
  await query(`
    CREATE TABLE IF NOT EXISTS professors (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      employee_id   TEXT UNIQUE NOT NULL,
      department    TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS students (
      id            TEXT PRIMARY KEY,
      student_id    TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      department    TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS grades (
      id                    TEXT PRIMARY KEY,
      professor_id          TEXT REFERENCES professors(id),
      student_id            TEXT NOT NULL,
      course_name           TEXT,
      course_code           TEXT,
      grade                 FLOAT DEFAULT 0,
      original_grade        FLOAT,
      original_letter_grade TEXT,
      letter_grade          TEXT,
      recorded_at           TIMESTAMPTZ DEFAULT NOW(),
      hash                  TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS courses (
      id           TEXT PRIMARY KEY,
      professor_id TEXT REFERENCES professors(id),
      course_code  TEXT NOT NULL,
      course_name  TEXT NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id            SERIAL PRIMARY KEY,
      grade_id      TEXT REFERENCES grades(id),
      action        TEXT,
      status        TEXT,
      checked_at    TIMESTAMPTZ DEFAULT NOW(),
      error_details TEXT
    )
  `);

  // Simple column migrations (idempotent)
  const addColIfMissing = async (table, column, colDef) => {
    try {
      await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${colDef}`);
    } catch (_) {}
  };
  await addColIfMissing('grades', 'original_grade', 'FLOAT');
  await addColIfMissing('grades', 'original_letter_grade', 'TEXT');

  console.log('[INFO] Database migrations complete.');
}

module.exports = { pool, query, runMigrations, DATABASE_URL };
