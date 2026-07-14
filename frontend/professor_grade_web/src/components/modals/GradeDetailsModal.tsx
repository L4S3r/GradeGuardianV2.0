import {
  X,
  ArrowClockwise,
  ShieldCheck,
  ShieldSlash,
  Lock,
  Wrench,
} from '@phosphor-icons/react';
import type { GradeRecord, AuditLog } from '../../types';

interface GradeDetailsModalProps {
  selectedGrade: GradeRecord;
  selectedGradeLogs: AuditLog[];
  loadingGradeLogs: boolean;
  isSubmitting: boolean;
  userRole: 'professor' | 'student' | null;
  handleCloseDetails: () => void;
  handleOpenEdit: () => void;
  handleRepairGrade: (gradeId: string) => void;
}

export default function GradeDetailsModal({
  selectedGrade,
  selectedGradeLogs,
  loadingGradeLogs,
  isSubmitting,
  userRole,
  handleCloseDetails,
  handleOpenEdit,
  handleRepairGrade,
}: GradeDetailsModalProps) {
  return (
    <div className="modal-overlay" onClick={handleCloseDetails}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h2>Record Integrity Details</h2>
          </div>
          <button className="icon-btn" onClick={handleCloseDetails} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          {/* Record Summary */}
          <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Student ID: {selectedGrade.studentId}</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {selectedGrade.courseCode} — {selectedGrade.courseName}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', display: 'block', lineHeight: 1 }}>
                {selectedGrade.grade.toFixed(1)}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Grade {selectedGrade.letterGrade}
              </span>
            </div>
          </div>


          {/* Cryptographic Details Box */}
          <div className="integrity-detail-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} style={{ color: selectedGrade.isVerified ? 'var(--success)' : 'var(--destructive)' }} />
              <strong style={{ fontSize: '13px', color: selectedGrade.isVerified ? 'var(--success)' : 'var(--destructive)' }}>
                {selectedGrade.isVerified ? 'SIGNATURE INTEGRITY VERIFIED' : 'SIGNATURE VERIFICATION FAILED'}
              </strong>
            </div>

            <div className="integrity-row">
              <span className="integrity-label">Record Hash (SHA256 Signature)</span>
              <span className="integrity-value">{selectedGrade.hash}</span>
            </div>

            {selectedGrade.verificationError && (
              <div className="integrity-row" style={{ color: 'var(--destructive)', fontSize: '12px', fontWeight: 600 }}>
                Verification Details: {selectedGrade.verificationError}
              </div>
            )}

            {!selectedGrade.isVerified && selectedGrade.originalGrade !== undefined && (selectedGrade.grade !== selectedGrade.originalGrade || selectedGrade.letterGrade !== selectedGrade.originalLetterGrade) && (
              <div className="integrity-row" style={{ backgroundColor: 'var(--destructive-bg)', padding: '10px', borderRadius: '4px', border: '1px solid var(--destructive-border)' }}>
                <span className="integrity-label" style={{ color: 'var(--destructive)' }}>Tampering Detection</span>
                <span style={{ fontSize: '13px', display: 'block', marginTop: '4px' }}>
                  Database values changed to <strong>{selectedGrade.grade} ({selectedGrade.letterGrade})</strong>, but the signed cryptographic signature was created for <strong>{selectedGrade.originalGrade} ({selectedGrade.originalLetterGrade})</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Change History Logs */}
          <div className="audit-logs-section">
            <h4 className="audit-log-title">Change History &amp; Audit Logs</h4>
            {loadingGradeLogs ? (
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <ArrowClockwise size={20} className="loading-spin" />
              </div>
            ) : selectedGradeLogs.length === 0 ? (
              <div className="audit-log-list" style={{ justifyContent: 'center', alignItems: 'center', height: '60px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No modification logs recorded for this grade.</span>
              </div>
            ) : (
              <div className="audit-log-list">
                {selectedGradeLogs.map((log, idx) => (
                  <div key={idx} className="audit-log-item">
                    <div className="audit-log-meta">
                      <span className="audit-log-action">{log.action}</span>
                      <span className="audit-log-actor">{new Date(log.checkedAt).toLocaleString()}</span>
                    </div>
                    {log.details && (
                      <span style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {log.details}
                      </span>
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Security Level: {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          {userRole === 'professor' && (
            <>
              <button
                className="logout-btn"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)', marginRight: 'auto' }}
                onClick={handleOpenEdit}
              >
                <Lock size={16} /> Edit Grade
              </button>

              {!selectedGrade.isVerified && (
                <button
                  className="action-btn"
                  style={{ backgroundColor: 'var(--destructive)' }}
                  onClick={() => handleRepairGrade(selectedGrade.id)}
                  disabled={isSubmitting}
                >
                  <Wrench size={16} /> Repair Signature
                </button>
              )}
            </>
          )}

          {userRole === 'student' && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: selectedGrade.isVerified ? 'var(--success-bg, rgba(34,197,94,0.08))' : 'var(--destructive-bg)',
              border: `1px solid ${selectedGrade.isVerified ? 'var(--success, #22c55e)' : 'var(--destructive-border)'}`,
            }}>
              {selectedGrade.isVerified ? (
                <ShieldCheck size={22} style={{ color: 'var(--success, #22c55e)', flexShrink: 0 }} weight="fill" />
              ) : (
                <ShieldSlash size={22} style={{ color: 'var(--destructive)', flexShrink: 0 }} weight="fill" />
              )}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: selectedGrade.isVerified ? 'var(--success, #22c55e)' : 'var(--destructive)', textTransform: 'uppercase' }}>
                  AUTOMATIC INTEGRITY CHECK
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedGrade.isVerified
                    ? 'Cryptographic signature is valid. This grade record has not been tampered with.'
                    : 'Signature mismatch detected. This record may have been altered. Contact your professor immediately.'}
                </div>
              </div>
            </div>
          )}

          <button className="nav-btn" style={{ width: 'auto', border: '1px solid var(--border)' }} onClick={handleCloseDetails}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
