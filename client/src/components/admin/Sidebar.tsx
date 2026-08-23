import {
  LayoutDashboard, Package, Users, BriefcaseBusiness, Palette, Star,
  Activity, Settings, LockKeyhole, FileText, LogOut, Ticket, HelpCircle,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard' | 'orders' | 'clients' | 'projects'
  | 'packages'  | 'services' | 'portfolio' | 'testimonials' | 'faqs' | 'promo'
  | 'activity'  | 'settings' | 'security';

const NAV_ITEMS: Array<[AdminTab, string, typeof LayoutDashboard]> = [
  ['dashboard',    'لوحة التحكم',  LayoutDashboard],
  ['orders',       'الطلبات',       Package],
  ['clients',      'العملاء',       Users],
  ['projects',     'المشاريع',      BriefcaseBusiness],
  ['promo',        'كوبونات الخصم', Ticket],
  ['packages',     'الباقات',       Package],
  ['services',     'الخدمات',       Palette],
  ['portfolio',    'الأعمال',       FileText],
  ['testimonials', 'التقييمات',     Star],
  ['faqs',         '\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629', HelpCircle],
  ['activity',     'سجل النشاط',   Activity],
  ['settings',     'الإعدادات',    Settings],
  ['security',     'الأمان',        LockKeyhole],
];

interface SidebarProps {
  tab:            AdminTab;
  onTab:          (t: AdminTab) => void;
  unreadCount:    number;
  onLogout:       () => void;
}

export function Sidebar({ tab, onTab, unreadCount, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="قائمة الإدارة">
      <div className="brand sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="PREMIRALAB" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
        <span>PREMIRA<b>LAB</b></span>
      </div>

      <nav>
        {NAV_ITEMS.map(([id, label, Icon]) => (
          <button
            key={id}
            className={`side-item ${tab === id ? 'side-item--active' : ''}`}
            onClick={() => onTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            {id === 'orders' && unreadCount > 0 && (
              <span className="badge" aria-label={`${unreadCount} إشعار جديد`}>{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      <button className="side-item side-item--logout" onClick={onLogout} aria-label="تسجيل الخروج">
        <LogOut size={17} aria-hidden="true" />
        <span>تسجيل الخروج</span>
      </button>
    </aside>
  );
}

export { NAV_ITEMS };
