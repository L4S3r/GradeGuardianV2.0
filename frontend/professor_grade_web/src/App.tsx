import { useState, useEffect } from 'react';
import { ApiService } from './services/api';

// Hooks
import { useTheme } from './hooks/useTheme';
import { useCursor } from './hooks/useCursor';
import { useAuth } from './hooks/useAuth';
import { useGrades } from './hooks/useGrades';

// Layout components
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import TopHeader from './components/layout/TopHeader';

// Auth / Guard components
import SecurityCheckScreen from './components/auth/SecurityCheckScreen';
import BlockedScreen from './components/auth/BlockedScreen';
import AuthScreen from './components/auth/AuthScreen';

// Modals
import GradeDetailsModal from './components/modals/GradeDetailsModal';
import EditGradeModal from './components/modals/EditGradeModal';
import AddGradeModal from './components/modals/AddGradeModal';
import StatusModal from './components/modals/StatusModal';

// Tabs
import GradesTab from './components/tabs/GradesTab';
import CoursesTab from './components/tabs/CoursesTab';
import StatisticsTab from './components/tabs/StatisticsTab';
import ProfileTab from './components/tabs/ProfileTab';
import AuditLogsTab from './components/tabs/AuditLogsTab';

import './App.css';

const initialServerUrl = import.meta.env.VITE_API_URL || localStorage.getItem('gg_server_url') || 'http://localhost:8000';
const api = new ApiService(initialServerUrl);

