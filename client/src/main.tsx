import React, { useState, useEffect, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './pages/Home.js';
import { Toast } from './components/ui/Toast.js';
import { ErrorBoundary } from './components/ui/ErrorBoundary.js';
import { Skeleton } from './components/ui/Skeleton.js';
import { api } from './lib/api.js';
import { applyTheme, getInitialTheme } from './lib/utils.js';
import type { PublicData } from './types.js';
import './styles/index.css';

// Lazy load secondary routes so initial homepage load is ultra-fast
const Tracker = React.lazy(() => import('./pages/Tracker.js').then(m => ({ default: m.Tracker })));
const Login   = React.lazy(() => import('./pages/Login.js').then(m => ({ default: m.Login })));
const Admin   = React.lazy(() => import('./pages/Admin.js').then(m => ({ default: m.Admin })));

type AppView = 'home' | 'admin' | 'tracker';

interface ToastState { text: string; type: 'success' | 'error' | 'info'; }

function App() {
  const [view,      setView]      = useState<AppView>('home');
  const [trackNo,   setTrackNo]   = useState<string | null>(null);
  const [data,      setData]      = useState<PublicData | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toast,     setToast]     = useState<ToastState | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') =>
    setToast({ text, type });

  // Apply theme on mount
  useEffect(() => { applyTheme(getInitialTheme()); }, []);

  // Check URL on load for tracker or admin access
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const track  = params.get('track');
    const isAdmin = params.has('admin') || path === '/admin' || path === '/login';

    if (track) {
      setTrackNo(track);
      setView('tracker');
    } else if (isAdmin) {
      enterAdmin();
    }
  }, []);

  // Secret keyboard shortcut for owner: Ctrl + Shift + A
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        enterAdmin();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Load public data
  const loadPublic = async () => {
    try {
      const d = await api.public();
      setData(d);
      // Update page title from settings with SEO descriptor
      if (d.site?.brand) {
        document.title = `${d.site.brand} | منصة تصميم رقمية احترافية`;
      }
    } catch (e) { showToast((e as Error).message, 'error'); }
  };

  useEffect(() => { loadPublic(); }, []);

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
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    if (url.pathname === '/admin' || url.pathname === '/login') url.pathname = '/';
    window.history.replaceState({}, '', url);
    showToast('تم تسجيل الخروج', 'info');
  };

  const goHome = () => {
    setView('home');
    setTrackNo(null);
    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete('track');
    url.searchParams.delete('admin');
    if (url.pathname === '/admin' || url.pathname === '/login') url.pathname = '/';
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="app">
      <ErrorBoundary>
        {/* Tracker view */}
        {view === 'tracker' && trackNo && (
          <Suspense fallback={<div className="container" style={{ padding: 40 }}><Skeleton height={120} count={3} /></div>}>
            <Tracker orderNo={trackNo} onHome={goHome} />
          </Suspense>
        )}

        {/* Home view */}
        {view === 'home' && (
          <Home
            data={data ?? { site: { brand: 'PREMIRALAB', phone: '', email: '', currency: 'EGP', whatsapp: '', telegram: '' }, packages: [], services: [], portfolio: [], testimonials: [] }}
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
        <Suspense fallback={null}>
          <Login
            onSuccess={() => { setLoginOpen(false); setView('admin'); }}
            onToast={showToast}
          />
        </Suspense>
      )}

      {/* Global toast */}
      {toast && (
        <Toast text={toast.text} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
