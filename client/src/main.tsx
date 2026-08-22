import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './pages/Home.js';
import { Login } from './pages/Login.js';
import { Tracker } from './pages/Tracker.js';
import { Toast } from './components/ui/Toast.js';
import { ErrorBoundary } from './components/ui/ErrorBoundary.js';
import { Skeleton } from './components/ui/Skeleton.js';
import { api } from './lib/api.js';
import { applyTheme, getInitialTheme } from './lib/utils.js';
import type { PublicData } from './types.js';
import './styles/index.css';

// Lazy load admin (heavy — only needed when logged in)
const Admin = React.lazy(() => import('./pages/Admin.js').then(m => ({ default: m.Admin })));

type AppView = 'home' | 'admin' | 'tracker';

interface ToastState { text: string; type: 'success' | 'error' | 'info'; }

function App() {
  const [view,      setView]      = useState<AppView>('home');
  const [trackNo,   setTrackNo]   = useState<string | null>(null);
  const [data,      setData]      = useState<PublicData | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toast,     setToast]     = useState<ToastState | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
  }, []);

  const closeToast = useCallback(() => setToast(null), []);

  // Apply theme on mount
  useEffect(() => { applyTheme(getInitialTheme()); }, []);

  // Check URL for tracker param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const track  = params.get('track');
    if (track) {
      setTrackNo(track);
      setView('tracker');
    }
  }, []);

  // Load public data
  const loadPublic = useCallback(async () => {
    try {
      const d = await api.public();
      setData(d);
      // Update page title from settings
      if (d.site?.brand) document.title = d.site.brand;
    } catch (e) { showToast((e as Error).message, 'error'); }
  }, [showToast]);

  useEffect(() => { loadPublic(); }, [loadPublic]);

  const enterAdmin = async () => {
    try {
      await api.me();
      setLoginOpen(false);
      setView('admin');
    } catch {
      setLoginOpen(true);
    }
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    await loadPublic();
    setView('home');
    showToast('تم تسجيل الخروج', 'info');
  };

  const goHome = () => {
    setView('home');
    setTrackNo(null);
    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete('track');
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="app">
      <ErrorBoundary>
        {/* Tracker view */}
        {view === 'tracker' && trackNo && (
          <Tracker orderNo={trackNo} onHome={goHome} />
        )}

        {/* Home view */}
        {view === 'home' && (
          <Home
            data={data ?? { site: { brand: 'Design Studio', phone: '', email: '', currency: 'EGP', whatsapp: '', telegram: '' }, packages: [], services: [], portfolio: [], testimonials: [] }}
            onAdmin={enterAdmin}
            onToast={showToast}
          />
        )}

        {/* Admin view (lazy loaded) */}
        {view === 'admin' && (
          <ErrorBoundary>
            <Suspense fallback={<div style={{ padding: 40 }}><Skeleton height={60} count={4} /></div>}>
              <Admin onLogout={logout} onToast={showToast} />
            </Suspense>
          </ErrorBoundary>
        )}
      </ErrorBoundary>

      {/* Login overlay */}
      {loginOpen && (
        <Login
          onSuccess={() => { setLoginOpen(false); setView('admin'); }}
          onToast={showToast}
        />
      )}

      {/* Global toast */}
      {toast && (
        <Toast text={toast.text} type={toast.type} onClose={closeToast} />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
