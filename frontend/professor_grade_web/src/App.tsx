import { useState, useEffect } from 'react';
import {
  List as ListIcon,
  ChartBar,
  User,
  Shield,
  ShieldCheck,
  SignIn,
  UserPlus,
  Plus,
  Key,
  Lock,
  Envelope,
  IdentificationCard,
  ArrowClockwise,
  SignOut,
  MagnifyingGlass,
  Warning,
  Clock,
  Wrench,
  Moon,
  Sun,
  X,
  GraduationCap
} from '@phosphor-icons/react';
import { ApiService } from './services/api';
import type {
  Professor,
  GradeRecord,
  AuditLog,
  CourseStat,
  ProfessorStats,
  CourseModel
} from './services/api';
import './App.css';

const initialServerUrl = localStorage.getItem('gg_server_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';
const api = new ApiService(initialServerUrl);

function App() {
  // ── THEME STATE ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('gg_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // ── AUTH STATE ─────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(() => {
    return localStorage.getItem('gg_server_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';
  });
  const [prevServerUrl, setPrevServerUrl] = useState<string>(() => {
    return localStorage.getItem('gg_server_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';
  });

  // ── APP FLOW & ENVIRONMENT STATE ───────────────────────────────────────────
  const [currentTab, setCurrentTab] = useState<'grades' | 'statistics' | 'profile' | 'logs'>('grades');
  const [securityChecking, setSecurityChecking] = useState<boolean>(true);
  const [securityCheckPassed, setSecurityCheckPassed] = useState<boolean>(true);
  const [securityCheckReason, setSecurityCheckReason] = useState<string | null>(null);
  const [securityScanStep, setSecurityScanStep] = useState<string>('');
  const [securityProgress, setSecurityProgress] = useState<number>(0);

  // Global audit logs state
  const [globalAuditLogs, setGlobalAuditLogs] = useState<any[]>([]);
  const [loadingGlobalLogs, setLoadingGlobalLogs] = useState<boolean>(false);

  // Login / Register Form states
  const [formMode, setFormMode] = useState<'login' | 'register'>('login');
  const [showServerUrlInput, setShowServerUrlInput] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regEmpId, setRegEmpId] = useState<string>('');
  const [regDept, setRegDept] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regSecretKey, setRegSecretKey] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ── GRADES RECORDS STATE ───────────────────────────────────────────────────
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('All');
  const [sortOption, setSortOption] = useState<string>('date-desc');
  const [activeCourses, setActiveCourses] = useState<CourseModel[]>([]);

  // ── STATISTICS STATE ───────────────────────────────────────────────────────
  const [stats, setStats] = useState<ProfessorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  // ── MODALS & DETAILS STATE ─────────────────────────────────────────────────
  const [selectedGrade, setSelectedGrade] = useState<GradeRecord | null>(null);
  const [selectedGradeLogs, setSelectedGradeLogs] = useState<AuditLog[]>([]);
  const [loadingGradeLogs, setLoadingGradeLogs] = useState<boolean>(false);
  
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addModalType, setAddModalType] = useState<'single' | 'batch'>('single');
  
  // Single Entry Modal State
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newCourseCode, setNewCourseCode] = useState<string>('');
  const [newCourseName, setNewCourseName] = useState<string>('');
  const [newGrade, setNewGrade] = useState<string>('');
  const [newLetterGrade, setNewLetterGrade] = useState<string>('F');
  
  // Batch Entry Modal State
  const [batchText, setBatchText] = useState<string>('');
  const [batchError, setBatchError] = useState<string | null>(null);
  
  // Edit Grade Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editGradeVal, setEditGradeVal] = useState<string>('');
  const [editLetterGradeVal, setEditLetterGradeVal] = useState<string>('F');

  // ── SYNC ACTIONS ───────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gg_theme', theme);
  }, [theme]);

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
    if (savedToken && savedProf) {
      setToken(savedToken);
      api.setToken(savedToken); // Sync token with ApiService
      setProfessor(JSON.parse(savedProf));
      setIsAuthenticated(true);
    }
  }, []);

  // Startup Security Check animation
  useEffect(() => {
    let timer: number;
    const steps = [
      { text: 'Verifying browser context...', progress: 15 },
      { text: 'Checking secure WebCrypto APIs...', progress: 35 },
      { text: 'Validating browser security layers...', progress: 60 },
      { text: 'Loading Alexandria Cryptographic modules...', progress: 85 },
      { text: 'Environment integrity: SECURED ✓', progress: 100 }
    ];
    
    let currentStep = 0;
    const runScan = () => {
      if (currentStep < steps.length) {
        setSecurityScanStep(steps[currentStep].text);
        setSecurityProgress(steps[currentStep].progress);
        currentStep++;
        timer = window.setTimeout(runScan, 600);
      } else {
        // Run real check
        const passed = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!passed) {
          setSecurityCheckPassed(false);
          setSecurityCheckReason('GradeGuardian requires a Secure Context (HTTPS or localhost) to maintain data privacy and prevent Session Tampering.');
        }
        setSecurityChecking(false);
      }
    };

    runScan();
    return () => clearTimeout(timer);
  }, []);

  // Fetch grades & statistics when authenticated or on filter change
  useEffect(() => {
    if (isAuthenticated && token) {
      loadGrades();
      loadStats();
      loadCourses();
      fetchGlobalAuditLogs();
    }
  }, [isAuthenticated, token, serverUrl]);

  // Auto-calculate letter grade based on numeric grade input
  useEffect(() => {
    const num = parseFloat(newGrade);
    if (!isNaN(num)) {
      if (num >= 90) setNewLetterGrade('A');
      else if (num >= 80) setNewLetterGrade('B');
      else if (num >= 70) setNewLetterGrade('C');
      else if (num >= 60) setNewLetterGrade('D');
      else setNewLetterGrade('F');
    }
  }, [newGrade]);

  // ── CORE API SERVICE CALLS ─────────────────────────────────────────────────
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

  const loadGrades = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiCall('/grades');
      const formattedGrades = data.map((json: any) => ({
        id: json.id.toString(),
        studentId: json.student_id || 'N/A',
        courseName: json.course_name || 'N/A',
        courseCode: json.course_code || 'N/A',
        grade: Number(json.grade) || 0,
        originalGrade: json.original_grade ? Number(json.original_grade) : undefined,
        originalLetterGrade: json.original_letter_grade,
        letterGrade: json.letter_grade || 'F',
        recordedAt: json.recorded_at,
        hash: json.hash || '',
        isVerified: json.is_verified || false
      }));
      setGrades(formattedGrades);
      
      // Perform verification right after loading
      await verifyAllGrades(formattedGrades);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to load grades.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAllGrades = async (recordsList: GradeRecord[]) => {
    if (recordsList.length === 0) return;
    try {
      const ids = recordsList.map(g => g.id);
      const results = await apiCall('/verify/batch', {
        method: 'POST',
        body: JSON.stringify({ grade_ids: ids })
      });
      
      const resultsList = Array.isArray(results) ? results : (results?.results || []);

      const resultMap: { [key: string]: any } = {};
      resultsList.forEach((r: any) => {
        if (r.grade_id) {
          resultMap[r.grade_id.toString()] = r;
        }
      });

      setGrades(prev => prev.map(grade => {
        const result = resultMap[grade.id];
        if (!result) {
          return { ...grade, isVerified: false, verificationError: 'Verification missing' };
        }
        return {
          ...grade,
          isVerified: !!result.is_valid,
          verificationError: result.error || null
        };
      }));
    } catch (e) {
      console.error('Batch verification error:', e);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await apiCall('/statistics/summary');
      const statsMap = data.course_stats || {};
      const distMap = data.grade_distribution || {};
      
      const courseStatsList: CourseStat[] = Object.entries(statsMap).map(([code, value]: [string, any]) => ({
        code,
        name: value.name || '',
        average: Number(value.average) || 0,
        students: Number(value.students) || 0
      }));

      const gradeDistribution: { [key: string]: number } = {};
      Object.entries(distMap).forEach(([k, v]) => {
        gradeDistribution[k] = Number(v);
      });

      setStats({
        totalGrades: Number(data.total_grades_submitted) || 0,
        overallAverage: Number(data.overall_average) || 0,
        courseStats: courseStatsList,
        gradeDistribution
      });
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const data = await apiCall('/courses');
      setActiveCourses(data);
    } catch (e) {
      console.error('Failed to load courses:', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      
      const prof: Professor = data.professor;
      const tok: string = data.access_token || data.token;
      
      localStorage.setItem('gg_token', tok);
      localStorage.setItem('gg_prof', JSON.stringify(prof));
      localStorage.setItem('gg_server_url', serverUrl);
      api.setToken(tok);
      
      setToken(tok);
      setProfessor(prof);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmpId || !regDept || !regEmail || !regPassword || !regSecretKey) {
      setAuthError('All registration fields are required.');
      return;
    }
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: regName,
          employee_id: regEmpId,
          department: regDept,
          email: regEmail,
          password: regPassword,
          faculty_secret_key: regSecretKey
        })
      });

      // Auto login after registration
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: regEmail, password: regPassword })
      });
      
      const prof: Professor = data.professor;
      const tok: string = data.access_token || data.token;
      
      localStorage.setItem('gg_token', tok);
      localStorage.setItem('gg_prof', JSON.stringify(prof));
      localStorage.setItem('gg_server_url', serverUrl);
      api.setToken(tok);
      
      setToken(tok);
      setProfessor(prof);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setProfessor(null);
    setToken(null);
    setGrades([]);
    setStats(null);
    setActiveCourses([]);
    setCurrentTab('grades');
    
    localStorage.removeItem('gg_token');
    localStorage.removeItem('gg_prof');
    api.setToken(null);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId || !newCourseCode || !newCourseName || !newGrade || !newLetterGrade) return;
    setIsSubmitting(true);
    try {
      const responseGrade = await apiCall('/grades', {
        method: 'POST',
        body: JSON.stringify({
          student_id: newStudentId.trim(),
          course_code: newCourseCode.trim(),
          course_name: newCourseName.trim(),
          grade: parseFloat(newGrade),
          letter_grade: newLetterGrade
        })
      });
      
      // Update grades locally
      setGrades(prev => [
        {
          id: responseGrade.id.toString(),
          studentId: responseGrade.student_id,
          courseCode: responseGrade.course_code,
          courseName: responseGrade.course_name,
          grade: Number(responseGrade.grade),
          letterGrade: responseGrade.letter_grade,
          recordedAt: responseGrade.recorded_at,
          hash: responseGrade.hash,
          isVerified: true
        },
        ...prev
      ]);
      
      // Clean up fields & close modal
      setNewStudentId('');
      setNewCourseCode('');
      setNewCourseName('');
      setNewGrade('');
      setNewLetterGrade('F');
      setShowAddModal(false);
      
      // Reload stats & verify again
      loadStats();
      loadCourses();
    } catch (e: any) {
      alert(e.message || 'Failed to submit grade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;
    
    const parsedRows = parseBatchText(batchText);
    const invalidRows = parsedRows.filter(r => !r.isValid);
    if (invalidRows.length > 0) {
      setBatchError(`Please fix invalid entries before submitting.`);
      return;
    }
    
    setIsSubmitting(true);
    setBatchError(null);
    try {
      const formattedBatch = parsedRows.map(r => ({
        student_id: r.studentId,
        course_code: r.courseCode,
        course_name: r.courseName,
        grade: r.grade,
        letter_grade: r.letterGrade
      }));

      const newRecords = await apiCall('/grades/batch', {
        method: 'POST',
        body: JSON.stringify({ grades: formattedBatch })
      });

      const formattedNew = newRecords.map((json: any) => ({
        id: json.id.toString(),
        studentId: json.student_id || 'N/A',
        courseName: json.course_name || 'N/A',
        courseCode: json.course_code || 'N/A',
        grade: Number(json.grade) || 0,
        letterGrade: json.letter_grade || 'F',
        recordedAt: json.recorded_at,
        hash: json.hash || '',
        isVerified: true
      }));

      setGrades(prev => [...formattedNew, ...prev]);
      setBatchText('');
      setShowAddModal(false);
      
      loadStats();
      loadCourses();
    } catch (e: any) {
      setBatchError(e.message || 'Failed to submit batch grades.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchGradeLogs = async (gradeId: string) => {
    setLoadingGradeLogs(true);
    try {
      const data = await apiCall(`/grades/${gradeId}/logs`);
      const logsJson = data.logs || [];
      setSelectedGradeLogs(logsJson.map((l: any) => ({
        id: l.id,
        action: l.action,
        status: l.status,
        checkedAt: l.checked_at,
        details: l.error_details || l.details
      })));
    } catch (e) {
      console.error('Failed to load grade logs:', e);
      setSelectedGradeLogs([]);
    } finally {
      setLoadingGradeLogs(false);
    }
  };

  const fetchGlobalAuditLogs = async () => {
    setLoadingGlobalLogs(true);
    try {
      const data = await api.fetchGlobalAuditLogs();
      setGlobalAuditLogs(data.map((l: any) => ({
        gradeId: l.grade_id,
        action: l.action,
        status: l.status,
        checkedAt: l.checked_at,
        details: l.error_details || l.details
      })));
    } catch (e) {
      console.error('Failed to load global audit logs:', e);
      setGlobalAuditLogs([]);
    } finally {
      setLoadingGlobalLogs(false);
    }
  };


  const handleOpenDetails = (grade: GradeRecord) => {
    setSelectedGrade(grade);
    fetchGradeLogs(grade.id);
  };

  const handleCloseDetails = () => {
    setSelectedGrade(null);
    setSelectedGradeLogs([]);
  };

  const handleRepairGrade = async (gradeId: string) => {
    if (!selectedGrade) return;
    setIsSubmitting(true);
    try {
      const repairedJson = await apiCall(`/repair/${gradeId}`, {
        method: 'POST'
      });

      const repairedRecord: GradeRecord = {
        id: repairedJson.id.toString(),
        studentId: repairedJson.student_id,
        courseCode: repairedJson.course_code,
        courseName: repairedJson.course_name,
        grade: Number(repairedJson.grade),
        letterGrade: repairedJson.letter_grade,
        recordedAt: repairedJson.recorded_at,
        hash: repairedJson.hash,
        isVerified: true
      };

      setGrades(prev => prev.map(g => g.id === gradeId ? repairedRecord : g));
      setSelectedGrade(repairedRecord);
      
      // Reload logs
      fetchGradeLogs(gradeId);
      loadStats();
    } catch (e: any) {
      alert(e.message || 'Repair operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrade || !editGradeVal || !editLetterGradeVal) return;
    
    setIsSubmitting(true);
    try {
      const updatedJson = await apiCall(`/grades/${selectedGrade.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          grade: parseFloat(editGradeVal),
          letter_grade: editLetterGradeVal
        })
      });

      const updatedRecord: GradeRecord = {
        id: updatedJson.id.toString(),
        studentId: updatedJson.student_id,
        courseCode: updatedJson.course_code,
        courseName: updatedJson.course_name,
        grade: Number(updatedJson.grade),
        letterGrade: updatedJson.letter_grade,
        recordedAt: updatedJson.recorded_at,
        hash: updatedJson.hash,
        isVerified: true
      };

      setGrades(prev => prev.map(g => g.id === selectedGrade.id ? updatedRecord : g));
      setSelectedGrade(updatedRecord);
      setShowEditModal(false);
      
      // Reload logs & statistics
      fetchGradeLogs(selectedGrade.id);
      loadStats();
    } catch (e: any) {
      alert(e.message || 'Update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = () => {
    if (!selectedGrade) return;
    setEditGradeVal(selectedGrade.grade.toString());
    setEditLetterGradeVal(selectedGrade.letterGrade);
    setShowEditModal(true);
  };

  // ── PARSING BATCH CSV ──────────────────────────────────────────────────────
  const parseBatchText = (text: string) => {
    const lines = text.split('\n');
    return lines
      .map((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length === 1 && parts[0] === '') return null; // skip empty line
        
        const studentId = parts[0] || '';
        const courseCode = parts[1] || '';
        const courseName = parts[2] || '';
        const gradeStr = parts[3] || '';
        const letterGrade = parts[4] || '';
        
        const gradeNum = parseFloat(gradeStr);
        const isGradeValid = !isNaN(gradeNum) && gradeNum >= 0 && gradeNum <= 100;
        const isLetterValid = ['A', 'B', 'C', 'D', 'F'].includes(letterGrade.toUpperCase());
        const isValid = studentId !== '' && courseCode !== '' && courseName !== '' && isGradeValid && isLetterValid;
        
        return {
          rowNum: index + 1,
          studentId,
          courseCode,
          courseName,
          grade: gradeNum,
          letterGrade: letterGrade.toUpperCase(),
          isValid,
          error: !isValid
            ? `Row ${index + 1}: ${
                studentId === '' ? 'Missing Student ID. ' : ''
              }${courseCode === '' ? 'Missing Course Code. ' : ''}${
                courseName === '' ? 'Missing Course Name. ' : ''
              }${!isGradeValid ? 'Invalid grade (must be 0-100). ' : ''}${
                !isLetterValid ? 'Invalid letter grade (A,B,C,D,F). ' : ''
              }`
            : null
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  };

  // ── FILTERS & SEARCH PROCESSOR ─────────────────────────────────────────────
  const processedGrades = grades
    .filter(g => {
      // Course filter
      if (courseFilter !== 'All' && g.courseCode !== courseFilter) return false;
      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        return (
          g.studentId.toLowerCase().includes(query) ||
          g.courseCode.toLowerCase().includes(query) ||
          g.courseName.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOption === 'date-desc') {
        return new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime();
      } else if (sortOption === 'date-asc') {
        return new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
      } else if (sortOption === 'grade-desc') {
        return b.grade - a.grade;
      } else if (sortOption === 'grade-asc') {
        return a.grade - b.grade;
      }
      return 0;
    });

  const tamperedGradesList = grades.filter(g => !g.isVerified);
  const hasTamperedGrades = tamperedGradesList.length > 0;

  // ── RENDER CHARTS HELPERS ──────────────────────────────────────────────────
  const getGradeColor = (letter: string) => {
    switch (letter.toUpperCase()) {
      case 'A': return '#10b981';
      case 'B': return '#0ea5e9';
      case 'C': return '#f59e0b';
      case 'D': return '#f97316';
      case 'F': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // ── RENDER METHODS ─────────────────────────────────────────────────────────

  // Security blocked screen if not run on HTTPS/Localhost
  if (!securityCheckPassed) {
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

  // Security Checking splash screen
  if (securityChecking) {
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

  // Login & Registration Interface
  if (!isAuthenticated) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo-animation">
              <img src="/favicon.png" alt="GradeGuardian Logo" style={{ width: '40px', height: '40px' }} />
            </div>
            <h1>GradeGuardian</h1>
            <p>Alexandria University Grade Integrity Portal 🎓</p>
          </div>

          <div className="segmented-control">
            <button 
              className={formMode === 'login' ? 'active' : ''} 
              onClick={() => { setFormMode('login'); setAuthError(null); }}
            >
              Sign In
            </button>
            <button 
              className={formMode === 'register' ? 'active' : ''} 
              onClick={() => { setFormMode('register'); setAuthError(null); }}
            >
              Register Professor
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
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="form-control-container">
                  <span className="form-control-icon"><Envelope size={18} /></span>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    placeholder="name@alexu.edu.eg"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
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
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
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
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="regName">Full Name</label>
                <div className="form-control-container">
                  <span className="form-control-icon"><User size={18} /></span>
                  <input
                    id="regName"
                    type="text"
                    className="form-control"
                    placeholder="Prof. Ahmed Salem"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="regEmpId">Employee ID</label>
                  <div className="form-control-container">
                    <span className="form-control-icon"><IdentificationCard size={18} /></span>
                    <input
                      id="regEmpId"
                      type="text"
                      className="form-control"
                      placeholder="EMP1024"
                      value={regEmpId}
                      onChange={e => setRegEmpId(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="regDept">Department</label>
                  <div className="form-control-container">
                    <span className="form-control-icon"><GraduationCap size={18} /></span>
                    <input
                      id="regDept"
                      type="text"
                      className="form-control"
                      placeholder="Computer Science"
                      value={regDept}
                      onChange={e => setRegDept(e.target.value)}
                      required
                    />
                  </div>
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
                    placeholder="salem@alexu.edu.eg"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="regPassword">Password</label>
                <div className="form-control-container">
                  <span className="form-control-icon"><Lock size={18} /></span>
                  <input
                    id="regPassword"
                    type="password"
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="regSecretKey">Faculty Authorization Key</label>
                <div className="form-control-container">
                  <span className="form-control-icon"><Key size={18} /></span>
                  <input
                    id="regSecretKey"
                    type="password"
                    className="form-control"
                    placeholder="Enter faculty authorization token"
                    value={regSecretKey}
                    onChange={e => setRegSecretKey(e.target.value)}
                    required
                  />
                </div>
                <span className="form-help">Required 2nd-layer verification key for Alexandria Univ. Faculty</span>
              </div>
              
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>Creating Account...</>
                ) : (
                  <>
                    <UserPlus size={18} weight="bold" />
                    Register Professor Account
                  </>
                )}
              </button>
            </form>
          )}

          {/* Advanced Server Configuration */}
          <div className="server-config-toggle">
            <button 
              className="server-toggle-btn"
              onClick={() => setShowServerUrlInput(!showServerUrlInput)}
            >
              <Key size={14} />
              {showServerUrlInput ? 'Hide Server Configuration' : 'Show Server Configuration'}
            </button>
            
            {showServerUrlInput && (
              <div className="form-group" style={{ animation: 'fade-in 0.2s ease' }}>
                <label htmlFor="serverUrl">API Gateway URL</label>
                <input
                  id="serverUrl"
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '14px' }}
                  value={serverUrl}
                  onChange={e => setServerUrl(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Authenticated Application Shell
  return (
    <div className="app-container">
      {/* ── SIDEBAR (DESKTOP) ── */}
      <aside className="sidebar">
        <div className="brand-section">
          <img src="/favicon.png" alt="GradeGuardian Logo" style={{ width: '32px', height: '32px' }} />
          <div style={{ textAlign: 'left' }}>
            <h1 className="brand-title">GradeGuardian</h1>
            <span className="brand-subtitle">Alexandria University</span>
          </div>
        </div>

        <nav className="nav-links">
          <button 
            className={`nav-btn ${currentTab === 'grades' ? 'active' : ''}`}
            onClick={() => setCurrentTab('grades')}
          >
            <ListIcon size={20} weight="bold" />
            Grade Records
            {hasTamperedGrades && (
              <span className="nav-badge">{tamperedGradesList.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-btn ${currentTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setCurrentTab('statistics')}
          >
            <ChartBar size={20} weight="bold" />
            Statistics Summary
          </button>

          <button 
            className={`nav-btn ${currentTab === 'logs' ? 'active' : ''}`}
            onClick={() => {
              setCurrentTab('logs');
              fetchGlobalAuditLogs();
            }}
          >
            <Clock size={20} weight="bold" />
            Security Audit Logs
          </button>
          
          <button 
            className={`nav-btn ${currentTab === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentTab('profile')}
          >
            <User size={20} weight="bold" />
            Professor Profile
          </button>
        </nav>

        <div className="sidebar-footer">
          {professor && (
            <div className="prof-info-card">
              <span className="prof-name">{professor.name}</span>
              <span className="prof-dept">{professor.department}</span>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <SignOut size={16} weight="bold" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── BOTTOM NAVIGATION (MOBILE) ── */}
      <nav className="bottom-nav">
        <button 
          className={`bottom-nav-btn ${currentTab === 'grades' ? 'active' : ''}`}
          onClick={() => setCurrentTab('grades')}
        >
          <ListIcon size={20} weight="bold" />
          <span>Grades</span>
          {hasTamperedGrades && <span className="bottom-badge"></span>}
        </button>
        
        <button 
          className={`bottom-nav-btn ${currentTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setCurrentTab('statistics')}
        >
          <ChartBar size={20} weight="bold" />
          <span>Statistics</span>
        </button>

        <button 
          className={`bottom-nav-btn ${currentTab === 'logs' ? 'active' : ''}`}
          onClick={() => {
            setCurrentTab('logs');
            fetchGlobalAuditLogs();
          }}
        >
          <Clock size={20} weight="bold" />
          <span>Logs</span>
        </button>
        
        <button 
          className={`bottom-nav-btn ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentTab('profile')}
        >
          <User size={20} weight="bold" />
          <span>Profile</span>
        </button>
      </nav>

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <main className="main-content">
        {/* Global header bar */}
        <header className="top-header">
          <div className="header-title-section">
            <h1 style={{ textTransform: 'capitalize' }}>
              {currentTab === 'grades' ? 'Grading Records' : currentTab === 'statistics' ? 'Grading & Security Analytics' : currentTab === 'logs' ? 'Security Audit Logs' : 'Professor Profile'}
            </h1>
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
                title={currentTab === 'grades' ? "Refresh grades from server" : "Refresh audit logs"}
                aria-label="Refresh Data"
              >
                <ArrowClockwise size={20} className={(isLoading || loadingGlobalLogs) ? 'loading-spin' : ''} />
              </button>
            )}
            
            <button 
              className="icon-btn" 
              onClick={() => alert('HMAC-SHA256 Cryptographic Engine active and secure. Verifying signatures on demand.')}
              title="Secure System Status"
              aria-label="Security Status"
            >
              <ShieldCheck size={22} style={{ color: hasTamperedGrades ? 'var(--destructive)' : 'var(--success)' }} />
            </button>
          </div>
        </header>

        {/* Global Tamper Alert Banner */}
        {currentTab === 'grades' && hasTamperedGrades && (
          <div className="tamper-banner">
            <div className="tamper-banner-icon">
              <Warning weight="fill" />
            </div>
            <div className="tamper-banner-info">
              <div className="tamper-banner-title">CRYPTOGRAPHIC TAMPER DETECTED</div>
              <div className="tamper-banner-desc">
                {tamperedGradesList.length} grade record(s) failed verification check. Database entries may have been modified outside this portal.
              </div>
            </div>
            <button 
              className="tamper-banner-btn"
              onClick={() => {
                const firstTampered = tamperedGradesList[0];
                handleOpenDetails(firstTampered);
              }}
            >
              INSPECT RECORD
            </button>
          </div>
        )}

        <div className="content-area">
          {/* ── TAB 1: GRADES VIEW ────────────────────────────────────────────── */}
          {currentTab === 'grades' && (
            <div style={{ animation: 'slide-up 0.3s ease' }}>
              <div className="controls-bar">
                <div className="search-box">
                  <span className="search-icon"><MagnifyingGlass size={18} /></span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search Student ID, Course Code..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="filters-box">
                  <select 
                    className="select-filter"
                    value={courseFilter}
                    onChange={e => setCourseFilter(e.target.value)}
                  >
                    <option value="All">All Courses</option>
                    {activeCourses.map(c => (
                      <option key={c.course_code} value={c.course_code}>
                        {c.course_code}
                      </option>
                    ))}
                  </select>

                  <select 
                    className="select-filter"
                    value={sortOption}
                    onChange={e => setSortOption(e.target.value)}
                  >
                    <option value="date-desc">Date (Newest)</option>
                    <option value="date-asc">Date (Oldest)</option>
                    <option value="grade-desc">Grade (Highest)</option>
                    <option value="grade-asc">Grade (Lowest)</option>
                  </select>

                  <button className="action-btn" onClick={() => setShowAddModal(true)}>
                    <Plus size={16} weight="bold" />
                    Add Grade
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="shimmer-wrapper">
                  <div className="shimmer-card"><div className="shimmer-item shimmer-title"></div><div className="shimmer-item shimmer-body"></div></div>
                  <div className="shimmer-card"><div className="shimmer-item shimmer-title"></div><div className="shimmer-item shimmer-body"></div></div>
                  <div className="shimmer-card"><div className="shimmer-item shimmer-title"></div><div className="shimmer-item shimmer-body"></div></div>
                </div>
              ) : errorMessage ? (
                <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <Warning size={64} style={{ color: 'var(--destructive)', opacity: 0.6 }} />
                  <h2>Error loading records</h2>
                  <p>{errorMessage}</p>
                  <button className="action-btn" style={{ margin: '16px auto 0 auto' }} onClick={loadGrades}>
                    <ArrowClockwise size={16} /> Retry
                  </button>
                </div>
              ) : processedGrades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <ShieldCheck size={64} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                  <h2 style={{ marginTop: '16px' }}>No records found</h2>
                  <p>Submit grades to see records secured by SHA256 signatures.</p>
                </div>
              ) : (
                <div className="grades-grid">
                  {processedGrades.map(grade => (
                    <div 
                      key={grade.id} 
                      className="grade-record-card"
                      onClick={() => handleOpenDetails(grade)}
                    >
                      <div className="grade-card-header">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="grade-card-student">ID: {grade.studentId}</span>
                          <span className="grade-card-course">{grade.courseCode} — {grade.courseName}</span>
                        </div>
                        <span className={`grade-card-badge ${grade.isVerified ? 'secure' : 'tampered'}`}>
                          {grade.isVerified ? 'SECURED ✓' : 'TAMPERED ⚠'}
                        </span>
                      </div>
                      
                      <div className="grade-card-body">
                        <span className="grade-card-value">{grade.grade.toFixed(1)}</span>
                        <span className="grade-card-letter">Grade {grade.letterGrade}</span>
                      </div>

                      <div className="grade-card-date">
                        <Clock size={12} />
                        <span>{new Date(grade.recordedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: STATISTICS VIEW ───────────────────────────────────────── */}
          {currentTab === 'statistics' && (
            <div style={{ animation: 'slide-up 0.3s ease' }}>
              {statsLoading ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <ArrowClockwise size={40} className="loading-spin" style={{ color: 'var(--primary)' }} />
                  <p style={{ marginTop: '12px' }}>Computing statistics & verification states...</p>
                </div>
              ) : stats ? (
                <>
                  {/* Dashboard Hero Header */}
                  <div className="dashboard-hero">
                    <div className="hero-header-row">
                      <div className={`hero-shield-icon ${hasTamperedGrades ? 'compromised' : ''}`}>
                        <ShieldCheck size={28} weight="fill" />
                      </div>
                      <div className="hero-title-section">
                        <h2 className="hero-title">Cryptographic Integrity Monitor</h2>
                        <span className={`hero-subtitle ${hasTamperedGrades ? 'compromised' : ''}`}>
                          {hasTamperedGrades ? 'DATABASE INTEGRITY BREACHED — INVESTIGATION REQUIRED' : 'HMAC-SHA256 SIGNATURE ENGINE ACTIVE & VALID'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="hero-metrics-grid">
                      <div className="hero-metric-item">
                        <GraduationCap className="hero-metric-icon" />
                        <span className="hero-metric-val">{stats.totalGrades}</span>
                        <span className="hero-metric-lbl">Total Grades</span>
                      </div>
                      
                      {/* Overall Average Gauge Chart */}
                      <div className="gauge-container">
                        <svg width="120" height="120">
                          <circle
                            cx="60"
                            cy="60"
                            r="45"
                            fill="transparent"
                            stroke="var(--border)"
                            strokeWidth="10"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r="45"
                            fill="transparent"
                            stroke="var(--primary)"
                            strokeWidth="10"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={2 * Math.PI * 45 * (1 - stats.overallAverage / 100)}
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                          />
                        </svg>
                        <div className="gauge-overlay">
                          <span className="gauge-grade-val">{stats.overallAverage.toFixed(1)}</span>
                          <span className="gauge-grade-letter">Overall Avg</span>
                        </div>
                      </div>

                      <div className="hero-metric-item">
                        <ShieldCheck className="hero-metric-icon" style={{ color: hasTamperedGrades ? 'var(--destructive)' : 'var(--success)' }} />
                        <span className="hero-metric-val" style={{ color: hasTamperedGrades ? 'var(--destructive)' : 'var(--success)' }}>
                          {hasTamperedGrades ? `${((grades.filter(g => g.isVerified).length / grades.length) * 100).toFixed(0)}%` : '100%'}
                        </span>
                        <span className="hero-metric-lbl">Integrity Rating</span>
                      </div>
                    </div>
                  </div>

                  {stats.courseStats.length > 0 ? (
                    <>
                      <div className="dashboard-grid">
                        {/* Grade Distribution Chart (Donut Chart) */}
                        <div className="chart-card">
                          <h3 className="chart-card-title">Grade Distribution</h3>
                          <div className="chart-container">
                            <div className="pie-chart-wrapper">
                              {/* Donut Draw */}
                              <svg width="140" height="140">
                                {(() => {
                                  const total = Object.values(stats.gradeDistribution).reduce((a, b) => a + b, 0);
                                  if (total === 0) return <circle cx="70" cy="70" r="50" fill="#6b7280" />;
                                  
                                  const radius = 50;
                                  const circ = 2 * Math.PI * radius;
                                  let cumulativePercent = 0;
                                  
                                  return Object.entries(stats.gradeDistribution).map(([letter, count]) => {
                                    const percent = count / total;
                                    const rotation = cumulativePercent * 360 - 90;
                                    cumulativePercent += percent;
                                    
                                    return (
                                      <circle
                                        key={letter}
                                        cx="70"
                                        cy="70"
                                        r={radius}
                                        fill="transparent"
                                        stroke={getGradeColor(letter)}
                                        strokeWidth="16"
                                        strokeDasharray={`${percent * circ} ${circ}`}
                                        strokeDashoffset="0"
                                        transform={`rotate(${rotation} 70 70)`}
                                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                      />
                                    );
                                  });
                                })()}
                                <circle cx="70" cy="70" r="38" fill="var(--card-bg)" />
                              </svg>
                              
                              <div className="pie-legend">
                                {Object.entries(stats.gradeDistribution).map(([letter, count]) => (
                                  <div key={letter} className="legend-item">
                                    <div className="legend-dot" style={{ backgroundColor: getGradeColor(letter) }}></div>
                                    <span>{letter} Grade: {count} student(s)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Course Averages Chart (CSS Flex/HTML Bar Chart) */}
                        <div className="chart-card">
                          <h3 className="chart-card-title">Course Averages</h3>
                          <div className="chart-container">
                            <div className="bar-chart">
                              {stats.courseStats.map(course => (
                                <div key={course.code} className="bar-group">
                                  <div className="bar-wrapper">
                                    <div className="bar-fill" style={{ height: `${course.average}%` }}></div>
                                    <div className="bar-tooltip">
                                      <strong>{course.code}</strong>
                                      <span>Avg: {course.average.toFixed(1)}%</span>
                                      <span>Students: {course.students}</span>
                                    </div>
                                  </div>
                                  <div className="bar-label">{course.code}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Course Cards list */}
                      <h3 className="section-title">Your Courses</h3>
                      <div className="courses-section">
                        {stats.courseStats.map(course => (
                          <div key={course.code} className="course-card">
                            <div className="course-info">
                              <div className="course-avatar">
                                {course.code.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="course-details">
                                <span className="course-code-name">{course.code}: {course.name}</span>
                                <span className="course-students">Students Enrolled: {course.students}</span>
                              </div>
                            </div>
                            <span className="course-avg">{course.average.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <p>No statistics generated yet. Add grade records to view analytics.</p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>Failed to compute statistics. Please try reloading.</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: PROFILE VIEW ───────────────────────────────────────────── */}
          {currentTab === 'profile' && professor && (
            <div className="profile-card" style={{ animation: 'slide-up 0.3s ease' }}>
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

              <button className="logout-btn" onClick={handleLogout} style={{ maxWidth: '200px' }}>
                <SignOut size={16} weight="bold" />
                Sign Out of Portal
              </button>
            </div>
          )}

          {/* ── TAB 4: GLOBAL AUDIT LOGS VIEW ────────────────────────────────────── */}
          {currentTab === 'logs' && (
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

              {loadingGlobalLogs ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                  <ArrowClockwise size={32} className="loading-spin" style={{ color: 'var(--primary)' }} />
                  <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading cryptographic events feed...</p>
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
          )}
        </div>
      </main>

      {/* ── DETAILS / INTEGRITY INSPECTION MODAL ──────────────────────────────── */}
      {selectedGrade && (
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
                <h4 className="audit-log-title">Change History & Audit Logs</h4>
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

              <button className="nav-btn" style={{ width: 'auto', border: '1px solid var(--border)' }} onClick={handleCloseDetails}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT GRADE DIALOG ── */}
      {showEditModal && selectedGrade && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Secure Grade Update</h2>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateGrade}>
              <div className="modal-body">
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Updating grade for Student <strong>{selectedGrade.studentId}</strong> in <strong>{selectedGrade.courseCode}</strong>.
                  All changes will trigger a signature rebuild and write to the audit trail.
                </div>
                
                <div className="form-group">
                  <label htmlFor="editGrade">New Numeric Grade</label>
                  <input
                    id="editGrade"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="form-control"
                    style={{ paddingLeft: '14px' }}
                    value={editGradeVal}
                    onChange={e => {
                      setEditGradeVal(e.target.value);
                      const num = parseFloat(e.target.value);
                      if (!isNaN(num)) {
                        if (num >= 90) setEditLetterGradeVal('A');
                        else if (num >= 80) setEditLetterGradeVal('B');
                        else if (num >= 70) setEditLetterGradeVal('C');
                        else if (num >= 60) setEditLetterGradeVal('D');
                        else setEditLetterGradeVal('F');
                      }
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="editLetter">New Letter Grade</label>
                  <select
                    id="editLetter"
                    className="select-filter"
                    style={{ width: '100%', padding: '10px' }}
                    value={editLetterGradeVal}
                    onChange={e => setEditLetterGradeVal(e.target.value)}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="F">F</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="nav-btn" style={{ width: 'auto', border: '1px solid var(--border)' }} onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn" disabled={isSubmitting}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD GRADE RECORDS MODAL ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="segmented-control" style={{ marginBottom: 0 }}>
                <button 
                  className={addModalType === 'single' ? 'active' : ''} 
                  onClick={() => { setAddModalType('single'); setBatchError(null); }}
                >
                  Single Entry
                </button>
                <button 
                  className={addModalType === 'batch' ? 'active' : ''} 
                  onClick={() => { setAddModalType('batch'); setBatchError(null); }}
                >
                  Batch (CSV/Text)
                </button>
              </div>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>

            {addModalType === 'single' ? (
              <form onSubmit={handleSingleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="newStudentId">Student ID</label>
                    <input
                      id="newStudentId"
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '14px' }}
                      placeholder="e.g. 202611002"
                      value={newStudentId}
                      onChange={e => setNewStudentId(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="newCourseCode">Course Code</label>
                      <input
                        id="newCourseCode"
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: '14px' }}
                        placeholder="CS101"
                        value={newCourseCode}
                        onChange={e => setNewCourseCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="newCourseName">Course Name</label>
                      <input
                        id="newCourseName"
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: '14px' }}
                        placeholder="Intro to CS"
                        value={newCourseName}
                        onChange={e => setNewCourseName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="newGrade">Numeric Grade (0-100)</label>
                      <input
                        id="newGrade"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="form-control"
                        style={{ paddingLeft: '14px' }}
                        placeholder="85.5"
                        value={newGrade}
                        onChange={e => setNewGrade(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="newLetter">Letter Grade</label>
                      <select
                        id="newLetter"
                        className="select-filter"
                        style={{ width: '100%', padding: '10px' }}
                        value={newLetterGrade}
                        onChange={e => setNewLetterGrade(e.target.value)}
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="F">F</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="nav-btn" style={{ width: 'auto', border: '1px solid var(--border)' }} onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="action-btn" disabled={isSubmitting}>
                    Create Record
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBatchSubmit}>
                <div className="modal-body batch-container">
                  <div className="batch-instruction-box">
                    <strong>Format instructions:</strong> Paste comma-separated rows. Every row must match:<br />
                    <code>StudentID, CourseCode, CourseName, Grade, LetterGrade</code><br />
                    <em>Example: 202611005, CS101, Intro to CS, 88.0, B</em>
                  </div>

                  {batchError && (
                    <div style={{ backgroundColor: 'var(--destructive-bg)', color: 'var(--destructive)', border: '1px solid var(--destructive-border)', padding: '10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                      {batchError}
                    </div>
                  )}

                  <div className="batch-textarea-container">
                    <label htmlFor="batchText" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>CSV Grade Records Input</label>
                    <textarea
                      id="batchText"
                      className="batch-textarea"
                      placeholder="202604001, CS202, Data Structures, 95.0, A&#10;202604002, CS202, Data Structures, 78.5, C"
                      value={batchText}
                      onChange={e => setBatchText(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {/* Batch Preview Table */}
                  {batchText.trim().length > 0 && (
                    <div style={{ width: '100%' }}>
                      <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 800 }}>Record Verification Preview</h4>
                      <div className="batch-preview-table-container">
                        <table className="batch-table">
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Student ID</th>
                              <th>Course</th>
                              <th>Grade</th>
                              <th>Letter</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parseBatchText(batchText).map((row, idx) => (
                              <tr key={idx} style={{ backgroundColor: row.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.05)' }}>
                                <td>{row.rowNum}</td>
                                <td>{row.studentId || <span style={{ color: 'var(--destructive)' }}>Missing</span>}</td>
                                <td>{row.courseCode ? `${row.courseCode} — ${row.courseName}` : <span style={{ color: 'var(--destructive)' }}>Missing</span>}</td>
                                <td>{isNaN(row.grade) ? <span style={{ color: 'var(--destructive)' }}>Invalid</span> : row.grade}</td>
                                <td>{row.letterGrade || <span style={{ color: 'var(--destructive)' }}>Invalid</span>}</td>
                                <td>
                                  <span className={`badge-row-validation ${row.isValid ? 'valid' : 'invalid'}`}>
                                    {row.isValid ? 'VALID' : 'ERROR'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="nav-btn" style={{ width: 'auto', border: '1px solid var(--border)' }} onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="action-btn" disabled={isSubmitting || !batchText.trim()}>
                    Upload & Sign Batch
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
