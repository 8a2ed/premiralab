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

const SECTIONS = ['services', 'packages', 'portfolio', 'testimonials'];

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

  // Active section tracker via IntersectionObserver
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });
    return () => observerRef.current?.disconnect();
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
            {[
              { id: 'services', label: 'الخدمات' },
              { id: 'packages', label: 'الباقات' },
              { id: 'portfolio', label: 'أعمالنا' },
              { id: 'testimonials', label: 'العملاء' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                aria-label={`انتقل إلى ${label}`}
                style={{
                  color: activeSection === id ? 'var(--text)' : undefined,
                  background: activeSection === id ? 'var(--accent-dim)' : undefined,
                  borderRadius: 8,
                  position: 'relative',
                  transition: 'all .2s ease',
                }}
              >
                {label}
                {activeSection === id && (
                  <span aria-hidden style={{
                    position: 'absolute',
                    bottom: 2,
                    right: '20%',
                    left: '20%',
                    height: 2,
                    background: 'var(--accent)',
                    borderRadius: 2,
                    display: 'block',
                  }} />
                )}
              </button>
            ))}
            <button
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
            <button onClick={() => scrollTo('services')}>الخدمات</button>
            <button onClick={() => scrollTo('packages')}>الباقات</button>
            <button onClick={() => scrollTo('portfolio')}>أعمالنا</button>
            <button onClick={() => scrollTo('testimonials')}>آراء العملاء</button>
            <button onClick={() => { onClientClick(); setOpen(false); }} style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{isClientLoggedIn ? 'صفحتي 👤' : 'تسجيل الدخول / حسابي'}</button>
            <button className="btn btn--primary" onClick={() => { onOrder(); setOpen(false); }}>ابدأ مشروعك</button>
          </nav>
        )}
      </header>
    </>
  );
}
