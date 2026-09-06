import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import type { SiteSettings } from '../../types.js';

interface NavProps {
  site?: SiteSettings;
  onOrder: () => void;
  onClientClick: () => void;
  isClientLoggedIn?: boolean;
}

const PAGE_SECTIONS = ['testimonials', 'services', 'packages', 'portfolio'];
const MENU_ITEMS = [
  { id: 'services', label: 'الخدمات' },
  { id: 'packages', label: 'الباقات' },
  { id: 'portfolio', label: 'أعمالنا' },
  { id: 'testimonials', label: 'العملاء' },
];

export function Nav({ site = {} as SiteSettings, onOrder, onClientClick, isClientLoggedIn }: NavProps) {
  const [open, setOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll progress bar
  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Active section tracker via scroll position (more robust than observer for this layout)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY + 120; // 120px offset for navbar and breathing room
      let current = '';
      for (const section of PAGE_SECTIONS) {
        const el = document.getElementById(section);
        if (el && el.offsetTop <= currentScrollPos) {
          current = section;
        }
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initialize on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Scroll progress bar */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: 3,
          width: `${scrollProgress}%`,
          background: 'linear-gradient(90deg, var(--accent), #f59e0b)',
          zIndex: 200,
          transition: 'width 0.15s linear',
          pointerEvents: 'none',
        }}
      />

      <header className="nav">
        <div className="container nav-inner">
          {/* Brand */}
          <div className="brand" onClick={() => scrollTo('top')} role="button" tabIndex={0} aria-label="العودة للرئيسية">
            <img src={site.logo_url || '/logo.png'} alt={site.brand || 'PREMIRALAB'} className="brand-logo" />
            <b className="brand-name">{site.brand || 'PREMIRALAB'}</b>
          </div>

          {/* Desktop nav */}
          <nav className="nav-links" aria-label="التنقل الرئيسي">
            {MENU_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                className={`nav-link-btn ${activeSection === id ? 'active' : ''}`}
                onClick={() => scrollTo(id)}
                aria-label={`انتقل إلى ${label}`}
              >
                {label}
              </button>
            ))}
            <button
              className="nav-link-btn"
              onClick={onClientClick}
              aria-label="تسجيل الدخول / حسابي"
              style={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              {isClientLoggedIn ? 'صفحتي 👤' : 'تسجيل الدخول'}
            </button>
          </nav>

          {/* Actions */}
          <div className="nav-actions">
            <ThemeToggle />
            <button className="btn btn--primary nav-cta-btn" onClick={onOrder}>ابدأ مشروعك</button>
            {/* Mobile hamburger */}
            <button
              className="btn btn--icon nav-hamburger"
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={open}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown with slide-down animation */}
        {open && (
          <nav className="nav-mobile" aria-label="قائمة الجوال">
            {MENU_ITEMS.map(({ id, label }) => (
              <button 
                key={id}
                onClick={() => scrollTo(id)}
                style={{ color: activeSection === id ? 'var(--accent)' : undefined }}
              >
                {label}
              </button>
            ))}
            <button onClick={() => { onClientClick(); setOpen(false); }} style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{isClientLoggedIn ? 'صفحتي 👤' : 'تسجيل الدخول / حسابي'}</button>
            <button className="btn btn--primary" onClick={() => { onOrder(); setOpen(false); }}>ابدأ مشروعك</button>
          </nav>
        )}
      </header>
    </>
  );
}
