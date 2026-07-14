// Re-export all types from services/api.ts
export type {
  Professor,
  GradeRecord,
  AuditLog,
  CourseStat,
  ProfessorStats,
  CourseModel,
} from '../services/api';

// Batch entry row for the web batch grade entry form
export interface WebBatchEntry {
  studentId: string;
  grade: string;
  letterGrade: string;
}
