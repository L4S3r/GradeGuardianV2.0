'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// 14. RESPONSE FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────
function formatProfessor(p) {
  return { id: p.id, name: p.name, employee_id: p.employee_id, department: p.department, email: p.email };
}

function formatStudent(s) {
  return { id: s.id, student_id: s.student_id, name: s.name, email: s.email, department: s.department };
}

function formatGradeResponse(g, isVerified) {
  return {
    id:                    g.id,
    professor_id:          g.professor_id,
    student_id:            g.student_id,
    course_name:           g.course_name,
    course_code:           g.course_code,
    grade:                 parseFloat(g.grade || 0),
    letter_grade:          g.letter_grade,
    original_grade:        g.original_grade !== null ? parseFloat(g.original_grade) : null,
    original_letter_grade: g.original_letter_grade,
    recorded_at:           g.recorded_at instanceof Date ? g.recorded_at.toISOString() : g.recorded_at,
    // hash excluded from response (M-4 — HMAC oracle prevention)
    is_verified:           isVerified,
  };
}

function formatAuditLog(l) {
  return {
    grade_id:      l.grade_id,
    action:        l.action,
    status:        l.status,
    checked_at:    l.checked_at instanceof Date ? l.checked_at.toISOString() : l.checked_at,
    error_details: l.error_details,
  };
}

function formatCourse(c) {
  return { id: c.id, professor_id: c.professor_id, course_code: c.course_code, course_name: c.course_name };
}

module.exports = { formatProfessor, formatStudent, formatGradeResponse, formatAuditLog, formatCourse };
