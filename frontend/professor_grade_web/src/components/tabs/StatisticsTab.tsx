import { ShieldCheck, GraduationCap, ArrowUp, ArrowDown, Calculator, Percent } from '@phosphor-icons/react';
import type { GradeRecord, ProfessorStats } from '../../types';
import { getGradeColor, getGradeScoreColor, getLetterGrade } from '../../utils/gradeUtils';

interface StatisticsTabProps {
  showStatsLoadingIndicator: boolean;
  stats: ProfessorStats | null;
  userRole: 'professor' | 'student' | null;
  studentGpa: number;
  hasTamperedGrades: boolean;
  grades: GradeRecord[];
}

export default function StatisticsTab({
  showStatsLoadingIndicator,
  stats,
  userRole,
  studentGpa,
  hasTamperedGrades,
  grades,
}: StatisticsTabProps) {
  return (
    <div style={{ animation: 'slide-up 0.3s ease' }}>
      {showStatsLoadingIndicator ? (
        <div className="shimmer-wrapper" style={{ animation: 'fade-in 0.3s ease' }}>
          {/* Dashboard Hero Header Skeleton */}
          <div className="dashboard-hero" style={{ height: 'auto', padding: '24px' }}>
            <div className="hero-header-row" style={{ marginBottom: '20px' }}>
              <div className="shimmer-item shimmer-circle" style={{ width: '48px', height: '48px' }}></div>
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="shimmer-item shimmer-line short"></div>
                <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
              </div>
            </div>

            <div className="hero-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div className="shimmer-card" style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="shimmer-item shimmer-line short" style={{ height: '24px', marginBottom: '8px' }}></div>
                <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
              </div>
              <div className="shimmer-card" style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="shimmer-item shimmer-line short" style={{ height: '24px', marginBottom: '8px' }}></div>
                <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
              </div>
              <div className="shimmer-card" style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="shimmer-item shimmer-line short" style={{ height: '24px', marginBottom: '8px' }}></div>
                <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
              </div>
            </div>
          </div>

          {/* Chart Layout Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
            <div className="shimmer-card" style={{ height: '340px' }}>
              <div className="shimmer-item shimmer-title"></div>
              <div className="shimmer-item shimmer-chart"></div>
            </div>
            <div className="shimmer-card" style={{ height: '340px' }}>
              <div className="shimmer-item shimmer-title"></div>
              <div className="shimmer-item shimmer-chart"></div>
            </div>
          </div>
        </div>
      ) : stats ? (
        <>
          {/* Dashboard Hero Header */}
          <div className="dashboard-hero">
            <div className="hero-header-row">
              <div className={`hero-shield-icon ${hasTamperedGrades ? 'compromised' : ''}`}>
                <ShieldCheck size={28} weight="fill" />
              </div>
              <div className="hero-title-section">
                <h2 className="hero-title">Cryptographic Integrity Monitor</h2>
                <span className={`hero-subtitle ${hasTamperedGrades ? 'compromised' : ''}`}>
                  {hasTamperedGrades ? 'DATABASE INTEGRITY BREACHED — INVESTIGATION REQUIRED' : 'HMAC-SHA256 SIGNATURE ENGINE ACTIVE & VALID'}
                </span>
              </div>
            </div>

            <div className="hero-metrics-grid">
              {userRole === 'student' ? (
                <div className="hero-metric-item">
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>
                    {studentGpa.toFixed(2)}
                  </span>
                  <span className="hero-metric-lbl">Cumulative GPA</span>
                </div>
              ) : (
                <div className="hero-metric-item">
                  <GraduationCap className="hero-metric-icon" />
                  <span className="hero-metric-val">{stats.totalGrades}</span>
                  <span className="hero-metric-lbl">Total Grades</span>
                </div>
              )}

              {/* Overall Average Gauge Chart */}
              <div className="gauge-container">
                <svg width="120" height="120">
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="transparent"
                    stroke="var(--border)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="transparent"
                    stroke="var(--primary)"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 45}
                    strokeDashoffset={2 * Math.PI * 45 * (1 - stats.overallAverage / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="gauge-overlay">
                  <span className="gauge-grade-val">{stats.overallAverage.toFixed(1)}</span>
                  <span className="gauge-grade-letter">Overall Avg</span>
                </div>
              </div>

              <div className="hero-metric-item">
                <ShieldCheck className="hero-metric-icon" style={{ color: hasTamperedGrades ? 'var(--destructive)' : 'var(--success)' }} />
                <span className="hero-metric-val" style={{ color: hasTamperedGrades ? 'var(--destructive)' : 'var(--success)' }}>
                  {hasTamperedGrades ? `${((grades.filter(g => g.isVerified).length / grades.length) * 100).toFixed(0)}%` : '100%'}
                </span>
                <span className="hero-metric-lbl">Integrity Rating</span>
              </div>
            </div>
          </div>

          {stats.courseStats.length > 0 ? (() => {
            const averages = stats.courseStats.map(c => c.average);
            const maxAvg = averages.length > 0 ? Math.max(...averages) : -1;
            const minAvg = averages.length > 0 ? Math.min(...averages) : -1;
            const showHighlights = averages.length > 1 && maxAvg !== minAvg;

            return (
              <>
              <div className="dashboard-grid">
                {/* Grade Distribution Chart (Donut Chart) */}
                <div className="chart-card">
                  <h3 className="chart-card-title">Grade Distribution</h3>
                  <div className="chart-container">
                    <div className="pie-chart-wrapper">
                      {/* Donut Draw */}
                      <svg width="140" height="140">
                        {(() => {
                          const total = Object.values(stats.gradeDistribution).reduce((a, b) => a + b, 0);
                          if (total === 0) return <circle cx="70" cy="70" r="50" fill="#6b7280" />;

                          const radius = 50;
                          const circ = 2 * Math.PI * radius;
                          let cumulativePercent = 0;

                          return Object.entries(stats.gradeDistribution).map(([letter, count]) => {
                            const percent = count / total;
                            const rotation = cumulativePercent * 360 - 90;
                            cumulativePercent += percent;

                            return (
                              <circle
                                key={letter}
                                cx="70"
                                cy="70"
                                r={radius}
                                fill="transparent"
                                stroke={getGradeColor(letter)}
                                strokeWidth="16"
                                strokeDasharray={`${percent * circ} ${circ}`}
                                strokeDashoffset="0"
                                transform={`rotate(${rotation} 70 70)`}
                                style={{ transition: 'stroke-dasharray 0.5s ease' }}
                              />
                            );
                          });
                        })()}
                        <circle cx="70" cy="70" r="38" fill="var(--card-bg)" />
                      </svg>

                      <div className="pie-legend">
                        {Object.entries(stats.gradeDistribution).map(([letter, count]) => (
                          <div key={letter} className="legend-item">
                            <div className="legend-dot" style={{ backgroundColor: getGradeColor(letter) }}></div>
                            <span>{letter} Grade: {count} student(s)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course Averages Chart (CSS Flex/HTML Bar Chart) */}
                <div className="chart-card">
                  <h3 className="chart-card-title">Course Averages vs Department Average</h3>
                  <div className="chart-container" style={{ position: 'relative', height: '180px', marginTop: '10px' }}>
                    {/* Overall Average reference line */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: `${(stats.overallAverage * 1.4 + 27).toFixed(1)}px`,
                      borderTop: '2px dashed var(--primary)',
                      opacity: 0.8,
                      zIndex: 1,
                      pointerEvents: 'none'
                    }}>
                      <span style={{
                        position: 'absolute',
                        right: '4px',
                        top: '-18px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        backgroundColor: 'var(--card-bg)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow)'
                      }}>
                        Dept. Avg: {stats.overallAverage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="bar-chart" style={{ position: 'relative', zIndex: 2 }}>
                      {stats.courseStats.map(course => {
                        const isHighest = showHighlights && course.average === maxAvg;
                        const isLowest = showHighlights && course.average === minAvg;

                        return (
                          <div key={course.code} className="bar-group">
                            <div className="bar-wrapper" style={{ 
                              boxShadow: isHighest 
                                ? '0 0 10px rgba(234, 179, 8, 0.4)' 
                                : isLowest 
                                  ? '0 0 10px rgba(239, 68, 68, 0.4)' 
                                  : 'none',
                              border: isHighest 
                                ? '1.5px solid #eab308' 
                                : isLowest 
                                  ? '1.5px solid #ef4444' 
                                  : '1px solid var(--border)'
                            }}>
                              <div 
                                className="bar-fill" 
                                style={{ 
                                  height: `${course.average}%`,
                                  background: isHighest
                                    ? 'linear-gradient(to top, #eab308cc, #eab308)'
                                    : isLowest
                                      ? 'linear-gradient(to top, #ef4444cc, #ef4444)'
                                      : `linear-gradient(to top, ${getGradeScoreColor(course.average)}aa, ${getGradeScoreColor(course.average)})`
                                }}
                              ></div>

                              {isHighest && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: `calc(${course.average}% + 6px)`,
                                  left: '50%',
                                  zIndex: 3,
                                  pointerEvents: 'none',
                                  animation: 'bounce-subtle 2s infinite',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center'
                                }}>
                                  <span style={{
                                    fontSize: '8px',
                                    fontWeight: '800',
                                    color: '#1e1b4b',
                                    backgroundColor: '#eab308',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 6px rgba(234, 179, 8, 0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    Highest
                                  </span>
                                  <div style={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: '3.5px solid transparent',
                                    borderRight: '3.5px solid transparent',
                                    borderTop: '4px solid #eab308',
                                    marginTop: '-1px'
                                  }}></div>
                                </div>
                              )}

                              {isLowest && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: `calc(${course.average}% + 6px)`,
                                  left: '50%',
                                  zIndex: 3,
                                  pointerEvents: 'none',
                                  animation: 'bounce-subtle 2s infinite',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center'
                                }}>
                                  <span style={{
                                    fontSize: '8px',
                                    fontWeight: '800',
                                    color: '#fff',
                                    backgroundColor: '#ef4444',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    Lowest
                                  </span>
                                  <div style={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: '3.5px solid transparent',
                                    borderRight: '3.5px solid transparent',
                                    borderTop: '4px solid #ef4444',
                                    marginTop: '-1px'
                                  }}></div>
                                </div>
                              )}

                              <div className="bar-tooltip" style={{ minWidth: '150px', padding: '8px 10px', gap: '3px' }}>
                                <strong style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '3px', marginBottom: '3px' }}>{course.code}</strong>
                                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Average:</span>
                                  <span style={{ color: isHighest ? '#eab308' : isLowest ? '#ef4444' : getGradeScoreColor(course.average), fontWeight: 'bold' }}>{course.average.toFixed(1)}% ({getLetterGrade(course.average)})</span>
                                </span>
                                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Students:</span>
                                  <span style={{ fontWeight: 'bold' }}>{course.students}</span>
                                </span>
                                {course.median !== undefined && (
                                  <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Median:</span>
                                    <span style={{ fontWeight: 'bold' }}>{course.median.toFixed(1)}%</span>
                                  </span>
                                )}
                                {course.passRate !== undefined && (
                                  <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Pass Rate:</span>
                                    <span style={{ fontWeight: 'bold', color: course.passRate >= 60 ? 'var(--success)' : 'var(--destructive)' }}>{course.passRate.toFixed(0)}%</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="bar-label">{course.code}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Course Cards list */}
              <h3 className="section-title">Your Courses Overview</h3>
              <div className="courses-section">
                {stats.courseStats.map(course => (
                  <div key={course.code} className="course-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="course-info">
                        <div className="course-avatar" style={{ backgroundColor: `${getGradeScoreColor(course.average)}22`, color: getGradeScoreColor(course.average), border: `1.5px solid ${getGradeScoreColor(course.average)}44` }}>
                          {course.code.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="course-details">
                          <span className="course-code-name" style={{ fontSize: '15px', fontWeight: 800 }}>{course.code}: {course.name}</span>
                          {userRole === 'professor' ? (
                            <span className="course-students">{course.students} students enrolled</span>
                          ) : (
                            <span className="course-students" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ShieldCheck size={14} /> Cryptographically Secure
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 'bold', 
                          backgroundColor: `${getGradeScoreColor(course.average)}15`, 
                          color: getGradeScoreColor(course.average), 
                          padding: '3px 8px', 
                          borderRadius: '12px',
                          border: `1px solid ${getGradeScoreColor(course.average)}33`
                        }}>
                          Grade {getLetterGrade(course.average)}
                        </span>
                        <span className="course-avg" style={{ color: getGradeScoreColor(course.average), fontSize: '18px', fontWeight: 800 }}>{course.average.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Rich Statistics Details Panel */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(4, 1fr)', 
                      gap: '12px', 
                      backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                      padding: '10px 14px', 
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <ArrowDown size={10} style={{ color: 'var(--destructive)' }} /> Min
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800 }}>{course.min !== undefined ? `${course.min.toFixed(1)}%` : 'N/A'}</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <ArrowUp size={10} style={{ color: 'var(--success)' }} /> Max
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800 }}>{course.max !== undefined ? `${course.max.toFixed(1)}%` : 'N/A'}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Calculator size={10} style={{ color: 'var(--secondary)' }} /> Median
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800 }}>{course.median !== undefined ? `${course.median.toFixed(1)}%` : 'N/A'}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Percent size={10} style={{ color: 'var(--success)' }} /> Pass Rate
                        </span>
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: 800, 
                          color: course.passRate !== undefined && course.passRate >= 75 ? 'var(--success)' : course.passRate !== undefined && course.passRate >= 60 ? '#f59e0b' : 'var(--destructive)'
                        }}>
                          {course.passRate !== undefined ? `${course.passRate.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })() : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>No statistics generated yet. Add grade records to view analytics.</p>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Failed to compute statistics. Please try reloading.</p>
        </div>
      )}
    </div>
  );
}
