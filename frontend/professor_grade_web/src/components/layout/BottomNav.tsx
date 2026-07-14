import {
  List as ListIcon,
  ChartBar,
  User,
  Clock,
  BookOpen,
} from '@phosphor-icons/react';

interface BottomNavProps {
  currentTab: 'grades' | 'courses' | 'statistics' | 'profile' | 'logs';
  setCurrentTab: (tab: 'grades' | 'courses' | 'statistics' | 'profile' | 'logs') => void;
  userRole: 'professor' | 'student' | null;
  hasTamperedGrades: boolean;
  fetchGlobalAuditLogs: () => void;
}

export default function BottomNav({
  currentTab,
  setCurrentTab,
  userRole,
  hasTamperedGrades,
  fetchGlobalAuditLogs,
}: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-btn ${currentTab === 'grades' ? 'active' : ''}`}
        onClick={() => setCurrentTab('grades')}
      >
        <ListIcon size={20} weight="bold" />
        <span>Grades</span>
        {hasTamperedGrades && <span className="bottom-badge"></span>}
      </button>
      
      <button
        className={`bottom-nav-btn ${currentTab === 'courses' ? 'active' : ''}`}
        onClick={() => setCurrentTab('courses')}
      >
        <BookOpen size={20} weight="bold" />
        <span>Courses</span>
      </button>

      <button
        className={`bottom-nav-btn ${currentTab === 'statistics' ? 'active' : ''}`}
        onClick={() => setCurrentTab('statistics')}
      >
        <ChartBar size={20} weight="bold" />
        <span>Statistics</span>
      </button>

      {userRole === 'professor' && (
        <button
          className={`bottom-nav-btn ${currentTab === 'logs' ? 'active' : ''}`}
          onClick={() => {
            setCurrentTab('logs');
            fetchGlobalAuditLogs();
          }}
        >
          <Clock size={20} weight="bold" />
          <span>Logs</span>
        </button>
      )}
      
      <button
        className={`bottom-nav-btn ${currentTab === 'profile' ? 'active' : ''}`}
        onClick={() => setCurrentTab('profile')}
      >
        <User size={20} weight="bold" />
        <span>Profile</span>
      </button>
    </nav>
  );
}
