import { BookOpen, MagnifyingGlass } from '@phosphor-icons/react';
import type { GradeRecord, CourseModel, ProfessorStats } from '../../types';
import { getGradeScoreColor } from '../../utils/gradeUtils';

interface CoursesTabProps {
  userRole: 'professor' | 'student' | null;
  activeCourses: CourseModel[];
  courseSearchQuery: string;
  setCourseSearchQuery: (v: string) => void;
  grades: GradeRecord[];
  stats: ProfessorStats | null;
  showLoadingIndicator: boolean;
  setSelectedCourseCode: (v: string) => void;
  setNewCourseCode: (v: string) => void;
  setNewCourseName: (v: string) => void;
  setShowNewCourseFields: (v: boolean) => void;
  setShowAddModal: (show: boolean) => void;
  setCourseFilter: (v: string) => void;
  setCurrentTab: (tab: 'grades' | 'courses' | 'statistics' | 'profile' | 'logs') => void;
  handleOpenDetails: (grade: GradeRecord) => void;
}

export default function CoursesTab({
  userRole,
  activeCourses,
  courseSearchQuery,
  setCourseSearchQuery,
  grades,
  stats,
  showLoadingIndicator,
  setSelectedCourseCode,
  setNewCourseCode,
  setNewCourseName,
  setShowNewCourseFields,
  setShowAddModal,
  setCourseFilter,
  setCurrentTab,
  handleOpenDetails,
}: CoursesTabProps) {
  return (
    <div style={{ animation: 'fade-in 0.2s ease', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="tab-header-description" style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {userRole === 'professor'
            ? 'Manage your assigned courses, view real-time class averages, student enrollments, and execute grading updates.'
            : 'View your enrolled courses, your current grade standing, and perform cryptographic integrity checks.'}
        </p>

        <div className="controls-bar" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <div className="search-box" style={{ maxWidth: '400px', width: '100%' }}>
            <span className="search-icon"><MagnifyingGlass size={18} /></span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by Course Code or Title..."
              value={courseSearchQuery}
              onChange={e => setCourseSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showLoadingIndicator ? (
        <div className="shimmer-grid">
          <div className="shimmer-card" style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="shimmer-item shimmer-line short" style={{ marginBottom: '12px' }}></div>
              <div className="shimmer-item shimmer-line medium" style={{ height: '24px', marginBottom: '16px' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
              <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
            </div>
          </div>
          <div className="shimmer-card" style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="shimmer-item shimmer-line short" style={{ marginBottom: '12px' }}></div>
              <div className="shimmer-item shimmer-line medium" style={{ height: '24px', marginBottom: '16px' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
              <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
            </div>
          </div>
          <div className="shimmer-card" style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="shimmer-item shimmer-line short" style={{ marginBottom: '12px' }}></div>
              <div className="shimmer-item shimmer-line medium" style={{ height: '24px', marginBottom: '16px' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
              <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
            </div>
          </div>
        </div>
      ) : userRole === 'professor' ? (
        // ── PROFESSOR VIEW ──
        (() => {
          const filteredCourses = activeCourses.filter(course =>
            course.course_code.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
            course.course_name.toLowerCase().includes(courseSearchQuery.toLowerCase())
          );

          return filteredCourses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              <BookOpen size={64} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <h2 style={{ marginTop: '16px' }}>No courses match your search</h2>
              <p>Try clearing your search query or registering a new course code dynamically.</p>
            </div>
          ) : (
            <div className="grades-grid">
              {filteredCourses.map(course => {
                const courseStat = stats?.courseStats?.find(cs => cs.code === course.course_code);
                const avg = courseStat?.average || 0;
                const studentCount = courseStat?.students || 0;

                return (
                  <div
                    key={course.course_code}
                    className="grade-record-card"
                    style={{
                      borderTop: `4px solid ${getGradeScoreColor(avg || 80)}`,
                      cursor: 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '240px'
                    }}
                  >
                    <div>
                      <div className="grade-card-header" style={{ marginBottom: '12px' }}>
                        <span className="grade-card-student" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
                          COURSE CODE: {course.course_code}
                        </span>
                        <span className="grade-card-badge secure" style={{ padding: '4px 8px', fontSize: '10px' }}>
                          ACTIVE
                        </span>
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.3 }}>
                        {course.course_name}
                      </h3>
                    </div>

                    <div>
                      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Class Average</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: getGradeScoreColor(avg || 80) }}>
                            {avg > 0 ? `${avg.toFixed(1)}%` : 'N/A'}
                          </div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enrolled Students</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {studentCount} {studentCount === 1 ? 'Student' : 'Students'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className="action-btn"
                          style={{ flex: 1, padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                          onClick={() => {
                            setCourseFilter(course.course_code);
                            setCurrentTab('grades');
                          }}
                        >
                          View Grades
                        </button>
                        <button
                          className="nav-btn"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: '12px',
                            justifyContent: 'center',
                            border: '1px solid var(--border)',
                            backgroundColor: 'transparent'
                          }}
                          onClick={() => {
                            setSelectedCourseCode(course.course_code);
                            setNewCourseCode(course.course_code);
                            setNewCourseName(course.course_name);
                            setShowNewCourseFields(false);
                            setShowAddModal(true);
                          }}
                        >
                          + Add Grade
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      ) : (
        // ── STUDENT VIEW ──
        (() => {
          const studentCourses = Array.from(new Set(grades.map(g => g.courseCode))).map(code => {
            const grade = grades.find(g => g.courseCode === code);
            return {
              courseCode: code,
              courseName: grade ? grade.courseName : '',
              gradeVal: grade ? grade.grade : 0,
              letterGrade: grade ? grade.letterGrade : 'F',
              gradeObj: grade
            };
          });

          const filteredStudentCourses = studentCourses.filter(c =>
            c.courseCode.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
            c.courseName.toLowerCase().includes(courseSearchQuery.toLowerCase())
          );

          return filteredStudentCourses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              <BookOpen size={64} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <h2 style={{ marginTop: '16px' }}>No courses match your search</h2>
              <p>Try clearing your search query or contact your professor if you are missing enrollment entries.</p>
            </div>
          ) : (
            <div className="grades-grid">
              {filteredStudentCourses.map(c => (
                <div
                  key={c.courseCode}
                  className="grade-record-card"
                  style={{
                    borderTop: `4px solid ${getGradeScoreColor(c.gradeVal)}`,
                    cursor: 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '240px'
                  }}
                >
                  <div>
                    <div className="grade-card-header" style={{ marginBottom: '12px' }}>
                      <span className="grade-card-student" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
                        COURSE CODE: {c.courseCode}
                      </span>
                      <span className="grade-card-badge secure" style={{ padding: '4px 8px', fontSize: '10px' }}>
                        SECURED ✓
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.3 }}>
                      {c.courseName}
                    </h3>
                  </div>

                  <div>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your Grade</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: getGradeScoreColor(c.gradeVal) }}>
                          {c.gradeVal.toFixed(1)}%
                        </div>
                      </div>
                      <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Letter Mark</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: getGradeScoreColor(c.gradeVal) }}>
                          Grade {c.letterGrade}
                        </div>
                      </div>
                    </div>

                    <button
                      className="action-btn"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                      onClick={() => {
                        if (c.gradeObj) handleOpenDetails(c.gradeObj);
                      }}
                    >
                      Verify Cryptographic Proof
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}
