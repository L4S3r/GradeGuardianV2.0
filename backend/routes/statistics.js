'use strict';

const express = require('express');

const { query }               = require('../config/database');
const { professorMiddleware } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 10. STATISTICS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/statistics/summary', ...professorMiddleware, async (req, res, next) => {
  try {
    const { rows: grades } = await query('SELECT * FROM grades WHERE professor_id = $1', [req.professor.id]);
    if (!grades.length) {
      return res.json({ total_grades: 0, average_grade: 0, course_stats: {}, grade_distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 } });
    }

    const courseMap    = {};
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    for (const g of grades) {
      if (!courseMap[g.course_code]) courseMap[g.course_code] = { sum: 0, count: 0, name: g.course_name, grades: [] };
      const gradeVal = parseFloat(g.grade);
      courseMap[g.course_code].sum   += gradeVal;
      courseMap[g.course_code].count += 1;
      courseMap[g.course_code].grades.push(gradeVal);

      const letter = (g.letter_grade || 'F')[0].toUpperCase();
      if (letter in distribution) distribution[letter]++;
      else distribution['F']++;
    }

    const course_stats = {};
    for (const [code, data] of Object.entries(courseMap)) {
      const sortedGrades = [...data.grades].sort((a, b) => a - b);
      const min = sortedGrades[0];
      const max = sortedGrades[sortedGrades.length - 1];
      
      let median;
      const mid = Math.floor(sortedGrades.length / 2);
      if (sortedGrades.length % 2 === 0) {
        median = (sortedGrades[mid - 1] + sortedGrades[mid]) / 2;
      } else {
        median = sortedGrades[mid];
      }
      
      const passingCount = sortedGrades.filter(g => g >= 60).length;
      const passRate = (passingCount / sortedGrades.length) * 100;

      course_stats[code] = { 
        average: Math.round((data.sum / data.count) * 100) / 100, 
        students: data.count, 
        name: data.name,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        median: Math.round(median * 100) / 100,
        passRate: Math.round(passRate * 100) / 100
      };
    }

    res.json({
      total_grades_submitted: grades.length,
      overall_average:        Math.round(grades.reduce((a, g) => a + parseFloat(g.grade), 0) / grades.length * 100) / 100,
      course_stats,
      grade_distribution: distribution,
    });
  } catch (err) { next(err); }
});

module.exports = router;
