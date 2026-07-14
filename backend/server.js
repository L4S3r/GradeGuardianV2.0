'use strict';

const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
}
require('dotenv').config({ path: path.join(__dirname, '.env') });


const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

// ─────────────────────────────────────────────────────────────────────────────
// Config / Infrastructure
// ─────────────────────────────────────────────────────────────────────────────
const { runMigrations } = require('./config/database');

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────
const { globalLimiter } = require('./middleware/rateLimiter');

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────
const healthRouter     = require('./routes/health');
const authRouter       = require('./routes/auth');
const gradesRouter     = require('./routes/grades');
const studentsRouter   = require('./routes/students');
const coursesRouter    = require('./routes/courses');
const auditLogsRouter  = require('./routes/auditLogs');
const statisticsRouter = require('./routes/statistics');
const adminRouter      = require('./routes/admin');

// ─────────────────────────────────────────────────────────────────────────────
// 3.  EXPRESS APP & MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
const app = express();

// Trust proxy (Vercel, Cloudflare, etc.)
app.set('trust proxy', 1);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Helmet — security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })
);
// Additional headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS
// ALLOWED_ORIGINS must be set in .env. No hardcoded production URLs.
const rawOrigins   = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:8000';
const allowedOrigins = rawOrigins.trim() === '*' ? '*' : rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: allowedOrigins !== '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
}));

// Global rate limiter
app.use(globalLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// Route mounting
// ─────────────────────────────────────────────────────────────────────────────
app.use('/', healthRouter);
app.use('/', authRouter);
app.use('/', gradesRouter);
app.use('/', studentsRouter);
app.use('/', coursesRouter);
app.use('/', auditLogsRouter);
app.use('/', statisticsRouter);
app.use('/', adminRouter);

// ─────────────────────────────────────────────────────────────────────────────
// 15. GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ detail: err.message || 'Internal Server Error' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. START SERVER
// ─────────────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8000', 10);

// Export app immediately so Vercel serverless can serve requests on cold starts
// without waiting for migrations to finish. This prevents connection timeout
// errors from crashing the entire function invocation.
module.exports = app;

// Track whether migrations have already run this process lifetime.
// In serverless each cold start is a fresh process, but warm invocations reuse it.
let migrationsDone = false;

async function ensureMigrations() {
  if (migrationsDone) return;
  try {
    await runMigrations();
    migrationsDone = true;
  } catch (err) {
    // Non-fatal: tables most likely already exist from a prior deployment.
    // Log a warning and let the request continue — don't crash the process.
    console.warn('[WARN] Migration attempt failed (non-fatal):', err.message);
  }
}

// Kick off migrations in the background immediately on cold start.
// If it times out on this invocation it will retry on the next cold start.
ensureMigrations();

// Local dev: also listen on PORT so `npm run dev` works normally.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[INFO] GradeGuardian Express API running on port ${PORT}`);
  });
}
