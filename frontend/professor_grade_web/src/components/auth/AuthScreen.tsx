import {
  SignIn,
  UserPlus,
  User,
  Lock,
  Envelope,
  IdentificationCard,
  GraduationCap,
  Key,
  Moon,
  Sun,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';
import PasswordStrengthMeter from './PasswordStrengthMeter';

interface AuthScreenProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  authPortalMode: 'professor' | 'student';
  setAuthPortalMode: (mode: 'professor' | 'student') => void;
  formMode: 'login' | 'register';
  setFormMode: (mode: 'login' | 'register') => void;
  authError: string | null;
  registerErrors: Record<string, string>;
  isSubmitting: boolean;
  // Login fields
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  loginStudentId: string;
  setLoginStudentId: (v: string) => void;
  showLoginPassword: boolean;
  setShowLoginPassword: (v: boolean) => void;
  // Register fields
  regName: string;
  setRegName: (v: string) => void;
  regEmpId: string;
  setRegEmpId: (v: string) => void;
  regDept: string;
  setRegDept: (v: string) => void;
  regEmail: string;
  setRegEmail: (v: string) => void;
  regPassword: string;
  setRegPassword: (v: string) => void;
  regSecretKey: string;
  setRegSecretKey: (v: string) => void;
  regConfirmPassword: string;
  setRegConfirmPassword: (v: string) => void;
  showRegPassword: boolean;
  setShowRegPassword: (v: boolean) => void;
  showRegConfirmPassword: boolean;
  setShowRegConfirmPassword: (v: boolean) => void;
  showSecretKey: boolean;
  setShowSecretKey: (v: boolean) => void;
  showRegActualPassword: boolean;
  setShowRegActualPassword: (v: boolean) => void;
  regStudentId: string;
  setRegStudentId: (v: string) => void;
  regStudentDept: string;
  setRegStudentDept: (v: string) => void;
  regActualPassword: string;
  setRegActualPassword: (v: string) => void;
  // Handlers
  handleLogin: (e: React.FormEvent) => void;
  handleRegister: (e: React.FormEvent) => void;
  resetAuthForm: () => void;
  validateRegisterField: (field: string, val: string) => boolean;
  // Cursor
  cursorRef: React.RefObject<HTMLDivElement | null>;
  cursorVisible: boolean;
  cursorHovered: boolean;
}

