import { Clock, ShieldCheck } from '@phosphor-icons/react';

interface AuditLogsTabProps {
  showGlobalLogsLoadingIndicator: boolean;
  globalAuditLogs: any[];
}

export default function AuditLogsTab({
  showGlobalLogsLoadingIndicator,
  globalAuditLogs,
}: AuditLogsTabProps) {
  return (
    <div className="logs-feed-card" style={{ animation: 'slide-up 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
        <Clock size={32} style={{ color: 'var(--primary)' }} />
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Cryptographic Audit Logs Feed</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Centralized timeline tracking all integrity validations, modifications, and system checks.
          </p>
        </div>
      </div>

      {showGlobalLogsLoadingIndicator ? (
        <div className="shimmer-wrapper" style={{ animation: 'fade-in 0.3s ease', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="shimmer-card" style={{ height: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="shimmer-item shimmer-line short" style={{ margin: 0 }}></div>
              <div className="shimmer-item shimmer-line short" style={{ width: '100px', margin: 0 }}></div>
            </div>
            <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
          </div>
          <div className="shimmer-card" style={{ height: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="shimmer-item shimmer-line short" style={{ margin: 0 }}></div>
              <div className="shimmer-item shimmer-line short" style={{ width: '100px', margin: 0 }}></div>
            </div>
            <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
          </div>
          <div className="shimmer-card" style={{ height: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="shimmer-item shimmer-line short" style={{ margin: 0 }}></div>
              <div className="shimmer-item shimmer-line short" style={{ width: '100px', margin: 0 }}></div>
            </div>
            <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
          </div>
        </div>
      ) : globalAuditLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
          <ShieldCheck size={48} style={{ color: 'var(--success)', opacity: 0.6, marginBottom: '12px' }} />
          <h3>No security alerts or audit events</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>All cryptographic records are validated and fully intact.</p>
        </div>
      ) : (
        <div className="audit-log-list" style={{ gap: '16px' }}>
          {globalAuditLogs.map((log, idx) => {
            const isPass = log.status === 'PASS' || log.status === 'VERIFIED' || log.status === 'REPAIRED';
            return (
              <div key={idx} className="audit-log-item" style={{ borderLeft: `3px solid ${isPass ? 'var(--success)' : 'var(--destructive)'}` }}>
                <div className="audit-log-meta">
                  <span className="audit-log-action" style={{ color: isPass ? 'var(--success)' : 'var(--destructive)' }}>
                    {log.action.toUpperCase()}
                  </span>
                  <span className="audit-log-actor" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    {log.checkedAt ? new Date(log.checkedAt).toLocaleString() : 'System Check / Pending'}
                  </span>
                </div>
                {log.details && (
                  <div style={{
                    color: 'var(--text-secondary)',
                    marginTop: '8px',
                    fontSize: '13px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--muted)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}>
                    {log.details}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Grade ID: <code style={{ fontSize: '10px', color: 'var(--primary)' }}>{log.gradeId}</code>
                  </span>
                  <span style={{
                    color: isPass ? 'var(--success)' : 'var(--destructive)',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    Status: {log.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
