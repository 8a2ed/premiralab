import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { ArrowLeft, Star, CheckCircle2, Copy, Check, MessageCircle, ExternalLink, X, Eye, AlertCircle } from 'lucide-react';
import { Nav } from '../components/layout/Nav.js';
import { Footer } from '../components/layout/Footer.js';
import { Modal } from '../components/ui/Modal.js';
import { ImageWithSkeleton } from '../components/ui/ImageWithSkeleton.js';
import { money, waLink } from '../lib/utils.js';
import { api } from '../lib/api.js';
import type { PublicData, Package, PortfolioItem } from '../types.js';

interface HomeProps {
  data:    PublicData;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

const DynamicIcon = ({ name, size = 28, className = '' }: { name?: string, size?: number, className?: string }) => {
  if (!name) return <LucideIcons.Palette size={size} className={className} />;
  const Icon = (LucideIcons as any)[name];
  return Icon ? <Icon size={size} className={className} /> : <LucideIcons.Palette size={size} className={className} />;
};

export function Home({ data, onToast }: HomeProps) {
  const [orderOpen,          setOrderOpen]          = useState(false);
  const [selected,           setSelected]           = useState<Package | null>(null);
  const [initialProjectType, setInitialProjectType] = useState<string | undefined>(undefined);
  const [activePortfolio,    setActivePortfolio]    = useState<PortfolioItem | null>(null);

  const openOrder = (pkg?: Package, initialProj?: string) => {
    setSelected(pkg ?? null);
    setInitialProjectType(initialProj);
    setOrderOpen(true);
  };

  useEffect(() => {
    if (data.site?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = data.site.favicon_url;
    }
    if (data.site?.brand) {
      document.title = data.site.brand;
    }
  }, [data.site]);

  return (
    <>
      <style>{`
        :root {
          ${data.site?.primary_color ? `--primary: ${data.site.primary_color};` : ''}
          ${data.site?.accent_color ? `--accent: ${data.site.accent_color};` : ''}
          ${data.site?.accent_color ? `--accent-dim: ${data.site.accent_color}1a;` : ''}
        }
      `}</style>
      <Nav site={data.site} onOrder={() => openOrder()} />

      <main id="top">
        {/* Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="animation-fade-in">
              <div className="eyebrow" style={{ color: 'var(--accent)' }}>استوديو رقمي متكامل</div>
              <h1 style={{ lineHeight: 1.3 }}>
                {data.site?.hero_title ? data.site.hero_title.split(' ').map((word, i, arr) => 
                  i === arr.length - 1 ? <span key={i} className="highlight">{word}</span> : word + ' '
                ) : <>نحول أفكارك إلى واقع رقمي <span className="highlight">مذهل</span></>}
              </h1>
              <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
                {data.site?.hero_subtitle ?? 'من الهوية البصرية إلى المنصات المتقدمة، نحن هنا لنبني لك حضوراً استثنائياً ينمو ويتفوق.'}
              </p>
              <div className="actions" style={{ marginTop: 32 }}>
                <button className="btn btn--primary btn--lg" onClick={() => openOrder()} style={{ padding: '14px 28px', fontSize: 16 }}>
                  {data.site?.hero_primary_btn ?? 'ابدأ مشروعك الآن'} <ArrowLeft size={18} aria-hidden />
                </button>
                <a href="#portfolio" className="btn btn--lg btn--outline" style={{ padding: '14px 28px', fontSize: 16 }}>
                  {data.site?.hero_secondary_btn ?? 'تصفح أعمالنا'}
                </a>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true" style={{ backgroundImage: `url(${data.site?.logo_url ?? '/logo.png'})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.8 }} />
          </div>
        </section>

        {/* Testimonials (Social Proof First) */}
        {data.testimonials && data.testimonials.length > 0 && (
          <section className="section" style={{ background: 'var(--bg-2)' }}>
            <div className="container">
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <h2 style={{ marginBottom: 8 }}>قالوا عنا</h2>
                <p className="muted">ثقة عملائنا هي سر نجاحنا</p>
              </div>
              <div className="grid grid-3">
                {data.testimonials.map(t => (
                  <div className="card" key={t.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="stars" aria-label={`تقييم ${t.rating} من 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} fill={i < t.rating ? 'var(--warning)' : 'none'} color={i < t.rating ? 'var(--warning)' : 'var(--border)'} />
                      ))}
                    </div>
                    <p style={{ flex: 1, margin: '16px 0', fontStyle: 'italic', opacity: 0.9 }}>"{t.content}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                      {t.avatar_url && <img src={t.avatar_url} alt={t.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} loading="lazy" />}
                      <div>
                        <strong style={{ display: 'block', fontSize: 14 }}>{t.name}</strong>
                        {t.role && <span className="muted" style={{ fontSize: 12 }}>{t.role}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Services */}
        <section className="section" id="services" aria-labelledby="services-title">
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 id="services-title">خدماتنا</h2>
              <p className="muted">حلول رقمية متكاملة لجميع احتياجاتك</p>
            </div>
            <div className="grid grid-3">
              {data.services?.map(s => (
                <div className="card" key={s.id} style={{ transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 16 }}>
                    <DynamicIcon name={s.icon} size={24} />
                  </div>
                  <h3 style={{ marginBottom: 8 }}>{s.title}</h3>
                  <p className="muted" style={{ lineHeight: 1.6 }}>{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Packages */}
        <section className="section" id="packages" aria-labelledby="packages-title">
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 id="packages-title">باقات متكاملة لنجاحك</h2>
              <p className="muted">اختر الباقة الأنسب لمشروعك، وابدأ رحلة التفوق الرقمي</p>
            </div>
            <div className="grid grid-3">
              {data.packages?.map(p => (
                <div className={`card package-card ${p.popular ? 'package-card--popular' : ''}`} key={p.id} style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: 32 }}>
                  {p.popular && (
                    <div style={{ position: 'absolute', top: 16, left: 16, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999 }}>
                      الأكثر طلباً ⭐
                    </div>
                  )}
                  <h3 style={{ fontSize: 22, marginBottom: 8 }}>{p.title}</h3>
                  <div className="price" style={{ fontSize: 32, fontWeight: 900, marginBottom: 16, color: 'var(--accent)' }}>
                    {money(p.price, data.site?.currency)}
                  </div>
                  <p className="muted" style={{ marginBottom: 24, minHeight: 48 }}>{p.description}</p>
                  
                  <ul className="feature-list" aria-label="مميزات الباقة" style={{ flex: 1, marginBottom: 32 }}>
                    {p.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                        <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} aria-hidden /> 
                        <span style={{ fontSize: 14 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button className={`btn btn--lg ${p.popular ? 'btn--primary' : 'btn--outline'}`} onClick={() => openOrder(p)} style={{ width: '100%', fontSize: 16 }}>
                    اطلب الباقة الآن
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Portfolio */}
        <section className="section" id="portfolio" aria-labelledby="portfolio-title" style={{ background: 'var(--bg-2)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 id="portfolio-title">أعمال مختارة</h2>
              <p className="muted">نماذج وتجارب بصرية صممناها لعملائنا بكل فخر</p>
            </div>

            <div className="grid grid-3" style={{ marginTop: 28 }}>
              {data.portfolio?.length ? data.portfolio.map(p => (
                <div
                  className="card portfolio-card-clickable"
                  key={p.id}
                  onClick={() => setActivePortfolio(p)}
                  role="button"
                  tabIndex={0}
                  aria-label={`عرض تفاصيل ${p.title}`}
                >
                  {p.image_url && (
                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
                      <ImageWithSkeleton skeletonHeight={240} className="portfolio-img" src={p.image_url} loading="lazy" decoding="async" alt={p.title} />
                      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(4px)', zIndex: 2 }}>
                        <Eye size={12} /> استعراض العمل
                      </div>
                    </div>
                  )}
                  <h3 style={{ marginTop: 14, marginBottom: 4 }}>{p.title}</h3>
                  {p.category && <span className="tag tag--sm">{p.category}</span>}
                  <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>{p.description}</p>
                </div>
              )) : (
                <div className="empty">أضف أعمالك من لوحة الإدارة.</div>
              )}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section" id="testimonials" aria-labelledby="testimonials-title">
          <div className="container">
            <h2 id="testimonials-title">آراء العملاء</h2>
            <div className="grid grid-3" style={{ marginTop: 28 }}>
              {data.testimonials?.map(t => (
                <div className="card testimonial-card" key={t.id}>
                  <div className="stars" aria-label={`تقييم ${t.rating} من 5`}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" aria-hidden />
                    ))}
                  </div>
                  <p className="testimonial-quote">"{t.content}"</p>
                  <div className="testimonial-author">
                    {t.avatar_url && <ImageWithSkeleton skeletonHeight={48} src={t.avatar_url} alt={t.name} className="avatar" />}
                    <div>
                      <strong>{t.name}</strong>
                      <div className="muted">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer site={data.site} />

      {/* Floating WhatsApp Quick-Chat Widget */}
      <FloatingWhatsApp whatsapp={data.site?.whatsapp} brand={data.site?.brand} />

      {/* Case Study Modal */}
      {activePortfolio && (
        <CaseStudyModal
          item={activePortfolio}
          onClose={() => setActivePortfolio(null)}
          onOrder={(pkg, proj) => openOrder(pkg, proj)}
          whatsapp={data.site?.whatsapp}
          brand={data.site?.brand}
        />
      )}

      {/* Order Modal */}
      {orderOpen && (
        <OrderModal
          packages={data.packages ?? []}
          services={data.services ?? []}
          defaultPackage={selected}
          initialProjectType={initialProjectType}
          onClose={() => { setOrderOpen(false); setInitialProjectType(undefined); }}
          onDone={(msg, type) => { onToast(msg, type); setOrderOpen(false); setInitialProjectType(undefined); }}
        />
      )}
    </>
  );
}

// ─── Order Modal ──────────────────────────────────────────────────────────────

interface OrderModalProps {
  packages:           Package[];
  services:           Array<{ id: number; title: string }>;
  defaultPackage:     Package | null;
  initialProjectType?: string;
  onClose:            () => void;
  onDone:             (msg: string, type: 'success' | 'error') => void;
}

function OrderModal({ packages, services, defaultPackage, initialProjectType, onClose, onDone }: OrderModalProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [f, setF] = useState({
    name: '', phone: '', email: '',
    packageId: defaultPackage ? String(defaultPackage.id) : '',
    serviceId: '',
    projectType: initialProjectType || '',
    budget: '', deadline: '', notes: '',
    promoCode: '',
  });
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState<{ orderNo: string } | null>(null);

  // Promo states
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [promoResult, setPromoResult] = useState<{ success?: string; error?: string; discount?: number; type?: string } | null>(null);

  const updateF = (updates: Partial<typeof f>) => {
    setF(prev => ({ ...prev, ...updates }));
  };

  const handleCheckPromo = async () => {
    if (!f.promoCode) return;
    setCheckingPromo(true);
    setPromoResult(null);
    try {
      const data = await api.checkPromo(f.promoCode);
      setPromoResult({
        success: `تم تفعيل الخصم: ${data.discount_type === 'percentage' ? `${data.discount_value}%` : `${data.discount_value} ج.م`}`,
        discount: data.discount_value,
        type: data.discount_type
      });
    } catch (e: any) {
      setPromoResult({ error: e.message || 'كود غير صالح' });
      updateF({ promoCode: '' });
    } finally {
      setCheckingPromo(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.order({
        name: f.name, phone: f.phone, email: f.email || undefined,
        packageId:   f.packageId ? Number(f.packageId) : undefined,
        serviceId:   f.serviceId ? Number(f.serviceId) : undefined,
        projectType: f.projectType,
        notes:       f.notes,
        budget:      f.budget && !f.packageId ? Number(f.budget) : undefined,
        deadline:    f.deadline || undefined,
        promoCode:   f.promoCode && promoResult?.success ? f.promoCode : undefined,
      });
      setSubmitted({ orderNo: res.orderNo });
      
      // Fire Analytics Conversion Events
      try {
        const val = f.budget ? Number(f.budget) : 0;
        if (typeof (window as any).gtag === 'function') {
          (window as any).gtag('event', 'generate_lead', { value: val, currency: 'EGP' });
        }
        if (typeof (window as any).fbq === 'function') {
          (window as any).fbq('track', 'Lead', { value: val, currency: 'EGP' });
        }
      } catch (e) { /* ignore tracking errors */ }
      
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  };

  const [copied, setCopied] = useState(false);
  const copyTrackerUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  if (submitted) {
    const trackerUrl = `${window.location.origin}/?track=${submitted.orderNo}`;
    return (
      <Modal title="تم استلام طلبك بنجاح ✨" onClose={onClose}>
        <div className="order-success" style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={56} className="icon--success" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 24, marginBottom: 8 }}>شكراً لثقتك بنا!</h3>
          <p style={{ fontSize: 16 }}>رقم طلبك: <strong style={{ color: 'var(--primary)', fontSize: 18, background: 'var(--primary-dim)', padding: '4px 10px', borderRadius: 8 }}>{submitted.orderNo}</strong></p>
          <p className="muted" style={{ maxWidth: 400, margin: '16px auto' }}>تم حفظ طلبك وسيتم مراجعته والتواصل معك قريباً. يمكنك متابعة حالة الطلب في أي وقت.</p>
          
          <div style={{ background: 'var(--bg-2)', padding: 20, borderRadius: 16, border: '1px solid var(--border)', marginTop: 24 }}>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>رابط المتابعة الخاص بك (احتفظ به):</p>
            <a href={trackerUrl} style={{ color: 'var(--text)', display: 'block', marginBottom: 16, wordBreak: 'break-all', fontWeight: 600 }} target="_blank" rel="noopener">{trackerUrl}</a>
            <button className="btn btn--sm" onClick={() => copyTrackerUrl(trackerUrl)} style={{ width: '100%', justifyContent: 'center' }} type="button">
              {copied ? <><Check size={16} className="icon--success" /> تم النسخ</> : <><Copy size={16} /> نسخ رابط المتابعة</>}
            </button>
          </div>
          <button className="btn btn--primary" onClick={onClose} style={{ marginTop: 20, width: '100%' }}>إغلاق</button>
        </div>
      </Modal>
    );
  }

  const nextStep = () => {
    setError('');
    
    if (step === 1) {
      if (!f.packageId && !f.serviceId && !f.projectType) {
        setError('يرجى اختيار باقة أو خدمة أو كتابة نوع المشروع المخصص للمتابعة');
        return;
      }
    }
    
    if (step === 2) {
      // notes/budget are optional
    }
    
    if (step === 3) {
      if (!f.name || !f.phone) {
        setError('الاسم ورقم الهاتف مطلوبان للتواصل');
        return;
      }
      
      const phoneRegex = /^01\d{9}$/;
      if (!phoneRegex.test(f.phone.trim())) {
        setError('يرجى إدخال رقم هاتف صحيح مكون من 11 رقم (مثال: 01012345678)');
        return;
      }
      
      if (f.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(f.email.trim())) {
          setError('يرجى إدخال بريد إلكتروني صحيح');
          return;
        }
      }
    }
    
    setStep(s => s + 1);
  };

  const steps = [
    { num: 1, title: 'الخدمة المطلوبة' },
    { num: 2, title: 'التفاصيل' },
    { num: 3, title: 'التواصل' },
    { num: 4, title: 'التأكيد' }
  ];

  return (
    <Modal title="ابدأ مشروعك الآن" onClose={onClose} size="lg">
      <div style={{ marginBottom: 30 }}>
        {/* Stepper Header */}
        <div className="stepper-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', maxWidth: 500, margin: '0 auto', padding: '0 10px' }}>
          <div style={{ position: 'absolute', top: 16, left: 10, right: 10, height: 2, background: 'var(--border)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 16, right: 10, height: 2, background: 'var(--primary)', zIndex: 1, transition: '0.3s', width: `calc(${((step - 1) / (steps.length - 1)) * 100}% - 20px)` }} />
          
          {steps.map(s => (
            <div key={s.num} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, transition: '0.3s',
                background: step >= s.num ? 'var(--primary)' : 'var(--bg-3)', 
                color: step >= s.num ? '#fff' : 'var(--muted)',
                border: `2px solid ${step >= s.num ? 'var(--primary)' : 'var(--border)'}`,
                boxShadow: step === s.num ? '0 0 0 4px var(--primary-dim)' : 'none'
              }}>
                {step > s.num ? <Check size={16} /> : s.num}
              </div>
              <span style={{ fontSize: 11, fontWeight: step === s.num ? 700 : 500, color: step >= s.num ? 'var(--text)' : 'var(--muted)' }}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ minHeight: 280, position: 'relative' }}>
        {error && (
          <div className="animation-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>ما هو نوع الخدمة التي تبحث عنها؟</h3>
            <div className="grid grid-2" style={{ gap: 20 }}>
              <div className="form-field">
                <label className="form-label" htmlFor="order-pkg">الباقات الجاهزة</label>
                <select id="order-pkg" className="select" style={{ padding: 14, fontSize: 15, borderColor: error && !f.packageId && !f.serviceId && !f.projectType ? '#ef4444' : undefined }} value={f.packageId} onChange={e => updateF({ packageId: e.target.value, serviceId: e.target.value ? '' : f.serviceId })}>
                  <option value="">اختر باقة (اختياري)</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.title} — {money(p.price)}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-svc">الخدمات الفردية</label>
                <select id="order-svc" className="select" style={{ padding: 14, fontSize: 15, borderColor: error && !f.packageId && !f.serviceId && !f.projectType ? '#ef4444' : undefined }} value={f.serviceId} onChange={e => updateF({ serviceId: e.target.value, packageId: e.target.value ? '' : f.packageId })}>
                  <option value="">اختر خدمة (اختياري)</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <div className="muted" style={{ fontSize: 12 }}>أو تخصيص مشروعك</div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="order-type">نوع المشروع المخصص</label>
              <input id="order-type" className="input" style={{ padding: 14, borderColor: error && !f.packageId && !f.serviceId && !f.projectType ? '#ef4444' : undefined }} placeholder="مثال: هوية بصرية كاملة + تصميم موقع..." value={f.projectType} onChange={e => updateF({ projectType: e.target.value })} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>تفاصيل {f.packageId ? 'الباقة الإضافية' : 'المشروع'}</h3>
            
            <div className="form-grid">
              {!f.packageId && (
                <div className="form-field">
                  <label className="form-label" htmlFor="order-budget">الميزانية المتوقعة (اختياري)</label>
                  <div style={{ position: 'relative' }}>
                    <input id="order-budget" className="input" style={{ padding: 14, paddingRight: 45 }} type="number" min="0" placeholder="مثال: 5000" value={f.budget} onChange={e => updateF({ budget: e.target.value })} />
                    <span style={{ position: 'absolute', right: 14, top: 14, color: 'var(--muted)', fontSize: 14 }}>ج.م</span>
                  </div>
                </div>
              )}
              
              <div className="form-field" style={{ gridColumn: f.packageId ? '1 / -1' : undefined }}>
                <label className="form-label" htmlFor="order-deadline">الموعد النهائي لتسليم المشروع (اختياري)</label>
                <input id="order-deadline" className="input" style={{ padding: 14 }} type="date" value={f.deadline} onChange={e => updateF({ deadline: e.target.value })} />
              </div>
            </div>

            <div className="form-field" style={{ marginTop: 20 }}>
              <label className="form-label" htmlFor="order-notes">نبذة عن المشروع وأهدافه</label>
              <textarea id="order-notes" className="textarea" rows={4} maxLength={2000} style={{ padding: 14 }}
                placeholder="صف لنا فكرتك، متطلباتك الخاصة، الروابط المرجعية، أو أي تفاصيل أخرى ترغب بإضافتها..."
                value={f.notes} onChange={e => updateF({ notes: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>كيف يمكننا التواصل معك؟</h3>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="order-name">الاسم الكامل *</label>
              <input id="order-name" className="input" style={{ padding: 14, borderColor: error && !f.name ? '#ef4444' : undefined }} required placeholder="محمد أحمد" value={f.name} onChange={e => updateF({ name: e.target.value })} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="order-phone">رقم الهاتف / الواتساب *</label>
                <input id="order-phone" className="input" style={{ padding: 14, direction: 'ltr', textAlign: 'right', borderColor: error && !f.phone ? '#ef4444' : undefined }} required placeholder="01xxxxxxxxx" value={f.phone} onChange={e => updateF({ phone: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-email">البريد الإلكتروني (اختياري)</label>
                <input id="order-email" className="input" style={{ padding: 14 }} type="email" placeholder="email@example.com" value={f.email} onChange={e => updateF({ email: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18, textAlign: 'center' }}>مراجعة الطلب</h3>
            <div style={{ background: 'var(--bg-2)', borderRadius: 16, border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الاسم</span><strong>{f.name}</strong></div>
                <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>رقم التواصل</span><strong style={{ direction: 'ltr', display: 'inline-block' }}>{f.phone}</strong></div>
                
                {f.packageId && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الباقة المختارة</span><strong style={{ color: 'var(--primary)' }}>{packages.find(p => p.id === Number(f.packageId))?.title}</strong></div>}
                {f.serviceId && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الخدمة المختارة</span><strong style={{ color: 'var(--primary)' }}>{services.find(s => s.id === Number(f.serviceId))?.title}</strong></div>}
                {f.projectType && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>نوع المشروع</span><strong>{f.projectType}</strong></div>}
                
                {f.budget && !f.packageId && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الميزانية المقترحة</span><strong>{money(Number(f.budget))}</strong></div>}
                {f.deadline && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الموعد النهائي</span><strong>{f.deadline}</strong></div>}
              </div>
              {f.notes && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <span className="muted" style={{ fontSize: 12, display: 'block' }}>ملاحظات</span>
                  <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{f.notes}</p>
                </div>
              )}

              {/* Promo Code Section */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label className="form-label">لديك كود خصم؟ (اختياري)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="input" style={{ flex: 1, padding: '10px 14px' }} placeholder="أدخل الكود هنا" value={f.promoCode} onChange={e => { updateF({ promoCode: e.target.value }); setPromoResult(null); }} />
                  <button type="button" className="btn btn--outline" onClick={handleCheckPromo} disabled={!f.promoCode || checkingPromo}>
                    {checkingPromo ? 'جاري التحقق...' : 'تطبيق'}
                  </button>
                </div>
                {promoResult?.success && <div style={{ color: 'var(--success)', fontSize: 13, marginTop: 8, fontWeight: 500 }}>✔️ {promoResult.success}</div>}
                {promoResult?.error && <div style={{ color: 'var(--error)', fontSize: 13, marginTop: 8, fontWeight: 500 }}>❌ {promoResult.error}</div>}
              </div>
              
              <div style={{ marginTop: 24, padding: '16px', background: 'rgba(205, 69, 205, 0.05)', borderRadius: 12, border: '1px dashed var(--primary-dim)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
                  <strong style={{ fontSize: 14 }}>طرق الدفع المتاحة</strong>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  بعد تأكيد الطلب، سيتم إصدار فاتورة رقمية يمكنك دفعها بسهولة عبر:
                  <br />
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>InstaPay، فودافون كاش، أو التحويل البنكي</span>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer Actions */}
      <div className="stepper-footer-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', gap: 16 }}>
        {step > 1 ? (
          <button type="button" className="btn" onClick={() => setStep(s => s - 1)} disabled={loading}>السابق</button>
        ) : (
          <button type="button" className="btn" onClick={onClose} style={{ color: 'var(--muted)', background: 'transparent', borderColor: 'transparent' }}>إلغاء</button>
        )}
        
        {step < 4 ? (
          <button type="button" className="btn btn--primary" onClick={nextStep} style={{ minWidth: 120 }}>التالي</button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={submit} disabled={loading} style={{ minWidth: 140, boxShadow: '0 0 24px var(--primary-dim)' }}>
            {loading ? 'جاري الإرسال...' : 'تأكيد الطلب'}
          </button>
        )}
      </div>
    </Modal>
  );
}

interface CaseStudyModalProps {
  item:     PortfolioItem;
  onClose:  () => void;
  onOrder:  (pkg?: Package, initialProj?: string) => void;
  whatsapp?: string;
  brand?:   string;
}

function CaseStudyModal({ item, onClose, onOrder, whatsapp, brand }: CaseStudyModalProps) {
  const waUrl = whatsapp
    ? waLink(whatsapp, `مرحباً ${brand || 'PREMIRALAB'}، أعجبني مشروع "${item.title}" وأريد تنفيذ مشروع مشابه.`)
    : null;

  return (
    <Modal title={item.title} onClose={onClose} size="lg">
      <div className="case-study-modal">
        {item.image_url && (
          <div className="case-study-hero-img-wrap">
            <ImageWithSkeleton skeletonHeight={400} src={item.image_url} alt={item.title} className="case-study-hero-img" />
          </div>
        )}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              {item.category && <span className="tag" style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600 }}>{item.category}</span>}
              <h3 style={{ margin: '8px 0 0', fontSize: 22 }}>{item.title}</h3>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn--sm" style={{ borderColor: '#25D366', color: '#25D366' }}>
                  💬 استفسر عبر واتساب
                </a>
              )}
              <button
                className="btn btn--primary btn--sm"
                onClick={() => {
                  onClose();
                  onOrder(undefined, item.title);
                }}
              >
                اطلب مشروعاً مماثلاً
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-3)', padding: 18, borderRadius: 'var(--radius-sm)', lineHeight: 1.8 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--text)' }}>عن هذا العمل:</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {item.description || 'مشروع تصميم وهوية بصرية رقمية متكاملة تم تطويره وفق أعلى معايير الجودة والتجربة البصرية.'}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Floating WhatsApp Widget ──────────────────────────────────────────────────

function FloatingWhatsApp({ whatsapp, brand }: { whatsapp?: string; brand?: string }) {
  const [open, setOpen] = useState(false);
  if (!whatsapp) return null;

  const quickLinks = [
    { title: 'طلب عرض سعر سريع', msg: `مرحباً ${brand || 'PREMIRALAB'}، أريد الحصول على عرض سعر لمشروعي الجديد.` },
    { title: 'استفسار عن الباقات المتاحة', msg: `مرحباً ${brand || 'PREMIRALAB'}، لدي استفسار بخصوص باقات التصميم.` },
    { title: 'متابعة طلب قائم', msg: `مرحباً ${brand || 'PREMIRALAB'}، أريد الاستفسار عن حالة طلبي.` },
  ];

  return (
    <div className="floating-wa-container">
      {open && (
        <div className="floating-wa-card card">
          <div className="floating-wa-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="wa-avatar-badge">
                <img src="/logo.png" alt="PREMIRALAB" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
                <span className="wa-online-dot" />
              </div>
              <div>
                <strong>{brand || 'PREMIRALAB'}</strong>
                <div style={{ fontSize: 11, color: '#25D366' }}>متصل الآن — نرد خلال دقائق</div>
              </div>
            </div>
            <button className="btn btn--icon btn--sm" onClick={() => setOpen(false)} aria-label="إغلاق">
              <X size={16} />
            </button>
          </div>

          <p style={{ fontSize: 13, margin: '12px 0 10px', color: 'var(--text-muted)' }}>
            مرحباً بك! كيف يمكننا مساعدتك اليوم؟ اختر من الخيارات السريعة:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickLinks.map((q, idx) => (
              <a
                key={idx}
                href={waLink(whatsapp, q.msg)}
                target="_blank"
                rel="noopener noreferrer"
                className="floating-wa-item"
                onClick={() => setOpen(false)}
              >
                <span>{q.title}</span>
                <ExternalLink size={13} style={{ opacity: 0.7 }} />
              </a>
            ))}
          </div>
        </div>
      )}

      <button
        className="floating-wa-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="تواصل عبر واتساب"
      >
        <MessageCircle size={26} />
        <span className="floating-wa-pulse" />
      </button>
    </div>
  );
}
