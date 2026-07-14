import { X, ShieldCheck } from '@phosphor-icons/react';

interface StatusModalProps {
  hasTamperedGrades: boolean;
  setShowStatusModal: (show: boolean) => void;
}

export default function StatusModal({ hasTamperedGrades, setShowStatusModal }: StatusModalProps) {
  return (
    <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2>Secure System Status</h2>
          <button className="icon-btn" onClick={() => setShowStatusModal(false)} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '24px 16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: hasTamperedGrades ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: hasTamperedGrades ? 'var(--destructive)' : 'var(--success)'
            }}
          >
            <ShieldCheck size={36} weight="fill" />
          </div>
          
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              {hasTamperedGrades ? 'System Compromised' : 'System Secure'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {hasTamperedGrades
                ? 'Cryptographic validation failed. Some grade records do not match their stored signature.'
                : 'All grade records match their HMAC-SHA256 signatures stored in the secure database.'}
            </p>
          </div>
          
          <div
            style={{
              width: '100%',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              textAlign: 'left',
              fontSize: '12px'
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>VERIFICATION ENGINE</span>
              <strong style={{ color: 'var(--text)' }}>HMAC-SHA256</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>INTEGRITY STATUS</span>
              <strong style={{ color: hasTamperedGrades ? 'var(--destructive)' : 'var(--success)' }}>
                {hasTamperedGrades ? 'FAIL' : 'PASS (100%)'}
              </strong>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>KEY STATE</span>
              <code style={{ fontSize: '11px', display: 'block', wordBreak: 'break-all', backgroundColor: 'var(--muted)', padding: '6px', borderRadius: '4px' }}>
                {hasTamperedGrades
                  ? 'WARNING: DB SIGNATURE MISMATCH DETECTED'
                  : 'ENV_SECRET_KEY_VALIDATED_OK (ACTIVE)'}
              </code>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="action-btn" style={{ width: '100%' }} onClick={() => setShowStatusModal(false)}>
            Dismiss Status Card
          </button>
        </div>
      </div>
    </div>
  );
}
