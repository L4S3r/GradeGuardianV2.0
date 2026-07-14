import {
  List as ListIcon,
  ChartBar,
  User,
  Clock,
  BookOpen,
  SignOut,
} from '@phosphor-icons/react';
import type { Professor, GradeRecord } from '../../types';

interface SidebarProps {
  currentTab: 'grades' | 'courses' | 'statistics' | 'profile' | 'logs';
  setCurrentTab: (tab: 'grades' | 'courses' | 'statistics' | 'profile' | 'logs') => void;
  userRole: 'professor' | 'student' | null;
  professor: Professor | null;
  student: any | null;
  hasTamperedGrades: boolean;
  tamperedGradesList: GradeRecord[];
  fetchGlobalAuditLogs: () => void;
  handleLogout: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  userRole,
  professor,
  student,
  hasTamperedGrades,
  tamperedGradesList,
  fetchGlobalAuditLogs,
  handleLogout,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-section">
        <img src="/favicon.png" alt="GradeGuardian Logo" style={{ width: '32px', height: '32px' }} />
        <div style={{ textAlign: 'left' }}>
          <h1 className="brand-title">GradeGuardian</h1>
          <span className="brand-subtitle">Alexandria University</span>
        </div>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-btn ${currentTab === 'grades' ? 'active' : ''}`}
          onClick={() => setCurrentTab('grades')}
        >
          <ListIcon size={20} weight="bold" />
          Grade Records
          {hasTamperedGrades && (
            <span className="nav-badge">{tamperedGradesList.length}</span>
          )}
        </button>
        
        <button
          className={`nav-btn ${currentTab === 'courses' ? 'active' : ''}`}
          onClick={() => setCurrentTab('courses')}
        >
          <BookOpen size={20} weight="bold" />
          {userRole === 'professor' ? 'Courses Assigned' : 'Enrolled Courses'}
        </button>

        <button
          className={`nav-btn ${currentTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setCurrentTab('statistics')}
        >
          <ChartBar size={20} weight="bold" />
          Statistics Summary
        </button>

        {userRole === 'professor' && (
          <button
            className={`nav-btn ${currentTab === 'logs' ? 'active' : ''}`}
            onClick={() => {
              setCurrentTab('logs');
              fetchGlobalAuditLogs();
            }}
          >
            <Clock size={20} weight="bold" />
            Security Audit Logs
          </button>
        )}
        
        <button
          className={`nav-btn ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentTab('profile')}
        >
          <User size={20} weight="bold" />
          {userRole === 'professor' ? 'Professor Profile' : 'Student Profile'}
        </button>
      </nav>

      <div className="sidebar-footer">
        {userRole === 'professor' && professor && (
          <div className="prof-info-card">
            <span className="prof-name">{professor.name}</span>
            <span className="prof-dept">{professor.department}</span>
          </div>
        )}
        {userRole === 'student' && student && (
          <div className="prof-info-card">
            <span className="prof-name">{student.name}</span>
            <span className="prof-dept">{student.department} ({student.student_id})</span>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogout}>
          <SignOut size={16} weight="bold" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
