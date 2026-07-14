'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// 5.  VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const SQL_INJECTION_PATTERN = /\b(DROP|ALTER|TRUNCATE|DELETE|INSERT|UPDATE|UNION|EXEC|xp_)\b/i;

function sanitizeSqlInput(value) {
  if (!value) return value;
  const cleaned = value.replace(/[\x00'";\\]|--/g, '');
  if (SQL_INJECTION_PATTERN.test(cleaned)) {
    const err = new Error('Potential SQL injection payload or unauthorized character sequence detected.');
    err.status = 400;
    throw err;
  }
  return cleaned.trim();
}

function validateBody(schema) {
  return (req, res, next) => {
    for (const [field, rules] of Object.entries(schema)) {
      const val = req.body[field];
      if (rules.required && (val === undefined || val === null || val === '')) {
        return res.status(422).json({ detail: `${field} is required` });
      }
      if (val !== undefined && val !== null) {
        if (rules.maxLength && String(val).length > rules.maxLength) {
          return res.status(422).json({ detail: `${field} exceeds max length of ${rules.maxLength}` });
        }
        if (rules.minLength && String(val).length < rules.minLength) {
          return res.status(422).json({ detail: `${field} must be at least ${rules.minLength} characters` });
        }
        if (rules.type === 'number') {
          const n = parseFloat(val);
          if (isNaN(n)) return res.status(422).json({ detail: `${field} must be a number` });
          if (rules.min !== undefined && n < rules.min) return res.status(422).json({ detail: `${field} must be >= ${rules.min}` });
          if (rules.max !== undefined && n > rules.max) return res.status(422).json({ detail: `${field} must be <= ${rules.max}` });
        }
        // SQL safety on string fields
        if (rules.sqlSafe && typeof val === 'string') {
          try { sanitizeSqlInput(val); } catch (e) { return res.status(400).json({ detail: e.message }); }
        }
      }
    }
    next();
  };
}

module.exports = { sanitizeSqlInput, SQL_INJECTION_PATTERN, validateBody };