export default function AuthScreen({
  theme,
  setTheme,
  formMode,
  setFormMode,
  authError,
  registerErrors,
  isSubmitting,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginStudentId,
  setLoginStudentId,
  showLoginPassword,
  setShowLoginPassword,
  regName,
  setRegName,
  setRegEmpId,
  setRegDept,
  regEmail,
  setRegEmail,
  regPassword,
  setRegPassword,
  regConfirmPassword,
  setRegConfirmPassword,
  showRegPassword,
  setShowRegPassword,
  showRegConfirmPassword,
  setShowRegConfirmPassword,
  showRegActualPassword,
  setShowRegActualPassword,
  regStudentId,
  setRegStudentId,
  regStudentDept,
  setRegStudentDept,
  regActualPassword,
  setRegActualPassword,
  handleLogin,
  handleRegister,
  resetAuthForm,
  validateRegisterField,
  cursorRef,
  cursorVisible,
  cursorHovered,
}: AuthScreenProps) {
  
  const isProfessorDetected = regPassword.startsWith('GG-FACULTY-');

  return (
    <div className="auth-screen">
      <button
        className="icon-btn theme-toggle-auth"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        aria-label="Toggle Theme"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 10,
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow)',
          color: 'var(--text-primary)',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-animation">
            <img src="/favicon.png" alt="GradeGuardian Logo" style={{ width: '40px', height: '40px' }} />
          </div>
          <h1>GradeGuardian</h1>
          <p>Alexandria University Grade Integrity Portal 🎓</p>
        </div>

        <div className="segmented-control" style={{ marginBottom: '24px' }}>
          <button
            className={formMode === 'login' ? 'active' : ''}
            onClick={() => { resetAuthForm(); setFormMode('login'); }}
          >
            Sign In
          </button>
          <button
            className={formMode === 'register' ? 'active' : ''}
            onClick={() => { resetAuthForm(); setFormMode('register'); }}
          >
            Register
          </button>
        </div>

        {authError && (
          <div style={{
            backgroundColor: 'var(--destructive-bg)',
            color: 'var(--destructive)',
            border: '1px solid var(--destructive-border)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            {authError}
          </div>
        )}

        {formMode === 'login' ? (
          <form onSubmit={handleLogin} noValidate>
            <div className="form-group">
              <label htmlFor="loginIdentifier">Email or Student ID</label>
              <div className="form-control-container">
                <span className="form-control-icon"><Envelope size={18} /></span>
                <input
                  id="loginIdentifier"
                  type="text"
                  className="form-control"
                  placeholder="e.g. prof@alexu.edu.eg or STU-2024-001"
                  value={loginEmail || loginStudentId}
                  onChange={e => {
                    const val = e.target.value;
                    setLoginEmail(val);
                    setLoginStudentId(val);
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="form-control-container">
                <span className="form-control-icon"><Lock size={18} /></span>
                <input
                  id="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  className="form-control password-input"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="form-control-toggle"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ marginTop: '8px' }}>
              {isSubmitting ? (
                <>Authenticating...</>
              ) : (
                <>
                  <SignIn size={18} weight="bold" />
                  Sign In to Portal
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} noValidate>
            <div className="form-group">
              <label htmlFor="regName">Full Name</label>
              <div className="form-control-container">
                <span className="form-control-icon"><User size={18} /></span>
                <input
                  id="regName"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ahmed Salem"
                  value={regName}
                  onChange={e => {
                    setRegName(e.target.value);
                    if (registerErrors.regName) validateRegisterField('regName', e.target.value);
                  }}
                  onBlur={e => validateRegisterField('regName', e.target.value)}
                  required
                />
              </div>
              {registerErrors.regName && (
                <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                  {registerErrors.regName}
                </span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="regStudentId">ID Number</label>
                <div className="form-control-container">
                  <span className="form-control-icon"><IdentificationCard size={18} /></span>
                  <input
                    id="regStudentId"
                    type="text"
                    className="form-control"
                    placeholder="STU-XXXX-XXX or EMPXXXX"
                    value={regStudentId}
                    onChange={e => {
                      setRegStudentId(e.target.value);
                      setRegEmpId(e.target.value);
                      if (registerErrors.regStudentId) validateRegisterField('regStudentId', e.target.value);
                    }}
                    onBlur={e => validateRegisterField('regStudentId', e.target.value)}
                    required
                  />
                </div>
                {registerErrors.regStudentId && (
                  <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                    {registerErrors.regStudentId}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="regStudentDept">Department / Faculty</label>
                <div className="form-control-container">
                  <span className="form-control-icon"><GraduationCap size={18} /></span>
                  <input
                    id="regStudentDept"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Computer Science"
                    value={regStudentDept}
                    onChange={e => {
                      setRegStudentDept(e.target.value);
                      setRegDept(e.target.value);
                      if (registerErrors.regStudentDept) validateRegisterField('regStudentDept', e.target.value);
                    }}
                    onBlur={e => validateRegisterField('regStudentDept', e.target.value)}
                    required
                  />
                </div>
                {registerErrors.regStudentDept && (
                  <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                    {registerErrors.regStudentDept}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="regEmail">Email Address</label>
              <div className="form-control-container">
                <span className="form-control-icon"><Envelope size={18} /></span>
                <input
                  id="regEmail"
                  type="email"
                  className="form-control"
                  placeholder="name@alexu.edu.eg"
                  value={regEmail}
                  onChange={e => {
                    setRegEmail(e.target.value);
                    if (registerErrors.regEmail) validateRegisterField('regEmail', e.target.value);
                  }}
                  onBlur={e => validateRegisterField('regEmail', e.target.value)}
                  required
                />
              </div>
              {registerErrors.regEmail && (
                <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                  {registerErrors.regEmail}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="regPassword">
                {isProfessorDetected ? 'Faculty Secret Key (Authorized)' : 'Password'}
              </label>
              <div className="form-control-container">
                <span className="form-control-icon">{isProfessorDetected ? <Key size={18} /> : <Lock size={18} />}</span>
                <input
                  id="regPassword"
                  type={showRegPassword ? 'text' : 'password'}
                  className="form-control password-input"
                  placeholder={isProfessorDetected ? "GG-FACULTY-..." : "Min 8 characters"}
                  value={regPassword}
                  onChange={e => {
                    setRegPassword(e.target.value);
                    if (registerErrors.regPassword) validateRegisterField('regPassword', e.target.value);
                  }}
                  onBlur={e => validateRegisterField('regPassword', e.target.value)}
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="form-control-toggle"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? "Hide password" : "Show password"}
                >
                  {showRegPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {registerErrors.regPassword && !isProfessorDetected && (
                <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                  {registerErrors.regPassword}
                </span>
              )}
              {!isProfessorDetected && regPassword && (
                <PasswordStrengthMeter password={regPassword} />
              )}
            </div>

            {/* Intercept secret key to show professor password mini-card */}
            {isProfessorDetected ? (
              <div 
                className="professor-mini-card"
                style={{ 
                  margin: '16px 0', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: 'rgba(45, 212, 191, 0.08)', 
                  border: '1.5px solid var(--primary)', 
                  textAlign: 'left',
                  animation: 'fade-in 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--primary)', fontWeight: 800, fontSize: '13px' }}>
                  <Key size={18} weight="fill" />
                  FACULTY KEY AUTHORIZED
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                  You have entered a valid Alexandria University Faculty Secret Key. Please set a secure personal password for your professor account below:
                </p>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="regActualPassword" style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>Set Professor Password</label>
                  <div className="form-control-container">
                    <span className="form-control-icon"><Lock size={18} /></span>
                    <input
                      id="regActualPassword"
                      type={showRegActualPassword ? 'text' : 'password'}
                      className="form-control password-input"
                      placeholder="Min 8 characters"
                      value={regActualPassword}
                      onChange={e => {
                        setRegActualPassword(e.target.value);
                        if (registerErrors.regActualPassword) validateRegisterField('regActualPassword', e.target.value);
                      }}
                      onBlur={e => validateRegisterField('regActualPassword', e.target.value)}
                      required
                      style={{ paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      className="form-control-toggle"
                      onClick={() => setShowRegActualPassword(!showRegActualPassword)}
                      aria-label={showRegActualPassword ? "Hide password" : "Show password"}
                    >
                      {showRegActualPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {registerErrors.regActualPassword && (
                    <span style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                      {registerErrors.regActualPassword}
                    </span>
                  )}
                  {regActualPassword && (
                    <PasswordStrengthMeter password={regActualPassword} />
                  )}
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="regConfirmPassword">Confirm Password</label>
                <div className="form-control-container">
                  <span className="form-control-icon"><Lock size={18} /></span>
                  <input
                    id="regConfirmPassword"
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    className="form-control password-input"
                    placeholder="Re-enter your password"
                    value={regConfirmPassword}
                    onChange={e => {
                      setRegConfirmPassword(e.target.value);
                      if (registerErrors.regConfirmPassword) validateRegisterField('regConfirmPassword', e.target.value);
                    }}
                    onBlur={e => validateRegisterField('regConfirmPassword', e.target.value)}
                    required
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    className="form-control-toggle"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    aria-label={showRegConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showRegConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {registerErrors.regConfirmPassword && (
                  <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                    {registerErrors.regConfirmPassword}
                  </span>
                )}
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ marginTop: '8px' }}>
              {isSubmitting ? (
                <>Creating Account...</>
              ) : (
                <>
                  <UserPlus size={18} weight="bold" />
                  Register Account
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Custom cursor follower bubble */}
      <div
        ref={cursorRef}
        className={`cursor-follower ${cursorVisible ? 'visible' : ''} ${cursorHovered ? 'hovered' : ''}`}
      />
    </div>
  );
}