function App() {
  // ── THEME STATE & HOOK ──────────────────────────────────────────────────────
  const { theme, setTheme } = useTheme();

  // ── CURSOR HOOK ────────────────────────────────────────────────────────────
  const { cursorRef, cursorHovered, cursorVisible } = useCursor();

  // ── AUTH STATE & HOOK ──────────────────────────────────────────────────────
  const auth = useAuth(api);

  // ── GRADES & OPERATIONS HOOK ────────────────────────────────────────────────
  const gradesContext = useGrades(
    api,
    auth.apiCall,
    auth.token,
    auth.userRole,
    auth.isAuthenticated,
    auth.serverUrl
  );

  // ── LOCAL VIEW STATE ────────────────────────────────────────────────────────
  const [currentTab, setCurrentTab] = useState<'grades' | 'courses' | 'statistics' | 'profile' | 'logs'>('grades');
  const [securityChecking, setSecurityChecking] = useState<boolean>(true);
  const [securityCheckPassed, setSecurityCheckPassed] = useState<boolean>(true);
  const [securityCheckReason, setSecurityCheckReason] = useState<string | null>(null);
  const [securityScanStep, setSecurityScanStep] = useState<string>('');
  const [securityProgress, setSecurityProgress] = useState<number>(0);

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

  // ── FILTERS & SEARCH PROCESSOR ─────────────────────────────────────────────
  const processedGrades = gradesContext.grades
    .filter(g => {
      // Course filter
      if (gradesContext.courseFilter !== 'All' && g.courseCode !== gradesContext.courseFilter) return false;
      // Search query
      if (gradesContext.searchQuery.trim() !== '') {
        const query = gradesContext.searchQuery.toLowerCase().trim();
        return (
          g.studentId.toLowerCase().includes(query) ||
          g.courseCode.toLowerCase().includes(query) ||
          g.courseName.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (gradesContext.sortOption === 'date-desc') {
        return new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime();
      } else if (gradesContext.sortOption === 'date-asc') {
        return new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
      } else if (gradesContext.sortOption === 'grade-desc') {
        return b.grade - a.grade;
      } else if (gradesContext.sortOption === 'grade-asc') {
        return a.grade - b.grade;
      }
      return 0;
    });

  const tamperedGradesList = gradesContext.grades.filter(g => !g.isVerified);
  const hasTamperedGrades = tamperedGradesList.length > 0;

  // ── RENDER GUARDS ──────────────────────────────────────────────────────────
  if (!securityCheckPassed) {
    return <BlockedScreen securityCheckReason={securityCheckReason} />;
  }

  if (securityChecking) {
    return (
      <SecurityCheckScreen 
        securityProgress={securityProgress} 
        securityScanStep={securityScanStep} 
      />
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <AuthScreen
        theme={theme}
        setTheme={setTheme}
        authPortalMode={auth.authPortalMode}
        setAuthPortalMode={auth.setAuthPortalMode}
        formMode={auth.formMode}
        setFormMode={auth.setFormMode}
        authError={auth.authError}
        registerErrors={auth.registerErrors}
        isSubmitting={auth.isSubmitting}
        loginEmail={auth.loginEmail}
        setLoginEmail={auth.setLoginEmail}
        loginPassword={auth.loginPassword}
        setLoginPassword={auth.setLoginPassword}
        loginStudentId={auth.loginStudentId}
        setLoginStudentId={auth.setLoginStudentId}
        showLoginPassword={auth.showLoginPassword}
        setShowLoginPassword={auth.setShowLoginPassword}
        regName={auth.regName}
        setRegName={auth.setRegName}
        regEmpId={auth.regEmpId}
        setRegEmpId={auth.setRegEmpId}
        regDept={auth.regDept}
        setRegDept={auth.setRegDept}
        regEmail={auth.regEmail}
        setRegEmail={auth.setRegEmail}
        regPassword={auth.regPassword}
        setRegPassword={auth.setRegPassword}
        regSecretKey={auth.regSecretKey}
        setRegSecretKey={auth.setRegSecretKey}
        regConfirmPassword={auth.regConfirmPassword}
        setRegConfirmPassword={auth.setRegConfirmPassword}
        showRegPassword={auth.showRegPassword}
        setShowRegPassword={auth.setShowRegPassword}
        showRegConfirmPassword={auth.showRegConfirmPassword}
        setShowRegConfirmPassword={auth.setShowRegConfirmPassword}
        showSecretKey={auth.showSecretKey}
        setShowSecretKey={auth.setShowSecretKey}
        regStudentId={auth.regStudentId}
        setRegStudentId={auth.setRegStudentId}
        regStudentDept={auth.regStudentDept}
        setRegStudentDept={auth.setRegStudentDept}
        regActualPassword={auth.regActualPassword}
        setRegActualPassword={auth.setRegActualPassword}
        handleLogin={auth.handleLogin}
        handleRegister={auth.handleRegister}
        resetAuthForm={auth.resetAuthForm}
        validateRegisterField={auth.validateRegisterField}
        cursorRef={cursorRef}
        cursorVisible={cursorVisible}
        cursorHovered={cursorHovered}
      />
    );
  }

  return (
    <div className="app-container">
      {/* ── SIDEBAR (DESKTOP) ── */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        hasTamperedGrades={hasTamperedGrades}
        tamperedGradesList={tamperedGradesList}
        userRole={auth.userRole}
        professor={auth.professor}
        student={auth.student}
        handleLogout={auth.handleLogout}
        fetchGlobalAuditLogs={gradesContext.fetchGlobalAuditLogs}
      />

      {/* ── BOTTOM NAVIGATION (MOBILE) ── */}
      <BottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        hasTamperedGrades={hasTamperedGrades}
        userRole={auth.userRole}
        fetchGlobalAuditLogs={gradesContext.fetchGlobalAuditLogs}
      />

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <main className="main-content">
        <TopHeader
          currentTab={currentTab}
          userRole={auth.userRole}
          theme={theme}
          setTheme={setTheme}
          isLoading={gradesContext.isLoading}
          loadingGlobalLogs={gradesContext.loadingGlobalLogs}
          loadGrades={gradesContext.loadGrades}
          fetchGlobalAuditLogs={gradesContext.fetchGlobalAuditLogs}
          setShowStatusModal={gradesContext.setShowStatusModal}
          hasTamperedGrades={hasTamperedGrades}
        />

        <div className="content-area">
          {currentTab === 'grades' && (
            <GradesTab
              userRole={auth.userRole}
              processedGrades={processedGrades}
              grades={gradesContext.grades}
              activeCourses={gradesContext.activeCourses}
              searchQuery={gradesContext.searchQuery}
              setSearchQuery={gradesContext.setSearchQuery}
              courseFilter={gradesContext.courseFilter}
              setCourseFilter={gradesContext.setCourseFilter}
              sortOption={gradesContext.sortOption}
              setSortOption={gradesContext.setSortOption}
              isLoading={gradesContext.isLoading}
              showLoadingIndicator={gradesContext.showLoadingIndicator}
              loadingMsg={gradesContext.loadingMsg}
              loadingProgress={gradesContext.loadingProgress}
              errorMessage={gradesContext.errorMessage}
              hasTamperedGrades={hasTamperedGrades}
              tamperedGradesList={tamperedGradesList}
              setSelectedCourseCode={gradesContext.setSelectedCourseCode}
              setNewCourseCode={gradesContext.setNewCourseCode}
              setNewCourseName={gradesContext.setNewCourseName}
              setShowNewCourseFields={gradesContext.setShowNewCourseFields}
              setShowAddModal={gradesContext.setShowAddModal}
              handleOpenDetails={gradesContext.handleOpenDetails}
              loadGrades={gradesContext.loadGrades}
            />
          )}

          {currentTab === 'courses' && (
            <CoursesTab
              userRole={auth.userRole}
              activeCourses={gradesContext.activeCourses}
              courseSearchQuery={gradesContext.courseSearchQuery}
              setCourseSearchQuery={gradesContext.setCourseSearchQuery}
              grades={gradesContext.grades}
              stats={gradesContext.stats}
              showLoadingIndicator={gradesContext.showLoadingIndicator}
              setSelectedCourseCode={gradesContext.setSelectedCourseCode}
              setNewCourseCode={gradesContext.setNewCourseCode}
              setNewCourseName={gradesContext.setNewCourseName}
              setShowNewCourseFields={gradesContext.setShowNewCourseFields}
              setShowAddModal={gradesContext.setShowAddModal}
              setCourseFilter={gradesContext.setCourseFilter}
              setCurrentTab={setCurrentTab}
              handleOpenDetails={gradesContext.handleOpenDetails}
            />
          )}

          {currentTab === 'statistics' && (
            <StatisticsTab
              showStatsLoadingIndicator={gradesContext.showStatsLoadingIndicator}
              stats={gradesContext.stats}
              userRole={auth.userRole}
              studentGpa={gradesContext.studentGpa}
              hasTamperedGrades={hasTamperedGrades}
              grades={gradesContext.grades}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileTab
              userRole={auth.userRole}
              professor={auth.professor}
              student={auth.student}
              handleLogout={auth.handleLogout}
            />
          )}

          {currentTab === 'logs' && (
            <AuditLogsTab
              showGlobalLogsLoadingIndicator={gradesContext.showGlobalLogsLoadingIndicator}
              globalAuditLogs={gradesContext.globalAuditLogs}
            />
          )}
        </div>
      </main>

      {/* ── MODALS ── */}
      {gradesContext.selectedGrade && (
        <GradeDetailsModal
          selectedGrade={gradesContext.selectedGrade}
          selectedGradeLogs={gradesContext.selectedGradeLogs}
          loadingGradeLogs={gradesContext.loadingGradeLogs}
          userRole={auth.userRole}
          isSubmitting={gradesContext.isSubmitting}
          handleCloseDetails={gradesContext.handleCloseDetails}
          handleOpenEdit={gradesContext.handleOpenEdit}
          handleRepairGrade={gradesContext.handleRepairGrade}
        />
      )}

      {gradesContext.showEditModal && gradesContext.selectedGrade && (
        <EditGradeModal
          selectedGrade={gradesContext.selectedGrade}
          editGradeVal={gradesContext.editGradeVal}
          setEditGradeVal={gradesContext.setEditGradeVal}
          editLetterGradeVal={gradesContext.editLetterGradeVal}
          setEditLetterGradeVal={gradesContext.setEditLetterGradeVal}
          isSubmitting={gradesContext.isSubmitting}
          setShowEditModal={gradesContext.setShowEditModal}
          handleUpdateGrade={gradesContext.handleUpdateGrade}
        />
      )}

      {gradesContext.showAddModal && (
        <AddGradeModal
          api={api}
          addModalType={gradesContext.addModalType}
          setAddModalType={gradesContext.setAddModalType}
          newStudentId={gradesContext.newStudentId}
          setNewStudentId={gradesContext.setNewStudentId}
          selectedCourseCode={gradesContext.selectedCourseCode}
          setSelectedCourseCode={gradesContext.setSelectedCourseCode}
          activeCourses={gradesContext.activeCourses}
          showNewCourseFields={gradesContext.showNewCourseFields}
          setShowNewCourseFields={gradesContext.setShowNewCourseFields}
          newCourseCode={gradesContext.newCourseCode}
          setNewCourseCode={gradesContext.setNewCourseCode}
          newCourseName={gradesContext.newCourseName}
          setNewCourseName={gradesContext.setNewCourseName}
          newGrade={gradesContext.newGrade}
          setNewGrade={gradesContext.setNewGrade}
          newLetterGrade={gradesContext.newLetterGrade}
          isSubmitting={gradesContext.isSubmitting}
          webBatchCourseCode={gradesContext.webBatchCourseCode}
          setWebBatchCourseCode={gradesContext.setWebBatchCourseCode}
          webBatchEntries={gradesContext.webBatchEntries}
          setWebBatchEntries={gradesContext.setWebBatchEntries}
          addWebBatchRow={gradesContext.addWebBatchRow}
          removeWebBatchRow={gradesContext.removeWebBatchRow}
          handleSingleSubmit={gradesContext.handleSingleSubmit}
          handleBatchSubmit={gradesContext.handleBatchSubmit}
          handleWebBatchGradeChange={gradesContext.handleWebBatchGradeChange}
          setShowAddModal={gradesContext.setShowAddModal}
        />
      )}

      {gradesContext.showStatusModal && (
        <StatusModal
          hasTamperedGrades={hasTamperedGrades}
          setShowStatusModal={gradesContext.setShowStatusModal}
        />
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
