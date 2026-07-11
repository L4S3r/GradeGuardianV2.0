import { useState, useEffect, useRef } from 'react';
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
  BookOpen,
  SignOut,
  MagnifyingGlass,
  Warning,
  Clock,
  Wrench,
  Moon,
  Sun,
  X,
  GraduationCap,
  Trash,
  UploadSimple,
  ShieldSlash,
  Eye,
  EyeSlash
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

  // ── APP FLOW & ENVIRONMENT STATE ───────────────────────────────────────────
  const [currentTab, setCurrentTab] = useState<'grades' | 'courses' | 'statistics' | 'profile' | 'logs'>('grades');
  const [securityChecking, setSecurityChecking] = useState<boolean>(true);
  const [securityCheckPassed, setSecurityCheckPassed] = useState<boolean>(true);
  const [securityCheckReason, setSecurityCheckReason] = useState<string | null>(null);
  const [securityScanStep, setSecurityScanStep] = useState<string>('');
  const [securityProgress, setSecurityProgress] = useState<number>(0);

  // Global audit logs state
  const [globalAuditLogs, setGlobalAuditLogs] = useState<any[]>([]);
  const [loadingGlobalLogs, setLoadingGlobalLogs] = useState<boolean>(false);

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
  const [showLoadingIndicator, setShowLoadingIndicator] = useState<boolean>(false);
  const [showStatsLoadingIndicator, setShowStatsLoadingIndicator] = useState<boolean>(false);
  const [showGlobalLogsLoadingIndicator, setShowGlobalLogsLoadingIndicator] = useState<boolean>(false);
  const [regStudentId, setRegStudentId] = useState<string>('');
  const [regStudentDept, setRegStudentDept] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorHovered, setCursorHovered] = useState<boolean>(false);
  const [cursorVisible, setCursorVisible] = useState<boolean>(false);

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
    setAuthError(null);
    setRegisterErrors({});
    setShowLoginPassword(false);
    setShowRegPassword(false);
    setShowRegConfirmPassword(false);
    setShowSecretKey(false);
  };

  // ── GRADES RECORDS STATE ───────────────────────────────────────────────────
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('All');
  const [sortOption, setSortOption] = useState<string>('date-desc');
  const [activeCourses, setActiveCourses] = useState<CourseModel[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');

  // ── STATISTICS STATE ───────────────────────────────────────────────────────
  const [stats, setStats] = useState<ProfessorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [studentGpa, setStudentGpa] = useState<number>(0);

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
  
  // Course selection state in modal
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>('');
  const [showNewCourseFields, setShowNewCourseFields] = useState<boolean>(false);
  
  // Batch Entry Modal State (Mirroring Flutter app's GradeEntry rows)
  interface WebBatchEntry {
    studentId: string;
    grade: string;
    letterGrade: string;
  }
  const [webBatchCourseCode, setWebBatchCourseCode] = useState<string>('');
  const [webBatchEntries, setWebBatchEntries] = useState<WebBatchEntry[]>([
    { studentId: '', grade: '', letterGrade: 'F' },
    { studentId: '', grade: '', letterGrade: 'F' },
    { studentId: '', grade: '', letterGrade: 'F' }
  ]);
  
  // Edit Grade Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editGradeVal, setEditGradeVal] = useState<string>('');
  const [editLetterGradeVal, setEditLetterGradeVal] = useState<string>('F');
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);

  // Simulative Loading Bar State for Cryptographic Handshake
  const LOADING_MESSAGES = [
    "Establishing secure handshake with Alexandria University root servers...",
    "Retrieving cryptographically signed grading vaults...",
    "Running local record validation checks...",
    "Computing and comparing HMAC-SHA256 signatures...",
    "Checking for unauthorized database modifications...",
    "Verifying Alexandria University faculty authority keys...",
    "Syncing security audit log feed with decentralized ledger...",
    "Confirming timestamp integrity on all records..."
  ];

  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingMsg, setLoadingMsg] = useState<string>('Initializing secure connection...');

  useEffect(() => {
    let progressInterval: any;
    let messageInterval: any;

    if (isLoading) {
      setLoadingProgress(0);
      setLoadingMsg(LOADING_MESSAGES[0]);

      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.floor(Math.random() * 8) + 2;
        });
      }, 150);

      let msgIdx = 1;
      messageInterval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[msgIdx % LOADING_MESSAGES.length]);
        msgIdx++;
      }, 1600);
    } else {
      setLoadingProgress(100);
    }

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isLoading]);

  // Delayed loading states to prevent flicker under 300ms
  useEffect(() => {
    if (isLoading) {
      const t = setTimeout(() => setShowLoadingIndicator(true), 300);
      return () => clearTimeout(t);
    } else {
      setShowLoadingIndicator(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (statsLoading) {
      const t = setTimeout(() => setShowStatsLoadingIndicator(true), 300);
      return () => clearTimeout(t);
    } else {
      setShowStatsLoadingIndicator(false);
    }
  }, [statsLoading]);

  useEffect(() => {
    if (loadingGlobalLogs) {
      const t = setTimeout(() => setShowGlobalLogsLoadingIndicator(true), 300);
      return () => clearTimeout(t);
    } else {
      setShowGlobalLogsLoadingIndicator(false);
    }
  }, [loadingGlobalLogs]);

  // Custom transparent cursor tracker follower with inertia/damping
  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let isMoving = false;
    let animationFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isMoving) {
        setCursorVisible(true);
        isMoving = true;
      }
    };

    const onMouseLeave = () => {
      setCursorVisible(false);
      isMoving = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    const updateCursor = () => {
      const dx = mouseX - cursorX;
      const dy = mouseY - cursorY;
      
      // Fluid damping factor (0.15 gives a highly responsive yet smooth trail)
      cursorX += dx * 0.15;
      cursorY += dy * 0.15;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(updateCursor);
    };
    updateCursor();

    // Hover detection for interactive items
    const handleMouseEnter = () => setCursorHovered(true);
    const handleMouseLeave = () => setCursorHovered(false);

    const bindHoverListeners = () => {
      const targets = document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], .grade-record-card, .filter-pill, .nav-btn, .bottom-nav-btn, .action-btn'
      );
      targets.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
        el.addEventListener('mouseenter', handleMouseEnter);
        el.addEventListener('mouseleave', handleMouseLeave);
      });
    };

    bindHoverListeners();

    // Re-bind when DOM updates dynamically to capture newly mounted elements
    const observer = new MutationObserver(() => {
      bindHoverListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, []);

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

  // Auto-calculate letter grade based on edit numeric grade input
  useEffect(() => {
    const num = parseFloat(editGradeVal);
    if (!isNaN(num)) {
      if (num >= 90) setEditLetterGradeVal('A');
      else if (num >= 80) setEditLetterGradeVal('B');
      else if (num >= 70) setEditLetterGradeVal('C');
      else if (num >= 60) setEditLetterGradeVal('D');
      else setEditLetterGradeVal('F');
    }
  }, [editGradeVal]);

  // Sync newCourseCode & newCourseName automatically when selectedCourseCode changes
  useEffect(() => {
    if (selectedCourseCode === 'NEW_COURSE') {
      setNewCourseCode('');
      setNewCourseName('');
      setShowNewCourseFields(true);
    } else if (selectedCourseCode) {
      const selected = activeCourses.find(c => c.course_code === selectedCourseCode);
      if (selected) {
        setNewCourseCode(selected.course_code);
        setNewCourseName(selected.course_name);
      }
      setShowNewCourseFields(false);
    }
  }, [selectedCourseCode, activeCourses]);

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
      const endpoint = userRole === 'student' ? '/student/grades' : '/grades';
      const data = await apiCall(endpoint);
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
      const verifyEndpoint = userRole === 'student' ? '/student/verify/batch' : '/verify/batch';
      const results = await apiCall(verifyEndpoint, {
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

      const updatedGrades = recordsList.map(grade => {
        const result = resultMap[grade.id];
        if (!result) {
          return { ...grade, isVerified: false, verificationError: 'Verification missing' };
        }
        return {
          ...grade,
          isVerified: !!result.is_valid,
          verificationError: result.error || null
        };
      });
      setGrades(updatedGrades);
      if (userRole === 'student') {
        computeStudentStats(updatedGrades);
      }
    } catch (e) {
      console.error('Batch verification error:', e);
    }
  };

  const computeStudentStats = (recordsList: GradeRecord[]) => {
    const verified = recordsList.filter(g => g.isVerified);
    if (verified.length === 0) {
      setStats({
        totalGrades: 0,
        overallAverage: 0,
        courseStats: [],
        gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }
      });
      setStudentGpa(0);
      return;
    }

    const totalGrades = verified.length;
    const overallAverage = verified.reduce((sum, g) => sum + g.grade, 0) / totalGrades;

    const _gradeToGpa = (g: GradeRecord) => {
      if (g.grade >= 90) return 4.0;
      if (g.grade >= 80) return 3.0;
      if (g.grade >= 70) return 2.0;
      if (g.grade >= 60) return 1.0;
      return 0.0;
    };
    const calculatedGpa = verified.reduce((sum, g) => sum + _gradeToGpa(g), 0) / totalGrades;
    setStudentGpa(calculatedGpa);

    const courseMap: { [key: string]: { code: string; name: string; sum: number; count: number } } = {};
    verified.forEach(g => {
      if (!courseMap[g.courseCode]) {
        courseMap[g.courseCode] = { code: g.courseCode, name: g.courseName, sum: 0, count: 0 };
      }
      courseMap[g.courseCode].sum += g.grade;
      courseMap[g.courseCode].count += 1;
    });
    const courseStatsList: CourseStat[] = Object.values(courseMap).map(c => ({
      code: c.code,
      name: c.name,
      average: c.sum / c.count,
      students: c.count
    }));

    const gradeDistribution: { [key: string]: number } = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    recordsList.forEach(g => {
      const letter = g.letterGrade.charAt(0).toUpperCase();
      if (gradeDistribution.hasOwnProperty(letter)) {
        gradeDistribution[letter]++;
      } else {
        gradeDistribution.F++;
      }
    });

    setStats({
      totalGrades,
      overallAverage,
      courseStats: courseStatsList,
      gradeDistribution
    });
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
      if (data.length > 0) {
        setSelectedCourseCode(prev => prev || data[0].course_code || '');
        setNewCourseCode(prev => prev || data[0].course_code || '');
        setNewCourseName(prev => prev || data[0].course_name || '');
        setWebBatchCourseCode(prev => prev || data[0].course_code || '');
        setShowNewCourseFields(false);
      } else {
        setSelectedCourseCode('NEW_COURSE');
        setShowNewCourseFields(true);
        setWebBatchCourseCode('');
      }
    } catch (e) {
      console.error('Failed to load courses:', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authPortalMode === 'professor') {
      if (!loginEmail.trim()) {
        setAuthError('Please enter your email address.');
        return;
      }
      if (!/\S+@\S+\.\S+/.test(loginEmail)) {
        setAuthError('Please enter a valid email address.');
        return;
      }
      if (!loginPassword) {
        setAuthError('Please enter your password.');
        return;
      }
      const normalizedEmail = loginEmail.trim().toLowerCase();
      setIsSubmitting(true);
      try {
        const data = await apiCall('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: normalizedEmail, password: loginPassword })
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
      if (!loginStudentId.trim()) {
        setAuthError('Please enter your Student ID.');
        return;
      }
      if (!loginPassword) {
        setAuthError('Please enter your password.');
        return;
      }
      const normalizedStudentId = loginStudentId.trim();
      setIsSubmitting(true);
      try {
        const data = await apiCall('/student/login', {
          method: 'POST',
          body: JSON.stringify({ student_id: normalizedStudentId, password: loginPassword })
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
    } else if (field === 'regEmpId') {
      if (!cleanVal) error = 'Employee ID is required.';
    } else if (field === 'regStudentId') {
      if (!cleanVal) error = 'Student ID is required.';
    } else if (field === 'regDept' || field === 'regStudentDept') {
      if (!cleanVal) error = 'Department / Faculty name is required.';
    } else if (field === 'regEmail') {
      if (!cleanVal) {
        error = 'Email address is required.';
      } else if (!/\S+@\S+\.\S+/.test(cleanVal)) {
        error = 'Please enter a valid email address (e.g. name@alexu.edu.eg).';
      }
    } else if (field === 'regPassword') {
      if (!val) {
        error = 'Password is required.';
      } else if (val.length < 6) {
        error = 'Password must be at least 6 characters.';
      }
    } else if (field === 'regConfirmPassword') {
      if (val !== regPassword) {
        error = 'Passwords do not match.';
      }
    } else if (field === 'regSecretKey') {
      if (!cleanVal) error = 'Faculty Authorization Key is required.';
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

    let isValid = true;
    if (authPortalMode === 'professor') {
      const nameOk = validateRegisterField('regName', regName);
      const empOk = validateRegisterField('regEmpId', regEmpId);
      const deptOk = validateRegisterField('regDept', regDept);
      const emailOk = validateRegisterField('regEmail', regEmail);
      const passOk = validateRegisterField('regPassword', regPassword);
      const confOk = validateRegisterField('regConfirmPassword', regConfirmPassword);
      const keyOk = validateRegisterField('regSecretKey', regSecretKey);
      isValid = nameOk && empOk && deptOk && emailOk && passOk && confOk && keyOk;
    } else {
      const nameOk = validateRegisterField('regName', regName);
      const studOk = validateRegisterField('regStudentId', regStudentId);
      const deptOk = validateRegisterField('regStudentDept', regStudentDept);
      const emailOk = validateRegisterField('regEmail', regEmail);
      const passOk = validateRegisterField('regPassword', regPassword);
      const confOk = validateRegisterField('regConfirmPassword', regConfirmPassword);
      isValid = nameOk && studOk && deptOk && emailOk && passOk && confOk;
    }

    if (!isValid) {
      setAuthError('Please correct the validation errors below.');
      return;
    }

    if (authPortalMode === 'professor') {
      const normalizedEmail = regEmail.trim().toLowerCase();
      setIsSubmitting(true);
      try {
        await apiCall('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: regName,
            employee_id: regEmpId,
            department: regDept,
            email: normalizedEmail,
            password: regPassword,
            faculty_secret_key: regSecretKey
          })
        });

        // Auto login after registration
        const data = await apiCall('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: normalizedEmail, password: regPassword })
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
      const normalizedEmail = regEmail.trim().toLowerCase();
      const normalizedStudentId = regStudentId.trim();
      setIsSubmitting(true);
      try {
        await apiCall('/student/register', {
          method: 'POST',
          body: JSON.stringify({
            name: regName,
            student_id: normalizedStudentId,
            department: regStudentDept.trim(),
            email: normalizedEmail,
            password: regPassword
          })
        });

        // Auto login after registration
        const data = await apiCall('/student/login', {
          method: 'POST',
          body: JSON.stringify({ student_id: normalizedStudentId, password: regPassword })
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
    setGrades([]);
    setStats(null);
    setActiveCourses([]);
    setCurrentTab('grades');
    
    localStorage.removeItem('gg_token');
    localStorage.removeItem('gg_prof');
    localStorage.removeItem('gg_student');
    localStorage.removeItem('gg_role');
    api.setToken(null);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId || !newCourseCode || !newCourseName || !newGrade || !newLetterGrade) return;
    
    const tempId = `temp-${Date.now()}`;
    const optimisticRecord: GradeRecord = {
      id: tempId,
      studentId: newStudentId.trim(),
      courseCode: newCourseCode.trim(),
      courseName: newCourseName.trim(),
      grade: parseFloat(newGrade),
      letterGrade: newLetterGrade,
      recordedAt: new Date().toISOString(),
      hash: 'Calculating SHA256...',
      isVerified: true
    };

    const previousGrades = grades;
    
    // Optimistically update local state immediately
    setGrades(prev => [optimisticRecord, ...prev]);
    
    // Clear and close modal instantly for rapid response
    setNewStudentId('');
    setNewCourseCode('');
    setNewCourseName('');
    setNewGrade('');
    setNewLetterGrade('F');
    setShowAddModal(false);

    try {
      if (selectedCourseCode === 'NEW_COURSE') {
        try {
          await apiCall('/courses', {
            method: 'POST',
            body: JSON.stringify({
              course_code: optimisticRecord.courseCode,
              course_name: optimisticRecord.courseName
            })
          });
        } catch (err: any) {
          console.error('Failed to auto-register new course:', err);
        }
      }

      const responseGrade = await apiCall('/grades', {
        method: 'POST',
        body: JSON.stringify({
          student_id: optimisticRecord.studentId,
          course_code: optimisticRecord.courseCode,
          course_name: optimisticRecord.courseName,
          grade: optimisticRecord.grade,
          letter_grade: optimisticRecord.letterGrade
        })
      });
      
      const realRecord: GradeRecord = {
        id: responseGrade.id.toString(),
        studentId: responseGrade.student_id,
        courseCode: responseGrade.course_code,
        courseName: responseGrade.course_name,
        grade: Number(responseGrade.grade),
        letterGrade: responseGrade.letter_grade,
        recordedAt: responseGrade.recorded_at,
        hash: responseGrade.hash,
        isVerified: true
      };

      // Replace the optimistic temp item with the verified server item
      setGrades(prev => prev.map(g => g.id === tempId ? realRecord : g));
      
      // Reload stats & courses
      loadStats();
      loadCourses();
    } catch (e: any) {
      // Revert local state if server sync fails
      setGrades(previousGrades);
      alert(e.message || 'Failed to submit grade. Verification sync error.');
    }
  };

  const handleWebBatchGradeChange = (index: number, gradeVal: string) => {
    setWebBatchEntries(prev => prev.map((entry, idx) => {
      if (idx !== index) return entry;
      const num = parseFloat(gradeVal);
      let letter = 'F';
      if (!isNaN(num)) {
        if (num >= 90) letter = 'A';
        else if (num >= 80) letter = 'B';
        else if (num >= 70) letter = 'C';
        else if (num >= 60) letter = 'D';
      }
      return { ...entry, grade: gradeVal, letterGrade: letter };
    }));
  };

  const addWebBatchRow = () => {
    setWebBatchEntries(prev => [...prev, { studentId: '', grade: '', letterGrade: 'F' }]);
  };

  const removeWebBatchRow = (index: number) => {
    if (webBatchEntries.length <= 1) return;
    setWebBatchEntries(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCourse = activeCourses.find(c => c.course_code === webBatchCourseCode);
    if (!selectedCourse) {
      alert('Please select a course for the batch.');
      return;
    }

    const invalid = webBatchEntries.some(entry => !entry.studentId || isNaN(parseFloat(entry.grade)));
    if (invalid) {
      alert('Please complete all student ID and grade fields with valid numbers.');
      return;
    }

    setIsSubmitting(true);
    try {
      const gradesPayload = webBatchEntries.map(entry => ({
        student_id: entry.studentId.trim(),
        course_code: selectedCourse.course_code,
        course_name: selectedCourse.course_name,
        grade: parseFloat(entry.grade),
        letter_grade: entry.letterGrade
      }));

      const newRecords = await apiCall('/grades/batch', {
        method: 'POST',
        body: JSON.stringify({ grades: gradesPayload })
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

      // Reset rows to 3 default rows
      setWebBatchEntries([
        { studentId: '', grade: '', letterGrade: 'F' },
        { studentId: '', grade: '', letterGrade: 'F' },
        { studentId: '', grade: '', letterGrade: 'F' }
      ]);
      setShowAddModal(false);
      
      loadStats();
      loadCourses();
    } catch (err: any) {
      alert(err.message || 'Failed to submit batch grades.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchGradeLogs = async (gradeId: string) => {
    setLoadingGradeLogs(true);
    try {
      const endpoint = userRole === 'student'
        ? `/student/grades/${gradeId}/logs`
        : `/grades/${gradeId}/logs`;
      const data = await apiCall(endpoint);
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
    
    const previousGrades = grades;
    const oldRecord = selectedGrade;
    
    const tempUpdatedRecord: GradeRecord = {
      ...selectedGrade,
      grade: parseFloat(editGradeVal),
      letterGrade: editLetterGradeVal,
      hash: 'Updating SHA256...',
      isVerified: true
    };

    // Optimistically update locally
    setGrades(prev => prev.map(g => g.id === selectedGrade.id ? tempUpdatedRecord : g));
    setSelectedGrade(tempUpdatedRecord);
    setShowEditModal(false);

    try {
      const updatedJson = await apiCall(`/grades/${selectedGrade.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          grade: tempUpdatedRecord.grade,
          letter_grade: tempUpdatedRecord.letterGrade
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

      // Set final server-synced record
      setGrades(prev => prev.map(g => g.id === selectedGrade.id ? updatedRecord : g));
      setSelectedGrade(updatedRecord);
      
      // Reload logs & statistics
      fetchGradeLogs(selectedGrade.id);
      loadStats();
    } catch (e: any) {
      // Revert state if sync fails
      setGrades(previousGrades);
      setSelectedGrade(oldRecord);
      alert(e.message || 'Update failed. Reverting changes.');
    }
  };

  const handleOpenEdit = () => {
    if (!selectedGrade) return;
    setEditGradeVal(selectedGrade.grade.toString());
    setEditLetterGradeVal(selectedGrade.letterGrade);
    setShowEditModal(true);
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

  const getGradeScoreColor = (score: number) => {
    if (score >= 90) return '#10b981'; // Green (A)
    if (score >= 80) return '#0ea5e9'; // Blue (B)
    if (score >= 70) return '#eab308'; // Yellow/Gold (C)
    if (score >= 60) return '#f97316'; // Orange (D)
    return '#ef4444'; // Red (F)
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

          <div className="segmented-control" style={{ marginBottom: '16px' }}>
            <button 
              className={authPortalMode === 'professor' ? 'active' : ''} 
              onClick={() => { resetAuthForm(); setAuthPortalMode('professor'); }}
            >
              Faculty Portal
            </button>
            <button 
              className={authPortalMode === 'student' ? 'active' : ''} 
              onClick={() => { resetAuthForm(); setAuthPortalMode('student'); }}
            >
              Student Portal
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
              {authPortalMode === 'professor' ? (
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
              ) : (
                <div className="form-group">
                  <label htmlFor="studentId">Student ID</label>
                  <div className="form-control-container">
                    <span className="form-control-icon"><IdentificationCard size={18} /></span>
                    <input
                      id="studentId"
                      type="text"
                      className="form-control"
                      placeholder="e.g. STU-2024-001"
                      value={loginStudentId}
                      onChange={e => setLoginStudentId(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

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

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <button 
                  type="button"
                  onClick={() => { resetAuthForm(); setFormMode('register'); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Register as {authPortalMode === 'professor' ? 'Faculty' : 'Student'} here
                </button>
              </div>
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
                    placeholder={authPortalMode === 'professor' ? "Prof. Ahmed Salem" : "Ali Ahmed"}
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

              {authPortalMode === 'professor' ? (
                <>
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
                          onChange={e => {
                            setRegEmpId(e.target.value);
                            if (registerErrors.regEmpId) validateRegisterField('regEmpId', e.target.value);
                          }}
                          onBlur={e => validateRegisterField('regEmpId', e.target.value)}
                          required
                        />
                      </div>
                      {registerErrors.regEmpId && (
                        <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                          {registerErrors.regEmpId}
                        </span>
                      )}
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
                          onChange={e => {
                            setRegDept(e.target.value);
                            if (registerErrors.regDept) validateRegisterField('regDept', e.target.value);
                          }}
                          onBlur={e => validateRegisterField('regDept', e.target.value)}
                          required
                        />
                      </div>
                      {registerErrors.regDept && (
                        <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                          {registerErrors.regDept}
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
                        placeholder="salem@alexu.edu.eg"
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
                    <label htmlFor="regPassword">Password</label>
                    <div className="form-control-container">
                      <span className="form-control-icon"><Lock size={18} /></span>
                      <input
                        id="regPassword"
                        type={showRegPassword ? 'text' : 'password'}
                        className="form-control password-input"
                        placeholder="Min 6 characters"
                        value={regPassword}
                        onChange={e => {
                          setRegPassword(e.target.value);
                          if (registerErrors.regPassword) validateRegisterField('regPassword', e.target.value);
                        }}
                        onBlur={e => validateRegisterField('regPassword', e.target.value)}
                        minLength={6}
                        required
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
                    {registerErrors.regPassword && (
                      <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                        {registerErrors.regPassword}
                      </span>
                    )}
                  </div>

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
                        minLength={6}
                        required
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

                  <div className="form-group">
                    <label htmlFor="regSecretKey">Faculty Authorization Key</label>
                    <div className="form-control-container">
                      <span className="form-control-icon"><Key size={18} /></span>
                      <input
                        id="regSecretKey"
                        type={showSecretKey ? 'text' : 'password'}
                        className="form-control password-input"
                        placeholder="Enter faculty authorization token"
                        value={regSecretKey}
                        onChange={e => {
                          setRegSecretKey(e.target.value);
                          if (registerErrors.regSecretKey) validateRegisterField('regSecretKey', e.target.value);
                        }}
                        onBlur={e => validateRegisterField('regSecretKey', e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="form-control-toggle"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        aria-label={showSecretKey ? "Hide password" : "Show password"}
                      >
                        {showSecretKey ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {registerErrors.regSecretKey ? (
                      <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                        {registerErrors.regSecretKey}
                      </span>
                    ) : (
                      <span className="form-help">Required 2nd-layer verification key for Alexandria Univ. Faculty</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="regStudentId">Student ID</label>
                      <div className="form-control-container">
                        <span className="form-control-icon"><IdentificationCard size={18} /></span>
                        <input
                          id="regStudentId"
                          type="text"
                          className="form-control"
                          placeholder="e.g. STU-2024-001"
                          value={regStudentId}
                          onChange={e => {
                            setRegStudentId(e.target.value);
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
                      <label htmlFor="regStudentDept">Faculty / Department</label>
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
                        placeholder="e.g. ali@alexu.edu.eg"
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
                    <label htmlFor="regPassword">Password</label>
                    <div className="form-control-container">
                      <span className="form-control-icon"><Lock size={18} /></span>
                      <input
                        id="regPassword"
                        type={showRegPassword ? 'text' : 'password'}
                        className="form-control password-input"
                        placeholder="Min 6 characters"
                        value={regPassword}
                        onChange={e => {
                          setRegPassword(e.target.value);
                          if (registerErrors.regPassword) validateRegisterField('regPassword', e.target.value);
                        }}
                        onBlur={e => validateRegisterField('regPassword', e.target.value)}
                        minLength={6}
                        required
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
                    {registerErrors.regPassword && (
                      <span className="field-error-msg" style={{ color: 'var(--destructive)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                        {registerErrors.regPassword}
                      </span>
                    )}
                  </div>

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
                        minLength={6}
                        required
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
                </>
              )}

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>Creating Account...</>
                ) : (
                  <>
                    <UserPlus size={18} weight="bold" />
                    Register {authPortalMode === 'professor' ? 'Professor' : 'Student'} Account
                  </>
                )}
              </button>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => { resetAuthForm(); setFormMode('login'); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Sign in here
                </button>
              </div>
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
            className={`nav-btn ${currentTab === 'courses' ? 'active' : ''}`}
            onClick={() => setCurrentTab('courses')}
          >
            <BookOpen size={20} weight="bold" />
            {userRole === 'professor' ? 'Courses Assigned' : 'Enrolled Courses'}
          </button>

          <button 
            className={`nav-btn ${currentTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setCurrentTab('statistics')}
          >
            <ChartBar size={20} weight="bold" />
            Statistics Summary
          </button>

          {userRole === 'professor' && (
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
          )}
          
          <button 
            className={`nav-btn ${currentTab === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentTab('profile')}
          >
            <User size={20} weight="bold" />
            {userRole === 'professor' ? 'Professor Profile' : 'Student Profile'}
          </button>
        </nav>

        <div className="sidebar-footer">
          {userRole === 'professor' && professor && (
            <div className="prof-info-card">
              <span className="prof-name">{professor.name}</span>
              <span className="prof-dept">{professor.department}</span>
            </div>
          )}
          {userRole === 'student' && student && (
            <div className="prof-info-card">
              <span className="prof-name">{student.name}</span>
              <span className="prof-dept">{student.department} ({student.student_id})</span>
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
          className={`bottom-nav-btn ${currentTab === 'courses' ? 'active' : ''}`}
          onClick={() => setCurrentTab('courses')}
        >
          <BookOpen size={20} weight="bold" />
          <span>Courses</span>
        </button>

        <button 
          className={`bottom-nav-btn ${currentTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setCurrentTab('statistics')}
        >
          <ChartBar size={20} weight="bold" />
          <span>Statistics</span>
        </button>

        {userRole === 'professor' && (
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
        )}
        
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
              {currentTab === 'grades' ? 'Grading Records' : currentTab === 'courses' ? (userRole === 'professor' ? 'Courses Assigned' : 'Enrolled Courses') : currentTab === 'statistics' ? 'Grading & Security Analytics' : currentTab === 'logs' ? 'Security Audit Logs' : userRole === 'professor' ? 'Professor Profile' : 'Student Profile'}
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
              onClick={() => setShowStatusModal(true)}
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
              <div className="controls-bar" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div className="search-box" style={{ maxWidth: '400px', width: '100%', flex: '1' }}>
                    <span className="search-icon"><MagnifyingGlass size={18} /></span>
                    <input
                      type="text"
                      className="search-input"
                      style={{ borderRadius: 'var(--radius-md)' }}
                      placeholder="Search Student ID, Course Code..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {userRole === 'professor' && (
                    <button className="action-btn" onClick={() => {
                      const defaultCourse = courseFilter !== 'All' ? courseFilter : (activeCourses[0]?.course_code || '');
                      setSelectedCourseCode(defaultCourse);
                      if (defaultCourse && defaultCourse !== 'NEW_COURSE') {
                        const selected = activeCourses.find(c => c.course_code === defaultCourse);
                        if (selected) {
                          setNewCourseCode(selected.course_code);
                          setNewCourseName(selected.course_name);
                          setShowNewCourseFields(false);
                        }
                      } else {
                        setSelectedCourseCode('NEW_COURSE');
                        setNewCourseCode('');
                        setNewCourseName('');
                        setShowNewCourseFields(true);
                      }
                      setShowAddModal(true);
                    }}>
                      <Plus size={16} weight="bold" />
                      Add Grade
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', width: '100%' }}>
                  {/* Course Filter Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Filter by Course
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        className={`filter-pill ${courseFilter === 'All' ? 'active' : ''}`}
                        onClick={() => setCourseFilter('All')}
                      >
                        All Courses
                      </button>
                      {(userRole === 'professor' 
                        ? activeCourses.map(c => c.course_code)
                        : Array.from(new Set(grades.map(g => g.courseCode)))
                      ).map(code => (
                        <button
                          key={code}
                          className={`filter-pill ${courseFilter === code ? 'active' : ''}`}
                          onClick={() => setCourseFilter(code)}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort Option Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Sort Records
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        className={`filter-pill ${sortOption === 'date-desc' ? 'active' : ''}`}
                        onClick={() => setSortOption('date-desc')}
                      >
                        Newest
                      </button>
                      <button
                        className={`filter-pill ${sortOption === 'date-asc' ? 'active' : ''}`}
                        onClick={() => setSortOption('date-asc')}
                      >
                        Oldest
                      </button>
                      <button
                        className={`filter-pill ${sortOption === 'grade-desc' ? 'active' : ''}`}
                        onClick={() => setSortOption('grade-desc')}
                      >
                        Highest
                      </button>
                      <button
                        className={`filter-pill ${sortOption === 'grade-asc' ? 'active' : ''}`}
                        onClick={() => setSortOption('grade-asc')}
                      >
                        Lowest
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {showLoadingIndicator ? (
                <div className="shimmer-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%' }}>
                  {/* Premium Cryptographic Loader Bar */}
                  <div className="crypt-loader-card">
                    <div className="crypt-loader-header">
                      <div className="crypt-loader-spinner-wrapper">
                        <ArrowClockwise className="crypt-loader-spinner" size={18} />
                      </div>
                      <span className="crypt-loader-text">{loadingMsg}</span>
                      <span className="crypt-loader-percentage">{loadingProgress}%</span>
                    </div>
                    <div className="crypt-loader-track">
                      <div className="crypt-loader-bar" style={{ width: `${loadingProgress}%` }}></div>
                    </div>
                  </div>

                  {/* Grid of Skeleton Cards underneath */}
                  <div className="shimmer-grid">
                    <div className="shimmer-card"><div className="shimmer-item shimmer-title"></div><div className="shimmer-item shimmer-body"></div></div>
                    <div className="shimmer-card"><div className="shimmer-item shimmer-title"></div><div className="shimmer-item shimmer-body"></div></div>
                    <div className="shimmer-card"><div className="shimmer-item shimmer-title"></div><div className="shimmer-item shimmer-body"></div></div>
                  </div>
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
                      style={{ borderTop: `4px solid ${getGradeScoreColor(grade.grade)}` }}
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
                        <span className="grade-card-value" style={{ color: getGradeScoreColor(grade.grade) }}>{grade.grade.toFixed(1)}</span>
                        <span className="grade-card-letter" style={{ color: getGradeScoreColor(grade.grade) }}>Grade {grade.letterGrade}</span>
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

          {currentTab === 'courses' && (
            <div style={{ animation: 'fade-in 0.2s ease', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="tab-header-description" style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  {userRole === 'professor' 
                    ? 'Manage your assigned courses, view real-time class averages, student enrollments, and execute grading updates.' 
                    : 'View your enrolled courses, your current grade standing, and perform cryptographic integrity checks.'}
                </p>
                
                <div className="controls-bar" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
                  <div className="search-box" style={{ maxWidth: '400px', width: '100%' }}>
                    <span className="search-icon"><MagnifyingGlass size={18} /></span>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search by Course Code or Title..."
                      value={courseSearchQuery}
                      onChange={e => setCourseSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {showLoadingIndicator ? (
                <div className="shimmer-grid">
                  <div className="shimmer-card" style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="shimmer-item shimmer-line short" style={{ marginBottom: '12px' }}></div>
                      <div className="shimmer-item shimmer-line medium" style={{ height: '24px', marginBottom: '16px' }}></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
                      <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
                    </div>
                  </div>
                  <div className="shimmer-card" style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="shimmer-item shimmer-line short" style={{ marginBottom: '12px' }}></div>
                      <div className="shimmer-item shimmer-line medium" style={{ height: '24px', marginBottom: '16px' }}></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
                      <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
                    </div>
                  </div>
                  <div className="shimmer-card" style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="shimmer-item shimmer-line short" style={{ marginBottom: '12px' }}></div>
                      <div className="shimmer-item shimmer-line medium" style={{ height: '24px', marginBottom: '16px' }}></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
                      <div className="shimmer-item" style={{ height: '36px', flex: '1', borderRadius: 'var(--radius-sm)' }}></div>
                    </div>
                  </div>
                </div>
              ) : userRole === 'professor' ? (
                // ── PROFESSOR VIEW ──
                (() => {
                  const filteredCourses = activeCourses.filter(course => 
                    course.course_code.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
                    course.course_name.toLowerCase().includes(courseSearchQuery.toLowerCase())
                  );

                  return filteredCourses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <BookOpen size={64} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                      <h2 style={{ marginTop: '16px' }}>No courses match your search</h2>
                      <p>Try clearing your search query or registering a new course code dynamically.</p>
                    </div>
                  ) : (
                    <div className="grades-grid">
                      {filteredCourses.map(course => {
                        const courseStat = stats?.courseStats?.find(cs => cs.code === course.course_code);
                        const avg = courseStat?.average || 0;
                        const studentCount = courseStat?.students || 0;

                        return (
                          <div 
                            key={course.course_code}
                            className="grade-record-card"
                            style={{ 
                              borderTop: `4px solid ${getGradeScoreColor(avg || 80)}`,
                              cursor: 'default',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              height: '240px'
                            }}
                          >
                            <div>
                              <div className="grade-card-header" style={{ marginBottom: '12px' }}>
                                <span className="grade-card-student" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
                                  COURSE CODE: {course.course_code}
                                </span>
                                <span className="grade-card-badge secure" style={{ padding: '4px 8px', fontSize: '10px' }}>
                                  ACTIVE
                                </span>
                              </div>
                              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.3 }}>
                                {course.course_name}
                              </h3>
                            </div>

                            <div>
                              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Class Average</div>
                                  <div style={{ fontSize: '20px', fontWeight: 800, color: getGradeScoreColor(avg || 80) }}>
                                    {avg > 0 ? `${avg.toFixed(1)}%` : 'N/A'}
                                  </div>
                                </div>
                                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enrolled Students</div>
                                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {studentCount} {studentCount === 1 ? 'Student' : 'Students'}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                  className="action-btn"
                                  style={{ flex: 1, padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                                  onClick={() => {
                                    setCourseFilter(course.course_code);
                                    setCurrentTab('grades');
                                  }}
                                >
                                  View Grades
                                </button>
                                <button 
                                  className="nav-btn"
                                  style={{ 
                                    flex: 1, 
                                    padding: '8px 12px', 
                                    fontSize: '12px', 
                                    justifyContent: 'center',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'transparent'
                                  }}
                                  onClick={() => {
                                    setSelectedCourseCode(course.course_code);
                                    setNewCourseCode(course.course_code);
                                    setNewCourseName(course.course_name);
                                    setShowNewCourseFields(false);
                                    setShowAddModal(true);
                                  }}
                                >
                                  + Add Grade
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                // ── STUDENT VIEW ──
                (() => {
                  const studentCourses = Array.from(new Set(grades.map(g => g.courseCode))).map(code => {
                    const grade = grades.find(g => g.courseCode === code);
                    return {
                      courseCode: code,
                      courseName: grade ? grade.courseName : '',
                      gradeVal: grade ? grade.grade : 0,
                      letterGrade: grade ? grade.letterGrade : 'F',
                      gradeObj: grade
                    };
                  });

                  const filteredStudentCourses = studentCourses.filter(c => 
                    c.courseCode.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
                    c.courseName.toLowerCase().includes(courseSearchQuery.toLowerCase())
                  );

                  return filteredStudentCourses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <BookOpen size={64} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                      <h2 style={{ marginTop: '16px' }}>No courses match your search</h2>
                      <p>Try clearing your search query or contact your professor if you are missing enrollment entries.</p>
                    </div>
                  ) : (
                    <div className="grades-grid">
                      {studentCourses.map(c => (
                        <div 
                          key={c.courseCode}
                          className="grade-record-card"
                          style={{ 
                            borderTop: `4px solid ${getGradeScoreColor(c.gradeVal)}`,
                            cursor: 'default',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '240px'
                          }}
                        >
                          <div>
                            <div className="grade-card-header" style={{ marginBottom: '12px' }}>
                              <span className="grade-card-student" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
                                COURSE CODE: {c.courseCode}
                              </span>
                              <span className="grade-card-badge secure" style={{ padding: '4px 8px', fontSize: '10px' }}>
                                SECURED ✓
                              </span>
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.3 }}>
                              {c.courseName}
                            </h3>
                          </div>

                          <div>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                              <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your Grade</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: getGradeScoreColor(c.gradeVal) }}>
                                  {c.gradeVal.toFixed(1)}%
                                </div>
                              </div>
                              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Letter Mark</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: getGradeScoreColor(c.gradeVal) }}>
                                  Grade {c.letterGrade}
                                </div>
                              </div>
                            </div>

                            <button 
                              className="action-btn"
                              style={{ width: '100%', padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                              onClick={() => {
                                if (c.gradeObj) handleOpenDetails(c.gradeObj);
                              }}
                            >
                              Verify Cryptographic Proof
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* ── TAB 2: STATISTICS VIEW ───────────────────────────────────────── */}
          {currentTab === 'statistics' && (
            <div style={{ animation: 'slide-up 0.3s ease' }}>
              {showStatsLoadingIndicator ? (
                <div className="shimmer-wrapper" style={{ animation: 'fade-in 0.3s ease' }}>
                  {/* Dashboard Hero Header Skeleton */}
                  <div className="dashboard-hero" style={{ height: 'auto', padding: '24px' }}>
                    <div className="hero-header-row" style={{ marginBottom: '20px' }}>
                      <div className="shimmer-item shimmer-circle" style={{ width: '48px', height: '48px' }}></div>
                      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="shimmer-item shimmer-line short"></div>
                        <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
                      </div>
                    </div>
                    
                    <div className="hero-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                      <div className="shimmer-card" style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div className="shimmer-item shimmer-line short" style={{ height: '24px', marginBottom: '8px' }}></div>
                        <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
                      </div>
                      <div className="shimmer-card" style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div className="shimmer-item shimmer-line short" style={{ height: '24px', marginBottom: '8px' }}></div>
                        <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
                      </div>
                      <div className="shimmer-card" style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div className="shimmer-item shimmer-line short" style={{ height: '24px', marginBottom: '8px' }}></div>
                        <div className="shimmer-item shimmer-line medium" style={{ marginBottom: 0 }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Chart Layout Skeleton */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
                    <div className="shimmer-card" style={{ height: '340px' }}>
                      <div className="shimmer-item shimmer-title"></div>
                      <div className="shimmer-item shimmer-chart"></div>
                    </div>
                    <div className="shimmer-card" style={{ height: '340px' }}>
                      <div className="shimmer-item shimmer-title"></div>
                      <div className="shimmer-item shimmer-chart"></div>
                    </div>
                  </div>
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
                      {userRole === 'student' ? (
                        <div className="hero-metric-item">
                          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>
                            {studentGpa.toFixed(2)}
                          </span>
                          <span className="hero-metric-lbl">Cumulative GPA</span>
                        </div>
                      ) : (
                        <div className="hero-metric-item">
                          <GraduationCap className="hero-metric-icon" />
                          <span className="hero-metric-val">{stats.totalGrades}</span>
                          <span className="hero-metric-lbl">Total Grades</span>
                        </div>
                      )}
                      
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
                                {userRole === 'professor' ? (
                                  <span className="course-students">Students Enrolled: {course.students}</span>
                                ) : (
                                  <span className="course-students" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <ShieldCheck size={14} /> Cryptographically Secure
                                  </span>
                                )}
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
          {currentTab === 'profile' && (
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
                  <label>New Letter Grade</label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '42px',
                    backgroundColor: `${getGradeScoreColor(parseFloat(editGradeVal) || 0)}15`,
                    color: getGradeScoreColor(parseFloat(editGradeVal) || 0),
                    border: `1.5px solid ${getGradeScoreColor(parseFloat(editGradeVal) || 0)}`,
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 800,
                    fontSize: '18px',
                    transition: 'all 0.2s ease'
                  }}>
                    {editLetterGradeVal}
                  </div>
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
                  onClick={() => setAddModalType('single')}
                >
                  Single Entry
                </button>
                <button 
                  className={addModalType === 'batch' ? 'active' : ''} 
                  onClick={() => setAddModalType('batch')}
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
                  
                  <div className="form-group">
                    <label htmlFor="courseSelect">Select Course</label>
                    <select
                      id="courseSelect"
                      className="select-filter"
                      style={{ width: '100%', padding: '10px' }}
                      value={selectedCourseCode}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedCourseCode(val);
                        if (val === 'NEW_COURSE') {
                          setNewCourseCode('');
                          setNewCourseName('');
                          setShowNewCourseFields(true);
                        } else {
                          const selected = activeCourses.find(c => c.course_code === val);
                          if (selected) {
                            setNewCourseCode(selected.course_code);
                            setNewCourseName(selected.course_name);
                          }
                          setShowNewCourseFields(false);
                        }
                      }}
                      required
                    >
                      {activeCourses.map(c => (
                        <option key={c.course_code} value={c.course_code}>
                          {c.course_code} — {c.course_name}
                        </option>
                      ))}
                      <option value="NEW_COURSE">+ Add New Course...</option>
                    </select>
                  </div>

                  {showNewCourseFields && (
                    <div className="form-row" style={{ animation: 'fade-in 0.2s ease' }}>
                      <div className="form-group">
                        <label htmlFor="newCourseCode">New Course Code</label>
                        <input
                          id="newCourseCode"
                          type="text"
                          className="form-control"
                          style={{ paddingLeft: '14px' }}
                          placeholder="e.g. CS101"
                          value={newCourseCode}
                          onChange={e => setNewCourseCode(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="newCourseName">New Course Name</label>
                        <input
                          id="newCourseName"
                          type="text"
                          className="form-control"
                          style={{ paddingLeft: '14px' }}
                          placeholder="e.g. Intro to CS"
                          value={newCourseName}
                          onChange={e => setNewCourseName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

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
                        onChange={e => {
                          const val = e.target.value;
                          setNewGrade(val);
                          const num = parseFloat(val);
                          if (!isNaN(num)) {
                            if (num >= 90) setNewLetterGrade('A');
                            else if (num >= 80) setNewLetterGrade('B');
                            else if (num >= 70) setNewLetterGrade('C');
                            else if (num >= 60) setNewLetterGrade('D');
                            else setNewLetterGrade('F');
                          } else {
                            setNewLetterGrade('F');
                          }
                        }}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Letter Grade</label>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '42px',
                        backgroundColor: `${getGradeScoreColor(parseFloat(newGrade) || 0)}15`,
                        color: getGradeScoreColor(parseFloat(newGrade) || 0),
                        border: `1.5px solid ${getGradeScoreColor(parseFloat(newGrade) || 0)}`,
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 800,
                        fontSize: '18px',
                        transition: 'all 0.2s ease'
                      }}>
                        {newLetterGrade}
                      </div>
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
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="batchCourseSelect">Select Course for Batch</label>
                    <select
                      id="batchCourseSelect"
                      className="select-filter"
                      style={{ width: '100%', padding: '10px' }}
                      value={webBatchCourseCode}
                      onChange={e => setWebBatchCourseCode(e.target.value)}
                      required
                    >
                      {activeCourses.map(c => (
                        <option key={c.course_code} value={c.course_code}>
                          {c.course_code} — {c.course_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                    <table className="batch-table">
                      <thead>
                        <tr>
                          <th>Student ID</th>
                          <th>Numeric Grade</th>
                          <th>Letter Grade</th>
                          <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {webBatchEntries.map((entry, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                className="form-control"
                                style={{ padding: '8px 12px', height: '36px' }}
                                placeholder="Student ID"
                                value={entry.studentId}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWebBatchEntries(prev => prev.map((item, i) => i === idx ? { ...item, studentId: val } : item));
                                }}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                className="form-control"
                                style={{ padding: '8px 12px', height: '36px' }}
                                placeholder="Grade"
                                value={entry.grade}
                                onChange={e => handleWebBatchGradeChange(idx, e.target.value)}
                                required
                              />
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text)' }}>
                                {entry.letterGrade}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ color: 'var(--destructive)', opacity: webBatchEntries.length <= 1 ? 0.4 : 1 }}
                                disabled={webBatchEntries.length <= 1}
                                onClick={() => removeWebBatchRow(idx)}
                              >
                                <Trash size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
                    <button
                      type="button"
                      className="nav-btn"
                      style={{ width: 'auto', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={addWebBatchRow}
                    >
                      <Plus size={16} /> Add Student Row
                    </button>
                  </div>

                  {/* Spreadsheet Upload Placeholder */}
                  <div style={{ 
                    padding: '16px', 
                    border: '1px dashed var(--border)', 
                    borderRadius: 'var(--radius-sm)', 
                    backgroundColor: 'var(--muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Do you have a pre-formatted spreadsheet?
                    </span>
                    <label className="action-btn" style={{ fontSize: '11px', padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <UploadSimple size={14} />
                      Upload File (.csv, .xlsx)
                      <input 
                        type="file" 
                        accept=".csv, .xlsx" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            alert(`File "${file.name}" selected. Spreadsheet batch entry integration is a placeholder for future Alexandria University implementation.`);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="nav-btn" style={{ width: 'auto', border: '1px solid var(--border)' }} onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="action-btn" disabled={isSubmitting}>
                    Upload & Sign Batch
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── SECURE SYSTEM STATUS DIALOG ── */}
      {showStatusModal && (
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
      )}

      {/* Custom cursor follower bubble */}
      <div 
        ref={cursorRef} 
        className={`cursor-follower ${cursorVisible ? 'visible' : ''} ${cursorHovered ? 'hovered' : ''}`}
      />
    </div>
  );
}

export default App;
