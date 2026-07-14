import {
  ArrowClockwise,
  Moon,
  Sun,
  ShieldCheck,
} from '@phosphor-icons/react';

interface TopHeaderProps {
  currentTab: 'grades' | 'courses' | 'statistics' | 'profile' | 'logs';
  userRole: 'professor' | 'student' | null;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isLoading: boolean;
  loadingGlobalLogs: boolean;
  hasTamperedGrades: boolean;
  loadGrades: () => void;
  fetchGlobalAuditLogs: () => void;
  setShowStatusModal: (show: boolean) => void;
}

export default function TopHeader({
  currentTab,
  userRole,
  theme,
  setTheme,
  isLoading,
  loadingGlobalLogs,
  hasTamperedGrades,
  loadGrades,
  fetchGlobalAuditLogs,
  setShowStatusModal,
}: TopHeaderProps) {
  const title =
    currentTab === 'grades'
      ? 'Grading Records'
      : currentTab === 'courses'
      ? userRole === 'professor'
        ? 'Courses Assigned'
        : 'Enrolled Courses'
      : currentTab === 'statistics'
      ? 'Grading & Security Analytics'
      : currentTab === 'logs'
      ? 'Security Audit Logs'
      : userRole === 'professor'
      ? 'Professor Profile'
      : 'Student Profile';

  return (
    <header className="top-header">
      <div className="header-title-section">
        <h1 style={{ textTransform: 'capitalize' }}>{title}</h1>
      </div>
      
      <div className="header-actions">
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {(currentTab === 'grades' || currentTab === 'logs') && (
          <button
            className="icon-btn"
            onClick={currentTab === 'grades' ? loadGrades : fetchGlobalAuditLogs}
            title={currentTab === 'grades' ? 'Refresh grades from server' : 'Refresh audit logs'}
            aria-label="Refresh Data"
          >
            <ArrowClockwise size={20} className={(isLoading || loadingGlobalLogs) ? 'loading-spin' : ''} />
          </button>
        )}
        
        <button
          className="icon-btn"
          onClick={() => setShowStatusModal(true)}
          title="Secure System Status"
          aria-label="Security Status"
        >
          <ShieldCheck size={22} style={{ color: hasTamperedGrades ? 'var(--destructive)' : 'var(--success)' }} />
        </button>
      </div>
    </header>
  );
}
