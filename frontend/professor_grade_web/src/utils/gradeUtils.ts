// Grade letter color helpers (used in charts and card borders)
export const getGradeColor = (letter: string): string => {
  switch (letter.toUpperCase()) {
    case 'A': return '#10b981';
    case 'B': return '#0ea5e9';
    case 'C': return '#f59e0b';
    case 'D': return '#f97316';
    case 'F': return '#ef4444';
    default: return '#6b7280';
  }
};

// Numeric grade score color helper (used for card top-borders and value labels)
export const getGradeScoreColor = (score: number): string => {
  if (score >= 90) return '#10b981'; // Green (A)
  if (score >= 80) return '#0ea5e9'; // Blue (B)
  if (score >= 70) return '#eab308'; // Yellow/Gold (C)
  if (score >= 60) return '#f97316'; // Orange (D)
  return '#ef4444'; // Red (F)
};

// Convert numeric grade score to letter grade equivalent
export const getLetterGrade = (score: number): string => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};
