import { Warning } from '@phosphor-icons/react';

interface BlockedScreenProps {
  securityCheckReason: string | null;
}

export default function BlockedScreen({ securityCheckReason }: BlockedScreenProps) {
  return (
    <div className="blocked-screen">
      <div className="blocked-card">
        <div className="blocked-icon-container">
          <Warning size={48} weight="bold" />
        </div>
        <h1>Security Block Triggered</h1>
        <div className="blocked-reason">{securityCheckReason}</div>
        <div className="blocked-info-box">
          <div className="blocked-info-title">Why does this happen?</div>
          <div className="blocked-info-desc">
            GradeGuardian enforces cryptographic verification of grades and secure token transport. It must run in a secure context (HTTPS) to guarantee academic record integrity.
          </div>
        </div>
      </div>
    </div>
  );
}
