import { useState, useEffect, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { 
  ArrowLeft, Star, CheckCircle2, Copy, Check, MessageCircle, 
  ExternalLink, X, Eye, AlertCircle, ChevronDown, Sparkles, Shield, Zap,
  TrendingUp, Award, Clock, Headphones, ArrowUp, Layers
} from 'lucide-react';
import { Nav } from '../components/layout/Nav.js';
import { Footer } from '../components/layout/Footer.js';
import { Modal } from '../components/ui/Modal.js';
import { ImageWithSkeleton } from '../components/ui/ImageWithSkeleton.js';
import { Carousel } from '../components/ui/Carousel.js';
import { money, waLink } from '../lib/utils.js';
import { api } from '../lib/api.js';
import type { PublicData, Package, PortfolioItem, FAQ } from '../types.js';

interface HomeProps {
  data:    PublicData;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onClientClick: () => void;
}

const DynamicIcon = ({ name, size = 28, className = '' }: { name?: string, size?: number, className?: string }) => {
  if (!name) return <LucideIcons.Palette size={size} className={className} />;
  const Icon = (LucideIcons as any)[name];
  return Icon ? <Icon size={size} className={className} /> : <LucideIcons.Palette size={size} className={className} />;
};

const FaqItem = ({ faq }: { faq: FAQ }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item" style={{ borderBottom: '1px solid var(--border-2)', padding: '18px 0' }}>
      <button 
        onClick={() => setOpen(!open)}
        className="faq-trigger"
        style={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'none', 
          border: 'none', 
          padding: 0, 
          color: 'var(--text)', 
          cursor: 'pointer', 
          textAlign: 'right', 
          fontSize: 16, 
          fontWeight: 700 
        }}
        aria-expanded={open}
      >
        <span style={{ color: open ? 'var(--accent)' : 'var(--text)', transition: 'color 0.2s' }}>{faq.question}</span>
        <ChevronDown 
          size={20} 
          style={{ 
            transform: open ? 'rotate(180deg)' : 'none', 
            transition: 'transform 0.25s ease',
            color: open ? 'var(--accent)' : 'var(--text-muted)'
          }} 
        />
      </button>
      {open && (
        <div className="animation-fade-in" style={{ marginTop: 12, color: 'var(--text-muted)', lineHeight: 1.8, fontSize: 15 }}>
          {faq.answer.split('\n').map((line, i) => <p key={i} style={{ margin: '0 0 8px' }}>{line}</p>)}
        </div>
      )}
    </div>
  );
};

