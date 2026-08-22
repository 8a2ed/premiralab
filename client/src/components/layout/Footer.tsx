import { waLink } from '../../lib/utils.js';
import type { SiteSettings } from '../../types.js';

interface FooterProps {
  site: SiteSettings;
}

export function Footer({ site }: FooterProps) {
  const whatsappHref = site.whatsapp
    ? waLink(site.whatsapp, `مرحباً ${site.brand || 'Design Studio'}، أريد الاستفسار عن خدماتكم.`)
    : null;

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <strong>{site.brand || 'Design Studio'}</strong>
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
          © {new Date().getFullYear()} {site.brand || 'Design Studio'}. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
