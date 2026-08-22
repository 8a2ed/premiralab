import { useState, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Sidebar, NAV_ITEMS, type AdminTab } from '../components/admin/Sidebar.js';
import { NotificationBell } from '../components/admin/NotificationBell.js';
import { Dashboard } from '../components/admin/Dashboard.js';
import { Orders } from '../components/admin/Orders.js';
import { Clients } from '../components/admin/Clients.js';
import { Projects } from '../components/admin/Projects.js';
import { Crud } from '../components/admin/Crud.js';
import { SettingsPanel } from '../components/admin/SettingsPanel.js';
import { Security } from '../components/admin/Security.js';
import { ActivityLog } from '../components/admin/ActivityLog.js';
import { api } from '../lib/api.js';
import type { Analytics } from '../types.js';

interface AdminProps {
  onLogout: () => void;
  onToast:  (msg: string, type?: 'success' | 'error') => void;
}

export function Admin({ onLogout, onToast }: AdminProps) {
  const [tab,         setTab]         = useState<AdminTab>('dashboard');
  const [analytics,   setAnalytics]   = useState<Analytics | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshKey,  setRefreshKey]  = useState(0);

  // Load analytics only for dashboard tab
  const loadAnalytics = useCallback(async () => {
    try {
      const data = await api.admin.analytics();
      setAnalytics(data);
    } catch (e) { onToast((e as Error).message, 'error'); }
  }, [onToast]);

  const handleTabChange = (t: AdminTab) => {
    setTab(t);
    if (t === 'dashboard') loadAnalytics();
  };

  // On initial mount, load dashboard analytics
  useEffect(() => { loadAnalytics(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    setRefreshKey(k => k + 1);
    if (tab === 'dashboard') loadAnalytics();
  };

  const currentTitle = NAV_ITEMS.find(x => x[0] === tab)?.[1] ?? '';

  return (
    <div className="admin">
      <div className="admin-layout">
        <Sidebar tab={tab} onTab={handleTabChange} unreadCount={unreadCount} onLogout={onLogout} />

        <main className="main">
          {/* Top bar */}
          <div className="topbar">
            <div>
              <h2 className="topbar-title">{currentTitle}</h2>
              <div className="muted topbar-sub">إدارة مركزية للمنصة</div>
            </div>
            <div className="topbar-actions">
              <NotificationBell onUnreadChange={setUnreadCount} />
              <button className="btn" onClick={refresh} aria-label="تحديث">
                <RefreshCw size={16} /> تحديث
              </button>
            </div>
          </div>

          {/* Tab content — each tab lazy-loads its own data */}
          <div key={refreshKey}>
            {tab === 'dashboard'    && <Dashboard analytics={analytics ?? { total: 0, clients: 0, active: 0, revenue: 0, byStatus: [], recent: [] }} />}
            {tab === 'orders'       && <Orders    onToast={onToast} />}
            {tab === 'clients'      && <Clients   onToast={onToast} />}
            {tab === 'projects'     && <Projects  onToast={onToast} />}
            {tab === 'packages'     && <Crud resource="packages"     title="الباقات"    onToast={onToast} />}
            {tab === 'services'     && <Crud resource="services"     title="الخدمات"    onToast={onToast} />}
            {tab === 'portfolio'    && <Crud resource="portfolio"    title="الأعمال"    onToast={onToast} />}
            {tab === 'testimonials' && <Crud resource="testimonials" title="التقييمات"  onToast={onToast} />}
            {tab === 'activity'     && <ActivityLog onToast={onToast} />}
            {tab === 'settings'     && <SettingsPanel onToast={onToast} />}
            {tab === 'security'     && <Security     onToast={onToast} />}
          </div>
        </main>
      </div>
    </div>
  );
}