export function Home({ data, onToast, onClientClick }: HomeProps) {
  const [orderOpen,          setOrderOpen]          = useState(false);
  const [selected,           setSelected]           = useState<Package | null>(null);
  const [initialProjectType, setInitialProjectType] = useState<string | undefined>(undefined);
  const [activePortfolio,    setActivePortfolio]    = useState<PortfolioItem | null>(null);
  const [selectedCategory,   setSelectedCategory]   = useState<string>('all');
  const [scrollProgress,     setScrollProgress]     = useState(0);
  const [showScrollTop,      setShowScrollTop]      = useState(false);

  // Track scroll progress and back-to-top visibility
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentProgress = totalScroll > 0 ? (window.scrollY / totalScroll) * 100 : 0;
      setScrollProgress(currentProgress);
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openOrder = async (pkg?: Package, initialProj?: string) => {
    try {
      await api.client.me();
      setSelected(pkg ?? null);
      setInitialProjectType(initialProj);
      setOrderOpen(true);
    } catch {
      onToast('يرجى تسجيل الدخول أو إنشاء حساب أولاً لتقديم طلب', 'info');
      window.location.href = '/client?redirect=order';
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('order') === '1') {
      openOrder();
      url.searchParams.delete('order');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

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

  // Extract unique categories from portfolio
  const categories = useMemo(() => {
    if (!data.portfolio) return ['all'];
    const cats = Array.from(new Set(data.portfolio.map(p => p.category).filter(Boolean))) as string[];
    return ['all', ...cats];
  }, [data.portfolio]);

  // Filtered portfolio list
  const filteredPortfolio = useMemo(() => {
    if (!data.portfolio) return [];
    if (selectedCategory === 'all') return data.portfolio;
    return data.portfolio.filter(p => p.category === selectedCategory);
  }, [data.portfolio, selectedCategory]);

  return (
    <>
      <style>{`
        :root {
          ${data.site?.primary_color ? `--primary: ${data.site.primary_color};` : ''}
          ${data.site?.accent_color ? `--accent: ${data.site.accent_color};` : ''}
          ${data.site?.accent_color ? `--accent-dim: ${data.site.accent_color}1a;` : ''}
        }
      `}</style>

      {/* Top Scroll Progress Indicator */}
      <div 
        className="top-scroll-progress" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          height: 3, 
          width: `${scrollProgress}%`, 
          background: 'linear-gradient(90deg, var(--accent), #f59e0b)', 
          zIndex: 100, 
          transition: 'width 0.1s ease-out' 
        }} 
      />

      <Nav site={data.site} onOrder={() => openOrder()} onClientClick={onClientClick} />

      <main id="top">
        {/* Hero Section */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="animation-fade-in hero-text-col">
              <div className="hero-badge">
                <Sparkles size={15} className="hero-badge-icon" />
                <span>{data.site?.hero_badge || 'استوديو رقمي متكامل للتصميم والتطوير'}</span>
              </div>
              
              <h1 className="hero-heading">
                {data.site?.hero_title ? data.site.hero_title.split(' ').map((word, i, arr) => 
                  i === arr.length - 1 ? <span key={i} className="highlight">{word}</span> : word + ' '
                ) : <>نحوّل أفكارك إلى واقع رقمي <span className="highlight">استثنائي</span></>}
              </h1>
              
              <p className="hero-subtitle">
                {data.site?.hero_subtitle ?? 'من الهوية البصرية وتصميم الواجهات إلى المنصات المتقدمة، نحن هنا لنبني لعلامتك التجارية حضورًا قويًا ينمو ويتفوق.'}
              </p>
              
              <div className="actions hero-actions">
                <button className="btn btn--primary btn--lg hero-btn-main" onClick={() => openOrder()}>
                  {data.site?.hero_primary_btn ?? 'ابدأ مشروعك الآن'} <ArrowLeft size={18} aria-hidden />
                </button>
                <a href="#portfolio" className="btn btn--lg btn--outline hero-btn-secondary">
                  {data.site?.hero_secondary_btn ?? 'تصفح أعمالنا'}
                </a>
              </div>

              {/* Trust badges */}
              <div className="hero-trust-row">
                <div className="hero-trust-item">
                  <Shield size={16} style={{ color: 'var(--success)' }} />
                  <span>{data.site?.hero_trust_1 || 'ضمان أعلى جودة'}</span>
                </div>
                <div className="hero-trust-item">
                  <Zap size={16} style={{ color: 'var(--warning)' }} />
                  <span>{data.site?.hero_trust_2 || 'تسليم سريع ومتقن'}</span>
                </div>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="hero-art-wrapper">
              <div className="hero-art-glow" />
              <div 
                className="hero-art" 
                aria-hidden="true" 
                style={{ 
                  backgroundImage: `radial-gradient(circle at 45% 40%, var(--accent-dim) 0%, #120e17 40%, #060608 80%), url(${data.site?.logo_url ?? '/logo.png'})`,
                  backgroundSize: 'cover, 78%',
                  backgroundRepeat: 'no-repeat, no-repeat',
                  backgroundPosition: 'center, center'
                }} 
              />
            </div>
          </div>
        </section>

        {/* Live Metrics & Highlights Bar */}
        <section className="stats-banner-section">
          <div className="container">
            <div className="stats-glass-bar card">
              <div className="stat-tile">
                <div className="stat-tile__icon-wrap">
                  <TrendingUp size={22} className="stat-tile__icon" />
                </div>
                <div>
                  <div className="stat-tile__number">{data.site?.stat_1_num || '+150'}</div>
                  <div className="stat-tile__label">{data.site?.stat_1_label || 'مشروع ناجح ومكتمل'}</div>
                </div>
              </div>

              <div className="stat-tile__divider" />

              <div className="stat-tile">
                <div className="stat-tile__icon-wrap">
                  <Award size={22} className="stat-tile__icon" />
                </div>
                <div>
                  <div className="stat-tile__number">{data.site?.stat_2_num || '100%'}</div>
                  <div className="stat-tile__label">{data.site?.stat_2_label || 'نسبة رضا وثقة العملاء'}</div>
                </div>
              </div>

              <div className="stat-tile__divider" />

              <div className="stat-tile">
                <div className="stat-tile__icon-wrap">
                  <Clock size={22} className="stat-tile__icon" />
                </div>
                <div>
                  <div className="stat-tile__number">{data.site?.stat_3_num || '48 س'}</div>
                  <div className="stat-tile__label">{data.site?.stat_3_label || 'متوسط بدء التنفيذ'}</div>
                </div>
              </div>

              <div className="stat-tile__divider" />

              <div className="stat-tile">
                <div className="stat-tile__icon-wrap">
                  <Headphones size={22} className="stat-tile__icon" />
                </div>
                <div>
                  <div className="stat-tile__number">{data.site?.stat_4_num || '24/7'}</div>
                  <div className="stat-tile__label">{data.site?.stat_4_label || 'متابعة ودعم مستمر'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials (Social Proof) */}
        {data.testimonials && data.testimonials.length > 0 && (
          <section className="section" id="testimonials" style={{ background: 'var(--bg-2)' }}>
            <div className="container">
              <div className="section-header">
                <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 8 }}>{data.site?.testimonials_eyebrow || 'آراء العملاء'}</div>
                <h2>{data.site?.testimonials_title || 'ثقة عملائنا هي سر نجاحنا'}</h2>
                <p className="muted">{data.site?.testimonials_subtitle || 'تجارب حقيقية لشركاء النجاح الذين وضعوا ثقتهم في استوديوهاتنا'}</p>
              </div>

              <Carousel autoPlay={true} intervalMs={3800}>
                {data.testimonials.map(t => (
                  <div className="card testimonial-card" key={t.id}>
                    <div className="stars" aria-label={`تقييم ${t.rating} من 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} fill={i < t.rating ? '#f59e0b' : 'none'} color={i < t.rating ? '#f59e0b' : 'var(--border)'} />
                      ))}
                    </div>
                    <p className="testimonial-quote">"{t.content}"</p>
                    <div className="testimonial-author">
                      {t.avatar_url ? (
                        <img src={t.avatar_url} alt={t.name} className="avatar" loading="lazy" />
                      ) : (
                        <div className="avatar avatar--placeholder">{t.name?.charAt(0) || 'U'}</div>
                      )}
                      <div>
                        <strong className="testimonial-author-name">{t.name}</strong>
                        {t.role && <span className="muted testimonial-author-role">{t.role}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </Carousel>
            </div>
          </section>
        )}

        {/* Services */}
        <section className="section" id="services" aria-labelledby="services-title">
          <div className="container">
            <div className="section-header">
              <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 8 }}>{data.site?.services_eyebrow || 'خدماتنا المتخصصة'}</div>
              <h2 id="services-title">{data.site?.services_title || 'حلول رقمية متكاملة لنمو أعمالك'}</h2>
              <p className="muted">{data.site?.services_subtitle || 'نقدم مجموعة متكاملة من الخدمات الإبداعية والتقنية وفق أعلى معايير الجودة العالمية'}</p>
            </div>

            <div className="grid grid-3">
              {data.services?.map(s => (
                <div className="card service-card" key={s.id}>
                  <div className="service-icon-wrap">
                    <DynamicIcon name={s.icon} size={24} />
                  </div>
                  <h3 style={{ fontSize: 19, marginBottom: 10 }}>{s.title}</h3>
                  <p className="muted" style={{ lineHeight: 1.7, fontSize: 14 }}>{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Packages */}
        <section className="section" id="packages" aria-labelledby="packages-title" style={{ background: 'var(--bg-2)' }}>
          <div className="container">
            <div className="section-header">
              <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 8 }}>{data.site?.packages_eyebrow || 'باقات الأسعار'}</div>
              <h2 id="packages-title">{data.site?.packages_title || 'باقات متكاملة تناسب طموحاتك'}</h2>
              <p className="muted">{data.site?.packages_subtitle || 'اختر الباقة الأنسب لحجم مشروعك وابدأ رحلة التفوق الرقمي بكل ثقة ووضوح'}</p>
            </div>

            <div className="grid grid-3">
              {data.packages?.map(p => (
                <div className={`card package-card ${p.popular ? 'package-card--popular' : ''}`} key={p.id}>
                  {p.popular && (
                    <div className="package-popular-tag">
                      <Sparkles size={12} /> الأكثر طلبًا
                    </div>
                  )}
                  <h3 className="package-title">{p.title}</h3>
                  <div className="package-price">
                    {money(p.price, data.site?.currency)}
                  </div>
                  <p className="muted package-desc">{p.description}</p>
                  
                  <ul className="feature-list" aria-label="مميزات الباقة">
                    {p.features.map(f => (
                      <li key={f}>
                        <CheckCircle2 size={18} className="feature-icon" aria-hidden /> 
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button 
                    className={`btn btn--lg ${p.popular ? 'btn--primary' : 'btn--outline'}`} 
                    onClick={() => openOrder(p)} 
                    style={{ width: '100%', fontSize: 15, marginTop: 'auto' }}
                  >
                    اطلب الباقة الآن
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Portfolio */}
        <section className="section" id="portfolio" aria-labelledby="portfolio-title">
          <div className="container">
            <div className="section-header">
              <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 8 }}>{data.site?.portfolio_eyebrow || 'معرض الأعمال'}</div>
              <h2 id="portfolio-title">{data.site?.portfolio_title || 'أعمال نفتخر بإنجازها'}</h2>
              <p className="muted">{data.site?.portfolio_subtitle || 'نماذج وتجارب بصرية صممناها لشركائنا بأعلى درجات الإتقان والابتكار'}</p>
            </div>

            {/* Category Filter Pills */}
            {categories.length > 2 && (
              <div className="portfolio-filter-bar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`portfolio-filter-pill ${selectedCategory === cat ? 'portfolio-filter-pill--active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === 'all' ? 'جميع الأعمال' : cat}
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              {filteredPortfolio.length ? (
                <Carousel autoPlay={true} intervalMs={4200}>
                  {filteredPortfolio.map(p => (
                    <div
                      className="card portfolio-card-clickable"
                      key={p.id}
                      onClick={() => setActivePortfolio(p)}
                      role="button"
                      tabIndex={0}
                      aria-label={`عرض تفاصيل ${p.title}`}
                    >
                      {p.image_url && (
                        <div className="portfolio-thumb-wrap">
                          <ImageWithSkeleton skeletonHeight={220} className="portfolio-img" src={p.image_url} loading="lazy" decoding="async" alt={p.title} />
                          <div className="portfolio-hover-overlay">
                            <Eye size={14} /> استعراض العمل
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <h3 style={{ fontSize: 17, margin: 0 }}>{p.title}</h3>
                          {p.category && <span className="tag tag--sm">{p.category}</span>}
                        </div>
                        <p className="muted" style={{ fontSize: 13, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                          {p.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </Carousel>
              ) : (
                <div className="empty">لا توجد أعمال في هذا التصنيف حاليًا.</div>
              )}
            </div>
          </div>
        </section>

        {/* FAQs */}
        {data.faqs && data.faqs.length > 0 && (
          <section className="section" id="faqs" aria-labelledby="faqs-title" style={{ background: 'var(--bg-2)' }}>
            <div className="container" style={{ maxWidth: 840 }}>
              <div className="section-header">
                <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 8 }}>{data.site?.faqs_eyebrow || 'الأسئلة الشائعة'}</div>
                <h2 id="faqs-title">{data.site?.faqs_title || 'إجابات عن أكثر ما يشغل بالك'}</h2>
                <p className="muted">{data.site?.faqs_subtitle || 'كل ما تود معرفته عن مراحل العمل، الدفع، والتسليم'}</p>
              </div>
              <div className="card faq-container" style={{ padding: '16px 28px' }}>
                {data.faqs.map(faq => (
                  <FaqItem key={faq.id} faq={faq} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* High-Converting Bottom CTA Banner */}
        <section className="cta-banner-section">
          <div className="container">
            <div className="cta-banner card">
              <div className="cta-banner-glow" />
              <div className="cta-banner-content">
                <div className="cta-banner-badge">
                  <Sparkles size={14} /> {data.site?.cta_badge || 'لنبدأ معًا اليوم'}
                </div>
                <h2 className="cta-banner-title">{data.site?.cta_title || 'جاهز لنقل علامتك التجارية إلى المستوى التالي؟'}</h2>
                <p className="cta-banner-desc">
                  {data.site?.cta_desc || 'دعنا نبتكر لك هوية وتجربة رقمية فريدة تُميّزك عن منافسيك وتحقق أهدافك بأعلى احترافية.'}
                </p>
                <div className="actions" style={{ justifyContent: 'center', marginTop: 24 }}>
                  <button className="btn btn--primary btn--lg" onClick={() => openOrder()}>
                    {data.site?.cta_btn_primary || 'ابدأ مشروعك الآن'} <ArrowLeft size={18} />
                  </button>
                  {data.site?.whatsapp && (
                    <a 
                      href={waLink(data.site.whatsapp, `مرحباً ${data.site.brand || 'PREMIRALAB'}، أريد استشارة سريعة حول مشروعي.`)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn--lg btn--outline"
                      style={{ borderColor: '#25D366', color: '#25D366' }}
                    >
                      💬 {data.site?.cta_btn_wa || 'استشارة عبر واتساب'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer site={data.site} />

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button 
          onClick={scrollToTop} 
          className="back-to-top-btn" 
          aria-label="العودة للأعلى"
          type="button"
        >
          <ArrowUp size={20} />
        </button>
      )}

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

  useEffect(() => {
    // Auto-fill client details if logged in
    api.client.me().then(res => {
      setF(prev => ({
        ...prev,
        name: res.client.name,
        phone: res.client.phone || '',
        email: res.client.email || ''
      }));
    }).catch(() => {});
  }, []);

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
          <h3 style={{ fontSize: 24, marginBottom: 8 }}>شكرًا لثقتك بنا!</h3>
          <p style={{ fontSize: 16 }}>رقم طلبك: <strong style={{ color: 'var(--primary)', fontSize: 18, background: 'var(--primary-dim)', padding: '4px 10px', borderRadius: 8 }}>{submitted.orderNo}</strong></p>
          <p className="muted" style={{ maxWidth: 400, margin: '16px auto' }}>تم حفظ طلبك وسيتم مراجعته والتواصل معك قريبًا. يمكنك متابعة حالة الطلب في أي وقت.</p>
          
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
                {promoResult?.error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8, fontWeight: 500 }}>❌ {promoResult.error}</div>}
              </div>
              
              <div style={{ marginTop: 24, padding: '16px', background: 'var(--accent-dim)', borderRadius: 12, border: '1px dashed var(--accent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                  <strong style={{ fontSize: 14 }}>طرق الدفع المتاحة</strong>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  بعد تأكيد الطلب، سيتم إصدار فاتورة رقمية يمكنك دفعها بسهولة عبر:
                  <br />
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>InstaPay، فودافون كاش، أو التحويل البنكي</span>.
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
          <button type="button" className="btn" onClick={onClose} style={{ color: 'var(--text-muted)', background: 'transparent', borderColor: 'transparent' }}>إلغاء</button>
        )}
        
        {step < 4 ? (
          <button type="button" className="btn btn--primary" onClick={nextStep} style={{ minWidth: 120 }}>التالي</button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={submit} disabled={loading} style={{ minWidth: 140, boxShadow: '0 0 24px var(--accent-glow)' }}>
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
          <div className="case-study-hero-img-wrap" style={{ maxHeight: '70vh', background: 'transparent' }}>
            <ImageWithSkeleton skeletonHeight={400} objectFit="contain" src={item.image_url} alt={item.title} className="case-study-hero-img" style={{ maxHeight: '70vh' }} />
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
                اطلب مشروعًا مماثلاً
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
            مرحبًا بك! كيف يمكننا مساعدتك اليوم؟ اختر من الخيارات السريعة:
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
