import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import type { Professor } from '../services/api';

export function useAuth(api: ApiService) {
  // ── AUTH STATE ─────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'professor' | 'student' | null>(null);
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl] = useState<string>(() => {
    return localStorage.getItem('gg_server_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';
  });
  const [prevServerUrl, setPrevServerUrl] = useState<string>(() => {
    return localStorage.getItem('gg_server_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';
  });

  // Login / Register Form states
  const [authPortalMode, setAuthPortalMode] = useState<'professor' | 'student'>('professor');
  const [formMode, setFormMode] = useState<'login' | 'register'>('login');

  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginStudentId, setLoginStudentId] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regEmpId, setRegEmpId] = useState<string>('');
  const [regDept, setRegDept] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regSecretKey, setRegSecretKey] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState<boolean>(false);
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [regStudentId, setRegStudentId] = useState<string>('');
  const [regStudentDept, setRegStudentDept] = useState<string>('');
  const [regActualPassword, setRegActualPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetAuthForm = () => {
    setLoginEmail('');
    setLoginPassword('');
    setLoginStudentId('');
    setRegName('');
    setRegEmpId('');
    setRegDept('');
    setRegEmail('');
    setRegPassword('');
    setRegSecretKey('');
    setRegConfirmPassword('');
    setRegStudentId('');
    setRegStudentDept('');
    setRegActualPassword('');
    setAuthError(null);
    setRegisterErrors({});
    setShowLoginPassword(false);
    setShowRegPassword(false);
    setShowRegConfirmPassword(false);
    setShowSecretKey(false);
  };

  // ── CORE API CALL WRAPPER ──────────────────────────────────────────────────
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const activeToken = token || localStorage.getItem('gg_token');
    api.setToken(activeToken);
    try {
      return await api.apiCall(endpoint, options);
    } catch (err: any) {
      const errMsg = (err.message || '').toLowerCase();
      if (
        errMsg.includes('token') ||
        errMsg.includes('authenticate') ||
        errMsg.includes('auth')
      ) {
        handleLogout();
      }
      throw err;
    }
  };

  // Sync serverUrl state with the API client
  useEffect(() => {
    api.setBaseUrl(serverUrl);
  }, [serverUrl]);

  // Handle serverUrl changes to reset invalid sessions
  useEffect(() => {
    if (serverUrl !== prevServerUrl) {
      handleLogout();
      setPrevServerUrl(serverUrl);
    }
  }, [serverUrl, prevServerUrl]);

  // Restore Session
  useEffect(() => {
    const savedToken = localStorage.getItem('gg_token');
    const savedProf = localStorage.getItem('gg_prof');
    const savedStudent = localStorage.getItem('gg_student');
    const savedRole = localStorage.getItem('gg_role') as 'professor' | 'student' | null;

    if (savedToken && savedRole) {
      setToken(savedToken);
      api.setToken(savedToken);
      setUserRole(savedRole);
      if (savedRole === 'professor' && savedProf) {
        setProfessor(JSON.parse(savedProf));
      } else if (savedRole === 'student' && savedStudent) {
        setStudent(JSON.parse(savedStudent));
      }
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const identifier = loginEmail.trim();
    if (!identifier) {
      setAuthError('Please enter your Email or Student ID.');
      return;
    }
    if (!loginPassword) {
      setAuthError('Please enter your password.');
      return;
    }

    const isEmail = identifier.includes('@');
    setIsSubmitting(true);

    if (isEmail) {
      if (!/\S+@\S+\.\S+/.test(identifier)) {
        setAuthError('Please enter a valid email address.');
        setIsSubmitting(false);
        return;
      }
      try {
        const data = await apiCall('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: identifier.toLowerCase(), password: loginPassword })
        });
        
        const prof: Professor = data.professor;
        const tok: string = data.access_token || data.token;
        
        localStorage.setItem('gg_token', tok);
        localStorage.setItem('gg_prof', JSON.stringify(prof));
        localStorage.setItem('gg_role', 'professor');
        localStorage.setItem('gg_server_url', serverUrl);
        api.setToken(tok);
        
        setToken(tok);
        setUserRole('professor');
        setProfessor(prof);
        setIsAuthenticated(true);
      } catch (err: any) {
        setAuthError(err.message || 'Login failed. Please verify credentials.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        const data = await apiCall('/student/login', {
          method: 'POST',
          body: JSON.stringify({ student_id: identifier, password: loginPassword })
        });
        
        const stud = data.student;
        const tok: string = data.access_token || data.token;
        
        localStorage.setItem('gg_token', tok);
        localStorage.setItem('gg_student', JSON.stringify(stud));
        localStorage.setItem('gg_role', 'student');
        localStorage.setItem('gg_server_url', serverUrl);
        api.setToken(tok);
        
        setToken(tok);
        setUserRole('student');
        setStudent(stud);
        setIsAuthenticated(true);
      } catch (err: any) {
        setAuthError(err.message || 'Login failed. Please verify student credentials.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const validateRegisterField = (field: string, val: string) => {
    let error = '';
    const cleanVal = val.trim();

    if (field === 'regName') {
      if (!cleanVal) error = 'Full name is required.';
    } else if (field === 'regStudentId') {
      if (!cleanVal) error = 'ID Number is required.';
    } else if (field === 'regStudentDept') {
      if (!cleanVal) error = 'Department / Faculty name is required.';
    } else if (field === 'regEmail') {
      if (!cleanVal) {
        error = 'Email address is required.';
      } else if (!/\S+@\S+\.\S+/.test(cleanVal)) {
        error = 'Please enter a valid email address (e.g. name@alexu.edu.eg).';
      }
    } else if (field === 'regPassword') {
      if (!val) {
        error = 'Password or Faculty Key is required.';
      } else if (val.length < 6) {
        error = 'Must be at least 6 characters.';
      }
    } else if (field === 'regActualPassword') {
      if (!val) {
        error = 'Password is required.';
      } else if (val.length < 6) {
        error = 'Password must be at least 6 characters.';
      }
    } else if (field === 'regConfirmPassword') {
      if (val !== regPassword) {
        error = 'Passwords do not match.';
      }
    }

    setRegisterErrors(prev => ({
      ...prev,
      [field]: error
    }));

    return !error;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const isProfessor = regPassword.startsWith('GG-FACULTY-');

    const nameOk = validateRegisterField('regName', regName);
    const idOk = validateRegisterField('regStudentId', regStudentId);
    const deptOk = validateRegisterField('regStudentDept', regStudentDept);
    const emailOk = validateRegisterField('regEmail', regEmail);
    
    let passOk = false;
    if (isProfessor) {
      passOk = validateRegisterField('regActualPassword', regActualPassword);
    } else {
      passOk = validateRegisterField('regPassword', regPassword) && validateRegisterField('regConfirmPassword', regConfirmPassword);
    }

    const isValid = nameOk && idOk && deptOk && emailOk && passOk;

    if (!isValid) {
      setAuthError('Please correct the validation errors below.');
      return;
    }

    const targetId = regStudentId.trim();
    const targetDept = regStudentDept.trim();
    const normalizedEmail = regEmail.trim().toLowerCase();
    setIsSubmitting(true);

    if (isProfessor) {
      try {
        await apiCall('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: regName,
            employee_id: targetId,
            department: targetDept,
            email: normalizedEmail,
            password: regActualPassword,
            faculty_secret_key: regPassword.trim()
          })
        });

        // Auto login after registration
        const data = await apiCall('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: normalizedEmail, password: regActualPassword })
        });
        
        const prof: Professor = data.professor;
        const tok: string = data.access_token || data.token;
        
        localStorage.setItem('gg_token', tok);
        localStorage.setItem('gg_prof', JSON.stringify(prof));
        localStorage.setItem('gg_role', 'professor');
        localStorage.setItem('gg_server_url', serverUrl);
        api.setToken(tok);
        
        setToken(tok);
        setUserRole('professor');
        setProfessor(prof);
        setIsAuthenticated(true);
      } catch (err: any) {
        setAuthError(err.message || 'Registration failed.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        await apiCall('/student/register', {
          method: 'POST',
          body: JSON.stringify({
            name: regName,
            student_id: targetId,
            department: targetDept,
            email: normalizedEmail,
            password: regPassword
          })
        });

        // Auto login after registration
        const data = await apiCall('/student/login', {
          method: 'POST',
          body: JSON.stringify({ student_id: targetId, password: regPassword })
        });
        
        const stud = data.student;
        const tok: string = data.access_token || data.token;
        
        localStorage.setItem('gg_token', tok);
        localStorage.setItem('gg_student', JSON.stringify(stud));
        localStorage.setItem('gg_role', 'student');
        localStorage.setItem('gg_server_url', serverUrl);
        api.setToken(tok);
        
        setToken(tok);
        setUserRole('student');
        setStudent(stud);
        setIsAuthenticated(true);
      } catch (err: any) {
        setAuthError(err.message || 'Registration failed.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setProfessor(null);
    setStudent(null);
    setToken(null);
    setUserRole(null);
    
    localStorage.removeItem('gg_token');
    localStorage.removeItem('gg_prof');
    localStorage.removeItem('gg_student');
    localStorage.removeItem('gg_role');
    api.setToken(null);
  };

  return {
    // Auth state
    isAuthenticated,
    userRole,
    professor,
    student,
    token,
    serverUrl,
    // Form state
    authPortalMode,
    setAuthPortalMode,
    formMode,
    setFormMode,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginStudentId,
    setLoginStudentId,
    regName,
    setRegName,
    regEmpId,
    setRegEmpId,
    regDept,
    setRegDept,
    regEmail,
    setRegEmail,
    regPassword,
    setRegPassword,
    regSecretKey,
    setRegSecretKey,
    regConfirmPassword,
    setRegConfirmPassword,
    showLoginPassword,
    setShowLoginPassword,
    showRegPassword,
    setShowRegPassword,
    showRegConfirmPassword,
    setShowRegConfirmPassword,
    showSecretKey,
    setShowSecretKey,
    regStudentId,
    setRegStudentId,
    regStudentDept,
    setRegStudentDept,
    regActualPassword,
    setRegActualPassword,
    authError,
    setAuthError,
    registerErrors,
    isSubmitting,
    // Handlers
    resetAuthForm,
    handleLogin,
    handleRegister,
    handleLogout,
    validateRegisterField,
    apiCall,
  };
}
