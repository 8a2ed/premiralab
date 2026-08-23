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
import { ClientPortal } from './pages/ClientPortal.js';

// Lazy load secondary routes so initial homepage load is ultra-fast
const Tracker      = lazy(() => import('./pages/Tracker.js').then(m => ({ default: m.Tracker })));
const Login        = lazy(() => import('./pages/Login.js').then(m => ({ default: m.Login })));
const Admin        = lazy(() => import('./pages/Admin.js').then(m => ({ default: m.Admin })));

type AppView = 'home' | 'admin' | 'tracker' | 'client';

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
    const isClient = path === '/client' || path.startsWith('/client/');

    if (track) {
      setTrackNo(track);
      setView('tracker');
    } else if (isAdmin) {
      enterAdmin();
    } else if (isClient) {
      setView('client');
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
      
      // Inject Analytics Scripts dynamically if configured
      if (d.site) {
        // Google Analytics (GA4)
        if (d.site.google_analytics_id && !document.getElementById('ga4-script')) {
          const script1 = document.createElement('script');
          script1.id = 'ga4-script';
          script1.async = true;
          script1.src = `https://www.googletagmanager.com/gtag/js?id=${d.site.google_analytics_id}`;
          document.head.appendChild(script1);
          
          const script2 = document.createElement('script');
          script2.id = 'ga4-inline';
          script2.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${d.site.google_analytics_id}');
          `;
          document.head.appendChild(script2);
        }

        // Meta (Facebook) Pixel
        if (d.site.meta_pixel_id && !document.getElementById('meta-pixel-script')) {
          const pixelScript = document.createElement('script');
          pixelScript.id = 'meta-pixel-script';
          pixelScript.innerHTML = `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${d.site.meta_pixel_id}');
            fbq('track', 'PageView');
          `;
          document.head.appendChild(pixelScript);
        }
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
        {/* Client Portal view */}
        {view === 'client' && (
          <ClientPortal onToast={showToast} onNavigateHome={goHome} />
        )}

        {/* Tracker view */}
        {view === 'tracker' && trackNo && (
          <Suspense fallback={<div className="container" style={{ padding: 40 }}><Skeleton height={120} count={3} /></div>}>
            <Tracker orderNo={trackNo} onHome={goHome} />
          </Suspense>
        )}

        {/* Home view */}
        {view === 'home' && (
          !data ? (
            <div className="container" style={{ padding: '100px 20px' }}>
              <Skeleton height={60} width="40%" style={{ marginBottom: 40 }} />
              <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                <Skeleton height={250} />
                <Skeleton height={250} />
                <Skeleton height={250} />
              </div>
            </div>
          ) : (
            <Home
              data={data}
              onToast={showToast}
              onClientClick={() => {
                window.history.pushState({}, '', '/client');
                setView('client');
              }}
            />
          )
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
