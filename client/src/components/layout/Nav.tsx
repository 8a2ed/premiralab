import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import type { SiteSettings } from '../../types.js';

interface NavProps {
  site?: SiteSettings;
  onOrder: () => void;
  onClientClick: () => void;
}

export function Nav({ site = {} as SiteSettings, onOrder, onClientClick }: NavProps) {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          {/* Brand */}
          <div className="brand" onClick={() => scrollTo('top')} role="button" tabIndex={0} aria-label="العودة للرئيسية">
            <img src={site.logo_url || '/logo.png'} alt={site.brand || 'PREMIRALAB'} className="brand-logo" />
            <b className="brand-name">{site.brand || 'PREMIRALAB'}</b>
          </div>

          {/* Desktop nav */}
          <nav className="nav-links" aria-label="التنقل الرئيسي">
            <button onClick={() => scrollTo('services')} aria-label="انتقل إلى الخدمات">الخدمات</button>
            <button onClick={() => scrollTo('packages')} aria-label="انتقل إلى الباقات">الباقات</button>
            <button onClick={() => scrollTo('portfolio')} aria-label="انتقل إلى أعمالنا">أعمالنا</button>
            <button onClick={() => scrollTo('testimonials')} aria-label="انتقل إلى آراء العملاء">العملاء</button>
            <button onClick={onClientClick} aria-label="تسجيل الدخول / حسابي" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>تسجيل الدخول</button>
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

        {/* Mobile dropdown */}
        {open && (
          <nav className="nav-mobile" aria-label="قائمة الجوال">
            <button onClick={() => scrollTo('services')}>الخدمات</button>
            <button onClick={() => scrollTo('packages')}>الباقات</button>
            <button onClick={() => scrollTo('portfolio')}>أعمالنا</button>
            <button onClick={() => scrollTo('testimonials')}>آراء العملاء</button>
            <button onClick={() => { onClientClick(); setOpen(false); }} style={{ color: 'var(--accent)', fontWeight: 'bold' }}>تسجيل الدخول / حسابي</button>
            <button className="btn btn--primary" onClick={() => { onOrder(); setOpen(false); }}>ابدأ مشروعك</button>
          </nav>
        )}
      </header>
    </>
  );
}
