import { SignOut } from '@phosphor-icons/react';
import type { Professor } from '../../types';

interface ProfileTabProps {
  userRole: 'professor' | 'student' | null;
  professor: Professor | null;
  student: any | null; // Student profile details
  handleLogout: () => void;
}

export default function ProfileTab({
  userRole,
  professor,
  student,
  handleLogout,
}: ProfileTabProps) {
  return (
    <div className="profile-card" style={{ animation: 'slide-up 0.3s ease' }}>
      {userRole === 'professor' && professor ? (
        <>
          <div className="profile-avatar">
            {professor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <h2 className="profile-name">{professor.name}</h2>
          <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '14px' }}>Alexandria University Faculty Member</span>

          <div className="profile-meta-grid">
            <div className="profile-meta-item">
              <span className="profile-meta-label">Employee ID</span>
              <span className="profile-meta-val">{professor.employee_id}</span>
            </div>
            <div className="profile-meta-item">
              <span className="profile-meta-label">Department</span>
              <span className="profile-meta-val">{professor.department}</span>
            </div>
            <div className="profile-meta-item" style={{ gridColumn: 'span 2' }}>
              <span className="profile-meta-label">Faculty Registered Email</span>
              <span className="profile-meta-val">{professor.email}</span>
            </div>
          </div>
        </>
      ) : student ? (
        <>
          <div className="profile-avatar">
            {student.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <h2 className="profile-name">{student.name}</h2>
          <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '14px' }}>Alexandria University Student</span>

          <div className="profile-meta-grid">
            <div className="profile-meta-item">
              <span className="profile-meta-label">Student ID</span>
              <span className="profile-meta-val">{student.student_id}</span>
            </div>
            <div className="profile-meta-item">
              <span className="profile-meta-label">Faculty / Department</span>
              <span className="profile-meta-val">{student.department}</span>
            </div>
            <div className="profile-meta-item" style={{ gridColumn: 'span 2' }}>
              <span className="profile-meta-label">Registered Email</span>
              <span className="profile-meta-val">{student.email}</span>
            </div>
          </div>
        </>
      ) : null}

      <button className="logout-btn" onClick={handleLogout} style={{ maxWidth: '200px', marginTop: '24px' }}>
        <SignOut size={16} weight="bold" />
        Sign Out of Portal
      </button>
    </div>
  );
}
