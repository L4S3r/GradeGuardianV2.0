import {
  MagnifyingGlass,
  Plus,
  ArrowClockwise,
  Warning,
  ShieldCheck,
  Clock,
} from '@phosphor-icons/react';
import type { GradeRecord, CourseModel } from '../../types';
import { getGradeScoreColor } from '../../utils/gradeUtils';

interface GradesTabProps {
  userRole: 'professor' | 'student' | null;
  processedGrades: GradeRecord[];
  grades: GradeRecord[];
  activeCourses: CourseModel[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  courseFilter: string;
  setCourseFilter: (v: string) => void;
  sortOption: string;
  setSortOption: (v: string) => void;
  isLoading: boolean;
  showLoadingIndicator: boolean;
  loadingMsg: string;
  loadingProgress: number;
  errorMessage: string | null;
  hasTamperedGrades: boolean;
  tamperedGradesList: GradeRecord[];
  setSelectedCourseCode: (v: string) => void;
  setNewCourseCode: (v: string) => void;
  setNewCourseName: (v: string) => void;
  setShowNewCourseFields: (v: boolean) => void;
  setShowAddModal: (show: boolean) => void;
  handleOpenDetails: (grade: GradeRecord) => void;
  loadGrades: () => void;
}

export default function GradesTab({
  userRole,
  processedGrades,
  grades,
  activeCourses,
  searchQuery,
  setSearchQuery,
  courseFilter,
  setCourseFilter,
  sortOption,
  setSortOption,
  showLoadingIndicator,
  loadingMsg,
  loadingProgress,
  errorMessage,
  hasTamperedGrades,
  tamperedGradesList,
  setSelectedCourseCode,
  setNewCourseCode,
  setNewCourseName,
  setShowNewCourseFields,
  setShowAddModal,
  handleOpenDetails,
  loadGrades,
}: GradesTabProps) {
  return (
    <div style={{ animation: 'slide-up 0.3s ease' }}>
      {/* Global Tamper Alert Banner */}
      {hasTamperedGrades && (
        <div className="tamper-banner">
          <div className="tamper-banner-icon">
            <Warning weight="fill" />
          </div>
          <div className="tamper-banner-info">
            <div className="tamper-banner-title">CRYPTOGRAPHIC TAMPER DETECTED</div>
            <div className="tamper-banner-desc">
              {tamperedGradesList.length} grade record(s) failed verification check. Database entries may have been modified outside this portal.
            </div>
          </div>
          <button
            className="tamper-banner-btn"
            onClick={() => {
              const firstTampered = tamperedGradesList[0];
              handleOpenDetails(firstTampered);
            }}
          >
            INSPECT RECORD
          </button>
        </div>
      )}

      <div className="controls-bar" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div className="search-box" style={{ maxWidth: '400px', width: '100%', flex: '1' }}>
            <span className="search-icon"><MagnifyingGlass size={18} /></span>
            <input
              type="text"
              className="search-input"
              style={{ borderRadius: 'var(--radius-md)' }}
              placeholder="Search Student ID, Course Code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {userRole === 'professor' && (
            <button className="action-btn" onClick={() => {
              const defaultCourse = courseFilter !== 'All' ? courseFilter : (activeCourses[0]?.course_code || '');
              setSelectedCourseCode(defaultCourse);
              if (defaultCourse && defaultCourse !== 'NEW_COURSE') {
                const selected = activeCourses.find(c => c.course_code === defaultCourse);
                if (selected) {
                  setNewCourseCode(selected.course_code);
                  setNewCourseName(selected.course_name);
                  setShowNewCourseFields(false);
                }
              } else {
                setSelectedCourseCode('NEW_COURSE');
                setNewCourseCode('');
                setNewCourseName('');
                setShowNewCourseFields(true);
              }
              setShowAddModal(true);
            }}>
              <Plus size={16} weight="bold" />
              Add Grade
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', width: '100%' }}>
          {/* Course Filter Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Filter by Course
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                className={`filter-pill ${courseFilter === 'All' ? 'active' : ''}`}
                onClick={() => setCourseFilter('All')}
              >
                All Courses
              </button>
              {(userRole === 'professor'
                ? activeCourses.map(c => c.course_code)
                : Array.from(new Set(grades.map(g => g.courseCode)))
              ).map(code => (
                <button
                  key={code}
                  className={`filter-pill ${courseFilter === code ? 'active' : ''}`}
                  onClick={() => setCourseFilter(code)}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Option Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Sort Records
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                className={`filter-pill ${sortOption === 'date-desc' ? 'active' : ''}`}
                onClick={() => setSortOption('date-desc')}
              >
                Newest
              </button>
              <button
                className={`filter-pill ${sortOption === 'date-asc' ? 'active' : ''}`}
                onClick={() => setSortOption('date-asc')}
              >
                Oldest
              </button>
              <button
                className={`filter-pill ${sortOption === 'grade-desc' ? 'active' : ''}`}
                onClick={() => setSortOption('grade-desc')}
              >
                Highest
              </button>
              <button
                className={`filter-pill ${sortOption === 'grade-asc' ? 'active' : ''}`}
                onClick={() => setSortOption('grade-asc')}
              >
                Lowest
              </button>
            </div>
          </div>
        </div>
      </div>

      {showLoadingIndicator ? (
        <div className="shimmer-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%' }}>
          {/* Premium Cryptographic Loader Bar */}
          <div className="crypt-loader-card">
            <div className="crypt-loader-header">
              <div className="crypt-loader-spinner-wrapper">
                <ArrowClockwise className="crypt-loader-spinner" size={18} />
              </div>
              <span className="crypt-loader-text">{loadingMsg}</span>
              <span className="crypt-loader-percentage">{loadingProgress}%</span>
            </div>
            <div className="crypt-loader-track">
              <div className="crypt-loader-bar" style={{ width: `${loadingProgress}%` }}></div>
            </div>
          </div>

          {/* Grid of Skeleton Cards underneath */}
          <div className="shimmer-grid">
            <div className="shimmer-card"><div className="shimmer-item shimmer-title"></div><div className="shimmer-item shimmer-body"></div></div>
            <div className="shimmer-card"><div className="shimmer-item shimmer-title"></div><div className="shimmer-item shimmer-body"></div></div>
            <div className="shimmer-card"><div className="shimmer-item shimmer-title"></div><div className="shimmer-item shimmer-body"></div></div>
          </div>
        </div>
      ) : errorMessage ? (
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <Warning size={64} style={{ color: 'var(--destructive)', opacity: 0.6 }} />
          <h2>Error loading records</h2>
          <p>{errorMessage}</p>
          <button className="action-btn" style={{ margin: '16px auto 0 auto' }} onClick={loadGrades}>
            <ArrowClockwise size={16} /> Retry
          </button>
        </div>
      ) : processedGrades.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
          <ShieldCheck size={64} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <h2 style={{ marginTop: '16px' }}>No records found</h2>
          <p>Submit grades to see records secured by SHA256 signatures.</p>
        </div>
      ) : (
        <div className="grades-grid">
          {processedGrades.map(grade => (
            <div
              key={grade.id}
              className="grade-record-card"
              style={{ borderTop: `4px solid ${getGradeScoreColor(grade.grade)}` }}
              onClick={() => handleOpenDetails(grade)}
            >
              <div className="grade-card-header">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="grade-card-student">ID: {grade.studentId}</span>
                  <span className="grade-card-course">{grade.courseCode} — {grade.courseName}</span>
                </div>
                <span className={`grade-card-badge ${grade.isVerified ? 'secure' : 'tampered'}`}>
                  {grade.isVerified ? 'SECURED ✓' : 'TAMPERED ⚠'}
                </span>
              </div>
              
              <div className="grade-card-body">
                <span className="grade-card-value" style={{ color: getGradeScoreColor(grade.grade) }}>{grade.grade.toFixed(1)}</span>
                <span className="grade-card-letter" style={{ color: getGradeScoreColor(grade.grade) }}>Grade {grade.letterGrade}</span>
              </div>

              <div className="grade-card-date">
                <Clock size={12} />
                <span>{new Date(grade.recordedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
