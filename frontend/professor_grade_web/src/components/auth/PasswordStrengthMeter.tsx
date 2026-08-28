import { Check, X, ShieldCheck, ShieldWarning } from '@phosphor-icons/react';

interface PasswordStrengthMeterProps {
  password: string;
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaCount = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  let score = 1;
  let label = 'Weak';
  let color = 'var(--destructive, #ef4444)';
  let bgTint = 'rgba(239, 68, 68, 0.12)';

  if (!hasLength) {
    score = 1;
    label = 'Min 8 characters required';
    color = 'var(--destructive, #ef4444)';
    bgTint = 'rgba(239, 68, 68, 0.12)';
  } else if (criteriaCount <= 1) {
    score = 1;
    label = 'Weak';
    color = '#f87171';
    bgTint = 'rgba(248, 113, 113, 0.12)';
  } else if (criteriaCount === 2) {
    score = 2;
    label = 'Fair';
    color = '#fb923c';
    bgTint = 'rgba(251, 146, 60, 0.12)';
  } else if (criteriaCount === 3) {
    score = 3;
    label = 'Good';
    color = '#38bdf8';
    bgTint = 'rgba(56, 189, 248, 0.12)';
  } else {
    score = 4;
    label = 'Strong';
    color = '#10b981';
    bgTint = 'rgba(16, 185, 129, 0.12)';
  }

  const requirements = [
    { label: '8+ chars', met: hasLength },
    { label: 'Uppercase', met: hasUpper },
    { label: 'Lowercase', met: hasLower },
    { label: 'Number', met: hasNumber },
    { label: 'Symbol', met: hasSpecial },
  ];

  return (
    <div
      className="password-strength-container"
      style={{
        marginTop: '8px',
        marginBottom: '12px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm, 8px)',
        backgroundColor: 'var(--card-bg-subtle, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
        transition: 'all 0.2s ease',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      {/* Header with Strength Label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
          Password Strength
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: bgTint,
            color: color,
            fontSize: '11px',
            fontWeight: 700,
            transition: 'all 0.2s ease',
          }}
        >
          {score >= 3 ? <ShieldCheck size={13} weight="fill" /> : <ShieldWarning size={13} weight="fill" />}
          <span>{label}</span>
        </div>
      </div>

      {/* 4-Segment Progress Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          height: '4px',
          marginBottom: '8px',
        }}
      >
        {[1, 2, 3, 4].map(step => (
          <div
            key={step}
            style={{
              height: '100%',
              borderRadius: '2px',
              backgroundColor: step <= score ? color : 'var(--border, rgba(255, 255, 255, 0.12))',
              transition: 'background-color 0.25s ease',
            }}
          />
        ))}
      </div>

      {/* Criteria Requirement Badges */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
        }}
      >
        {requirements.map((req, idx) => (
          <span
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 600,
              backgroundColor: req.met ? 'rgba(16, 185, 129, 0.12)' : 'var(--muted-bg, rgba(255, 255, 255, 0.05))',
              color: req.met ? '#10b981' : 'var(--text-muted, #64748b)',
              border: `1px solid ${req.met ? 'rgba(16, 185, 129, 0.25)' : 'transparent'}`,
              transition: 'all 0.2s ease',
            }}
          >
            {req.met ? <Check size={10} weight="bold" /> : <X size={10} />}
            {req.label}
          </span>
        ))}
      </div>
    </div>
  );
}
