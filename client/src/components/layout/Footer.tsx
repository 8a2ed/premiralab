import { useState } from 'react';
import { Mail, Phone, MessageCircle, ChevronLeft } from 'lucide-react';
import { waLink } from '../../lib/utils.js';
import type { SiteSettings } from '../../types.js';
import { Modal } from '../ui/Modal.js';

interface FooterProps {
  site: SiteSettings;
}

export function Footer({ site }: FooterProps) {
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(null);

  const whatsappHref = site.whatsapp
    ? waLink(site.whatsapp, `مرحباً ${site.brand || 'PREMIRALAB'}، أريد الاستفسار عن خدماتكم.`)
    : null;

  return (
    <>
      <footer className="footer-modern">
        <div className="footer-glow-line" />
        <div className="container">
          <div className="footer-modern__top">
            {/* Brand & Description */}
            <div className="footer-col brand-col">
              <div className="footer-logo">
                <img src={site.logo_url || '/logo.png'} alt={site.brand || 'PREMIRALAB'} />
                <span>{site.brand || 'PREMIRALAB'}</span>
              </div>
              <p className="footer-desc">
                {site.footer_text || 'نحوّل أفكارك إلى تجارب بصرية قوية ومشاريع رقمية مبتكرة تصنع الفارق وتميزك عن منافسيك.'}
              </p>
            </div>

            {/* Quick Links */}
            <div className="footer-col">
              <h4 className="footer-title">روابط سريعة</h4>
              <div className="footer-links">
                <a href="#services" className="footer-link"><ChevronLeft size={14} /> خدماتنا</a>
                <a href="#portfolio" className="footer-link"><ChevronLeft size={14} /> معرض الأعمال</a>
                <a href="#packages" className="footer-link"><ChevronLeft size={14} /> الباقات والأسعار</a>
                <a href="#faqs" className="footer-link"><ChevronLeft size={14} /> الأسئلة الشائعة</a>
              </div>
            </div>

            {/* Contact Info */}
            <div className="footer-col">
              <h4 className="footer-title">تواصل معنا</h4>
              <div className="footer-contact-list">
                {site.email && (
                  <a href={`mailto:${site.email}`} className="footer-contact-item">
                    <div className="icon-wrap"><Mail size={16} /></div>
                    <span dir="ltr">{site.email}</span>
                  </a>
                )}
                {site.phone && (
                  <a href={`tel:${site.phone}`} className="footer-contact-item" dir="ltr">
                    <div className="icon-wrap"><Phone size={16} /></div>
                    <span>{site.phone}</span>
                  </a>
                )}
                {whatsappHref && (
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="footer-contact-item wa-item">
                    <div className="icon-wrap"><MessageCircle size={16} /></div>
                    <span>استشارة عبر واتساب</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="footer-modern__bottom">
            <p className="copyright">
              © {new Date().getFullYear()} <span className="brand-highlight">{site.brand || 'PREMIRALAB'}</span>. جميع الحقوق محفوظة.
            </p>
            <div className="footer-legal">
              {site.privacy_policy && (
                <button type="button" className="btn-link" onClick={() => setLegalView('privacy')}>
                  سياسة الخصوصية
                </button>
              )}
              {site.privacy_policy && site.terms_conditions && <span className="dot">•</span>}
              {site.terms_conditions && (
                <button type="button" className="btn-link" onClick={() => setLegalView('terms')}>
                  الشروط والأحكام
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Modals */}
      {legalView && (
        <Modal 
          title={legalView === 'privacy' ? 'سياسة الخصوصية' : 'الشروط والأحكام'} 
          onClose={() => setLegalView(null)} 
          size="lg"
        >
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.9, color: 'var(--text-muted)', textAlign: 'start' }}>
            {legalView === 'privacy' ? site.privacy_policy : site.terms_conditions}
          </div>
        </Modal>
      )}
    </>
  );
}
