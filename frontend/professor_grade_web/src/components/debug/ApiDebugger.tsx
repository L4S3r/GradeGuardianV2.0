import { useState, useEffect } from 'react';
import {
  Bug,
  CheckCircle,
  XCircle,
  ArrowClockwise,
  Copy,
  Check,
  X
} from '@phosphor-icons/react';
import type { ApiService } from '../../services/api';

interface ApiDebuggerProps {
  api: ApiService;
}

interface DiagnosticTest {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  statusCode?: number;
  durationMs?: number;
  headers?: Record<string, string>;
  responseBody?: any;
  error?: string;
  diagnosis?: string;
}

export default function ApiDebugger({ api }: ApiDebuggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customUrl, setCustomUrl] = useState(() => api.getBaseUrl());
  const [tests, setTests] = useState<DiagnosticTest[]>([
    {
      id: 'health',
      name: '1. Health & Network Check (GET /health)',
      endpoint: '/health',
      method: 'GET',
      status: 'idle',
    },
    {
      id: 'preflight',
      name: '2. CORS Preflight Check (OPTIONS /auth/register)',
      endpoint: '/auth/register',
      method: 'OPTIONS',
      status: 'idle',
    },
    {
      id: 'validator',
      name: '3. API Endpoint Validation (POST /student/register)',
      endpoint: '/student/register',
      method: 'POST',
      status: 'idle',
    },
  ]);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
  const envUrl = import.meta.env.VITE_API_URL || '(none)';
  const localStoredUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('gg_server_url') || '(none)' : '';
  const activeBaseUrl = api.getBaseUrl();

  useEffect(() => {
    setCustomUrl(api.getBaseUrl());
  }, [isOpen]);

  const diagnoseError = (err: any, targetUrl: string): string => {
    const msg = (err.message || '').toLowerCase();
    const isHttpsPage = window.location.protocol === 'https:';
    const isHttpApi = targetUrl.startsWith('http://');

    if (isHttpsPage && isHttpApi) {
      return 'MIXED CONTENT BLOCKED: This page is loaded over HTTPS, but the API URL is using unencrypted HTTP (http://). Modern browsers block insecure HTTP requests from HTTPS pages.';
    }

    if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
      return `CONNECTION / CORS FAILURE: The browser could not reach "${targetUrl}". Common causes:\n` +
        `1. The backend server is offline or unreachable.\n` +
        `2. CORS policy rejected the origin "${currentOrigin}".\n` +
        `3. An ad-blocker, Brave Shields, or privacy extension blocked the fetch call.\n` +
        `4. Invalid SSL certificate or self-signed HTTPS error.`;
    }

    return `Request failed with error: ${err.message}`;
  };

  const runTest = async (testId: string, customBase?: string): Promise<DiagnosticTest> => {
    const base = customBase || activeBaseUrl;
    const testIndex = tests.findIndex(t => t.id === testId);
    if (testIndex === -1) return tests[0];

    const currentTest = { ...tests[testIndex], status: 'running' as const, error: undefined, diagnosis: undefined };
    setTests(prev => prev.map(t => (t.id === testId ? currentTest : t)));

    const startTime = performance.now();
    const fullUrl = `${base}${currentTest.endpoint}`;

    try {
      let options: RequestInit = {
        method: currentTest.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      if (currentTest.method === 'POST') {
        options.body = JSON.stringify({});
      }

      const res = await fetch(fullUrl, options);
      const durationMs = Math.round(performance.now() - startTime);

      const headerMap: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headerMap[k] = v;
      });

      let bodyText: any;
      const text = await res.text();
      try {
        bodyText = JSON.parse(text);
      } catch (_) {
        bodyText = text;
      }

      // 422 on dry-run POST with {} is a SUCCESS because it proves the API and validator reached the server
      const isExpectedStatus = res.ok || (currentTest.method === 'POST' && res.status === 422) || (currentTest.method === 'OPTIONS' && res.status === 204);

      const updatedTest: DiagnosticTest = {
        ...currentTest,
        status: isExpectedStatus ? 'success' : 'failed',
        statusCode: res.status,
        durationMs,
        headers: headerMap,
        responseBody: bodyText,
        error: isExpectedStatus ? undefined : `Returned HTTP Status ${res.status}`,
        diagnosis: isExpectedStatus
          ? 'Passed successfully.'
          : `Server responded with status ${res.status}. Response: ${typeof bodyText === 'string' ? bodyText : JSON.stringify(bodyText)}`,
      };

      setTests(prev => prev.map(t => (t.id === testId ? updatedTest : t)));
      return updatedTest;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const updatedTest: DiagnosticTest = {
        ...currentTest,
        status: 'failed',
        durationMs,
        error: err.message || 'Failed to fetch',
        diagnosis: diagnoseError(err, fullUrl),
      };
      setTests(prev => prev.map(t => (t.id === testId ? updatedTest : t)));
      return updatedTest;
    }
  };

  const runAllTests = async (customBase?: string) => {
    setIsRunningAll(true);
    for (const t of tests) {
      await runTest(t.id, customBase);
    }
    setIsRunningAll(false);
  };

  const handleApplyUrl = (newUrl: string) => {
    const normalized = api.normalizeUrl(newUrl);
    api.setBaseUrl(normalized);
    localStorage.setItem('gg_server_url', normalized);
    setCustomUrl(normalized);
    runAllTests(normalized);
  };

  const handleResetDefaults = () => {
    localStorage.removeItem('gg_server_url');
    const defaultUrl = 'https://gradeguardian-api.l4s3r.site';
    api.setBaseUrl(defaultUrl);
    setCustomUrl(defaultUrl);
    runAllTests(defaultUrl);
  };

  const copyDiagnosticReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      browser: {
        origin: currentOrigin,
        isSecureContext: isSecure,
        userAgent: navigator.userAgent,
      },
      configuration: {
        activeBaseUrl,
        viteEnvApiUrl: envUrl,
        localStorageServerUrl: localStoredUrl,
      },
      diagnosticResults: tests.map(t => ({
        name: t.name,
        endpoint: t.endpoint,
        method: t.method,
        status: t.status,
        statusCode: t.statusCode,
        durationMs: t.durationMs,
        headers: t.headers,
        responseBody: t.responseBody,
        error: t.error,
        diagnosis: t.diagnosis,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          runAllTests();
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: '#0f172a',
          color: '#38bdf8',
          border: '1.5px solid #38bdf8',
          borderRadius: '24px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          transition: 'transform 0.2s, background 0.2s',
          fontFamily: 'monospace',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Bug size={16} weight="bold" />
        API Diagnostics
      </button>

      {/* Diagnostics Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textAlign: 'left',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bug size={24} color="#38bdf8" weight="fill" />
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  GradeGuardian API Diagnostic Console
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Runtime Info Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '10px',
                marginBottom: '20px',
                fontSize: '12px',
              }}
            >
              <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Current Browser Origin</span>
                <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{currentOrigin}</strong>
              </div>

              <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Active API Base URL</span>
                <strong style={{ color: '#4ade80', fontFamily: 'monospace' }}>{activeBaseUrl}</strong>
              </div>

              <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>VITE_API_URL (Build Env)</span>
                <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{envUrl}</span>
              </div>

              <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>localStorage ('gg_server_url')</span>
                <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{localStoredUrl}</span>
              </div>
            </div>

            {/* Base URL Switcher Controls */}
            <div style={{ marginBottom: '24px', padding: '16px', background: '#1e293b', borderRadius: '10px', border: '1px solid #334155' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                Override Target API Base URL (Instant Hot-Swap)
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="https://gradeguardian-api.l4s3r.site"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={() => handleApplyUrl(customUrl)}
                  style={{
                    padding: '8px 16px',
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Apply URL
                </button>
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>Presets:</span>
                <button
                  onClick={() => handleApplyUrl('https://gradeguardian-api.l4s3r.site')}
                  style={{ fontSize: '11px', padding: '4px 8px', background: '#334155', color: '#38bdf8', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cloud Production (https)
                </button>
                <button
                  onClick={() => handleApplyUrl('http://localhost:8000')}
                  style={{ fontSize: '11px', padding: '4px 8px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Localhost (port 8000)
                </button>
                <button
                  onClick={() => handleApplyUrl('http://127.0.0.1:8000')}
                  style={{ fontSize: '11px', padding: '4px 8px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  127.0.0.1 (port 8000)
                </button>
                <button
                  onClick={handleResetDefaults}
                  style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Reset Storage
                </button>
              </div>
            </div>

            {/* Diagnostic Tests Panel */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#cbd5e1' }}>
                  Live Endpoint Diagnostics
                </h3>
                <button
                  onClick={() => runAllTests()}
                  disabled={isRunningAll}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isRunningAll ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ArrowClockwise size={14} className={isRunningAll ? 'spin-icon' : ''} />
                  {isRunningAll ? 'Running Tests...' : 'Re-run Tests'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tests.map(t => (
                  <div
                    key={t.id}
                    style={{
                      padding: '14px',
                      background: '#1e293b',
                      borderRadius: '8px',
                      border: `1px solid ${t.status === 'success' ? '#10b981' : t.status === 'failed' ? '#ef4444' : '#334155'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t.status === 'success' && <CheckCircle size={18} color="#10b981" weight="fill" />}
                        {t.status === 'failed' && <XCircle size={18} color="#ef4444" weight="fill" />}
                        {t.status === 'running' && <ArrowClockwise size={18} color="#38bdf8" className="spin-icon" />}
                        {t.status === 'idle' && <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#475569' }} />}
                        <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{t.name}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
                        {t.durationMs !== undefined && <span style={{ color: '#94a3b8' }}>{t.durationMs}ms</span>}
                        {t.statusCode !== undefined && (
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: t.statusCode < 400 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: t.statusCode < 400 ? '#34d399' : '#f87171',
                              fontWeight: 700,
                            }}
                          >
                            HTTP {t.statusCode}
                          </span>
                        )}
                        <button
                          onClick={() => runTest(t.id)}
                          style={{ background: 'transparent', border: '1px solid #475569', borderRadius: '4px', color: '#cbd5e1', padding: '2px 6px', cursor: 'pointer' }}
                        >
                          Run
                        </button>
                      </div>
                    </div>

                    {t.diagnosis && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          lineHeight: '1.4',
                          background: t.status === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.1)',
                          color: t.status === 'success' ? '#a7f3d0' : '#fca5a5',
                          border: `1px solid ${t.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.25)'}`,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace',
                        }}
                      >
                        {t.diagnosis}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Copy Diagnostics Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={copyDiagnosticReport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: copied ? '#10b981' : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
                {copied ? 'Diagnostic Report Copied!' : 'Copy Full Report to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
