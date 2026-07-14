import { Shield } from '@phosphor-icons/react';

interface SecurityCheckScreenProps {
  securityProgress: number;
  securityScanStep: string;
}

export default function SecurityCheckScreen({ securityProgress, securityScanStep }: SecurityCheckScreenProps) {
  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ maxWidth: '400px' }}>
        <div className="auth-header">
          <div className="auth-logo-animation">
            <Shield size={36} weight="duotone" className="theme-accent-color" style={{ color: 'var(--primary)' }} />
          </div>
          <h1>Initializing Portal</h1>
          <p>Verifying local cryptographic environment...</p>
        </div>
        
        <div style={{ width: '100%', backgroundColor: 'var(--muted)', borderRadius: '10px', height: '6px', overflow: 'hidden', margin: '20px 0' }}>
          <div style={{ height: '100%', width: `${securityProgress}%`, backgroundColor: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
        </div>
        
        <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {securityScanStep}
        </div>
      </div>
    </div>
  );
}
