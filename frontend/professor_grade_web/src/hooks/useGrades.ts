import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import type { GradeRecord, AuditLog, CourseStat, ProfessorStats, CourseModel } from '../services/api';
import type { WebBatchEntry } from '../types';

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

export function useGrades(
  api: ApiService,
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>,
  token: string | null,
  userRole: 'professor' | 'student' | null,
  isAuthenticated: boolean,
  serverUrl: string
) {
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

  // Global audit logs state
  const [globalAuditLogs, setGlobalAuditLogs] = useState<any[]>([]);
  const [loadingGlobalLogs, setLoadingGlobalLogs] = useState<boolean>(false);

  // isSubmitting for grade operations
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Simulative Loading Bar State for Cryptographic Handshake
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingMsg, setLoadingMsg] = useState<string>('Initializing secure connection...');

  // Delayed loading state indicators (prevent flicker under 300ms)
  const [showLoadingIndicator, setShowLoadingIndicator] = useState<boolean>(false);
  const [showStatsLoadingIndicator, setShowStatsLoadingIndicator] = useState<boolean>(false);
  const [showGlobalLogsLoadingIndicator, setShowGlobalLogsLoadingIndicator] = useState<boolean>(false);

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

  // Fetch grades & statistics when authenticated or on filter change
  useEffect(() => {
    if (isAuthenticated && token) {
      loadGrades();
      loadStats();
      loadCourses();
      fetchGlobalAuditLogs();
    }
  }, [isAuthenticated, token, serverUrl]);

  // ── CORE API SERVICE CALLS ─────────────────────────────────────────────────
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

    const courseMap: { [key: string]: { code: string; name: string; sum: number; count: number; grades: number[] } } = {};
    verified.forEach(g => {
      if (!courseMap[g.courseCode]) {
        courseMap[g.courseCode] = { code: g.courseCode, name: g.courseName, sum: 0, count: 0, grades: [] };
      }
      courseMap[g.courseCode].sum += g.grade;
      courseMap[g.courseCode].count += 1;
      courseMap[g.courseCode].grades.push(g.grade);
    });
    const courseStatsList: CourseStat[] = Object.values(courseMap).map(c => {
      const sortedGrades = [...c.grades].sort((a, b) => a - b);
      const min = sortedGrades[0] || 0;
      const max = sortedGrades[sortedGrades.length - 1] || 0;
      
      let median = 0;
      if (sortedGrades.length > 0) {
        const mid = Math.floor(sortedGrades.length / 2);
        median = sortedGrades.length % 2 === 0
          ? (sortedGrades[mid - 1] + sortedGrades[mid]) / 2
          : sortedGrades[mid];
      }
      
      const passingCount = sortedGrades.filter(g => g >= 60).length;
      const passRate = sortedGrades.length > 0 ? (passingCount / sortedGrades.length) * 100 : 0;
      
      return {
        code: c.code,
        name: c.name,
        average: c.sum / c.count,
        students: c.count,
        min,
        max,
        median,
        passRate
      };
    });

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
        students: Number(value.students) || 0,
        min: value.min !== undefined ? Number(value.min) : undefined,
        max: value.max !== undefined ? Number(value.max) : undefined,
        median: value.median !== undefined ? Number(value.median) : undefined,
        passRate: value.passRate !== undefined ? Number(value.passRate) : undefined,
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
    
    let courseCode = webBatchCourseCode;
    let courseName = '';

    if (webBatchCourseCode === 'NEW_COURSE') {
      if (!newCourseCode.trim() || !newCourseName.trim()) {
        alert('Please provide both the new course code and course name.');
        return;
      }
      courseCode = newCourseCode.trim();
      courseName = newCourseName.trim();
    } else {
      const selectedCourse = activeCourses.find(c => c.course_code === webBatchCourseCode);
      if (!selectedCourse) {
        alert('Please select a course for the batch.');
        return;
      }
      courseCode = selectedCourse.course_code;
      courseName = selectedCourse.course_name;
    }

    const invalid = webBatchEntries.some(entry => !entry.studentId || isNaN(parseFloat(entry.grade)));
    if (invalid) {
      alert('Please complete all student ID and grade fields with valid numbers.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (webBatchCourseCode === 'NEW_COURSE') {
        try {
          await apiCall('/courses', {
            method: 'POST',
            body: JSON.stringify({
              course_code: courseCode,
              course_name: courseName
            })
          });
          // Add to activeCourses state so it appears in frontend dropdowns
          setActiveCourses(prev => [...prev, { id: courseCode, course_code: courseCode, course_name: courseName }]);
        } catch (err: any) {
          console.error('Failed to auto-register new course:', err);
        }
      }

      const gradesPayload = webBatchEntries.map(entry => ({
        student_id: entry.studentId.trim(),
        course_code: courseCode,
        course_name: courseName,
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
      setNewCourseCode('');
      setNewCourseName('');
      setShowNewCourseFields(false);
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

  return {
    // Grade state
    grades,
    setGrades,
    isLoading,
    errorMessage,
    searchQuery,
    setSearchQuery,
    courseFilter,
    setCourseFilter,
    sortOption,
    setSortOption,
    activeCourses,
    courseSearchQuery,
    setCourseSearchQuery,
    // Stats state
    stats,
    statsLoading,
    studentGpa,
    // Modal state
    selectedGrade,
    selectedGradeLogs,
    loadingGradeLogs,
    showAddModal,
    setShowAddModal,
    addModalType,
    setAddModalType,
    newStudentId,
    setNewStudentId,
    newCourseCode,
    setNewCourseCode,
    newCourseName,
    setNewCourseName,
    newGrade,
    setNewGrade,
    newLetterGrade,
    setNewLetterGrade,
    selectedCourseCode,
    setSelectedCourseCode,
    showNewCourseFields,
    setShowNewCourseFields,
    webBatchCourseCode,
    setWebBatchCourseCode,
    webBatchEntries,
    setWebBatchEntries,
    showEditModal,
    setShowEditModal,
    editGradeVal,
    setEditGradeVal,
    editLetterGradeVal,
    setEditLetterGradeVal,
    showStatusModal,
    setShowStatusModal,
    globalAuditLogs,
    loadingGlobalLogs,
    isSubmitting,
    // Loading progress
    loadingProgress,
    loadingMsg,
    showLoadingIndicator,
    showStatsLoadingIndicator,
    showGlobalLogsLoadingIndicator,
    // Handlers
    loadGrades,
    verifyAllGrades,
    loadStats,
    loadCourses,
    fetchGlobalAuditLogs,
    computeStudentStats,
    handleSingleSubmit,
    handleBatchSubmit,
    handleWebBatchGradeChange,
    addWebBatchRow,
    removeWebBatchRow,
    handleRepairGrade,
    handleUpdateGrade,
    handleOpenDetails,
    handleCloseDetails,
    handleOpenEdit,
  };
}
