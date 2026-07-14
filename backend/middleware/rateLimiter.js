'use strict';

const rateLimit = require('express-rate-limit');

// ─── Rate limiters ───────────────────────────────────────────────────────────
function makeLimiter(max, windowMs = 60_000) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ detail: 'Too Many Requests' }),
  });
}

const globalLimiter = makeLimiter(100);
const authLimiter   = makeLimiter(5);
const gradeLimiter  = makeLimiter(30);
const batchLimiter  = makeLimiter(20);
const verifyLimiter = makeLimiter(20);
const adminLimiter  = makeLimiter(5);

module.exports = {
  makeLimiter,
  globalLimiter,
  authLimiter,
  gradeLimiter,
  batchLimiter,
  verifyLimiter,
  adminLimiter,
};
