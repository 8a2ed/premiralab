import { waLink } from '../../lib/utils.js';
import type { SiteSettings } from '../../types.js';

interface FooterProps {
  site: SiteSettings;
}

export function Footer({ site }: FooterProps) {
  const whatsappHref = site.whatsapp
    ? waLink(site.whatsapp, `مرحباً ${site.brand || 'PREMIRALAB'}، أريد الاستفسار عن خدماتكم.`)
    : null;

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img src="/logo.png" alt="PREMIRALAB" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
            <strong style={{ fontSize: 18 }}>{site.brand || 'PREMIRALAB'}</strong>
          </div>
          <p>نحوّل أفكارك إلى تجارب بصرية قوية.</p>
        </div>
        <div className="footer-contact">
          {site.email && (
            <a href={`mailto:${site.email}`} className="footer-link" aria-label={`البريد الإلكتروني: ${site.email}`}>
              📧 {site.email}
            </a>
          )}
          {site.phone && (
            <a href={`tel:${site.phone}`} className="footer-link" aria-label={`اتصل بنا: ${site.phone}`}>
              📞 {site.phone}
            </a>
          )}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="footer-link footer-link--whatsapp" aria-label="تواصل معنا عبر واتساب">
              💬 واتساب
            </a>
          )}
        </div>
        <div className="footer-copy">
          © {new Date().getFullYear()} {site.brand || 'PREMIRALAB'}. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
