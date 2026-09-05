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
import { money, waLink, trackEvent } from '../lib/utils.js';
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
      <div 
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ marginTop: 12, color: 'var(--text-muted)', lineHeight: 1.8, fontSize: 15, opacity: open ? 1 : 0, transition: 'opacity 0.4s ease', transform: open ? 'translateY(0)' : 'translateY(-10px)' }}>
            {faq.answer.split('\n').map((line, i) => <p key={i} style={{ margin: '0 0 8px' }}>{line}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnimatedStat = ({ value }: { value: string }) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse out the first sequence of digits
  const match = value.match(/(\D*)(\d+)(\D*)/);
  const prefix = match ? match[1] : '';
  const targetNumber = match ? parseInt(match[2], 10) : 0;
  const suffix = match ? match[3] : '';

  useEffect(() => {
    if (!match || targetNumber === 0) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasStarted) {
        setHasStarted(true);
      }
    }, { threshold: 0.5 });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted, match, targetNumber]);

  useEffect(() => {
    if (!hasStarted || targetNumber === 0) return;
    
    let startTime: number | null = null;
    const duration = 2000;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const ease = 1 - Math.pow(1 - percentage, 3);
      setCount(Math.floor(targetNumber * ease));

      if (percentage < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(targetNumber);
      }
    };
    
    requestAnimationFrame(animate);
  }, [hasStarted, targetNumber]);

  if (!match) return <div className="stat-tile__number">{value}</div>;

  return (
    <div className="stat-tile__number" ref={ref}>
      {prefix}{count}{suffix}
    </div>
  );
};

export function Home({
 data, onToast, onClientClick }: HomeProps) {
  // Smooth Scroll Reveal Effect
  useEffect(() => {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target); // Stop tracking after it appears to save CPU
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const [orderOpen,          setOrderOpen]          = useState(false);
  const [selected,           setSelected]           = useState<Package | null>(null);
  const [initialProjectType, setInitialProjectType] = useState<string | undefined>(undefined);
  const [activePortfolio,    setActivePortfolio]    = useState<PortfolioItem | null>(null);
  const [selectedCategory,   setSelectedCategory]   = useState<string>('all');
  const [showScrollTop,      setShowScrollTop]      = useState(false);

  // Track back-to-top visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [clientUser, setClientUser] = useState<any>(() => {
    try {
      const raw = sessionStorage.getItem('client_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    api.client.me()
      .then(res => {
        setClientUser(res.client);
        sessionStorage.setItem('client_user', JSON.stringify(res.client));
      })
      .catch(() => {
        setClientUser(null);
        sessionStorage.removeItem('client_user');
      });
  }, []);

  const openOrder = (pkg?: Package, initialProj?: string) => {
    if (clientUser) {
      setSelected(pkg ?? null);
      setInitialProjectType(initialProj);
      setOrderOpen(true);
    } else {
      onToast('يرجى تسجيل الدخول أو إنشاء حسابك أولاً للبدء بطلب تصميم ومتابعته ✨', 'info');
      if (pkg) sessionStorage.setItem('pending_order_pkg', JSON.stringify(pkg));
      if (initialProj) sessionStorage.setItem('pending_order_proj', initialProj);
      onClientClick();
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('order') === '1') {
      const savedPkg = sessionStorage.getItem('pending_order_pkg');
      const savedProj = sessionStorage.getItem('pending_order_proj');
      let pkgObj = null;
      if (savedPkg) {
        try { pkgObj = JSON.parse(savedPkg); } catch {}
        sessionStorage.removeItem('pending_order_pkg');
      }
      if (savedProj) {
        sessionStorage.removeItem('pending_order_proj');
      }
      setSelected(pkgObj);
      setInitialProjectType(savedProj || undefined);
      setOrderOpen(true);
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

      <Nav site={data.site} onOrder={() => openOrder()} onClientClick={onClientClick} isClientLoggedIn={!!localStorage.getItem('client_token')} />

      <main id="top">
        {/* Hero Section */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-text-col">
              <div className="hero-badge hero-enter-1">
                <Sparkles size={15} className="hero-badge-icon" />
                <span>{data.site?.hero_badge || 'استوديو رقمي متكامل للتصميم والتطوير'}</span>
              </div>
              
              <h1 className="hero-heading hero-enter-2">
                {data.site?.hero_title ? data.site.hero_title.split(' ').map((word, i, arr) => 
                  i === arr.length - 1 ? <span key={i} className="highlight">{word}</span> : word + ' '
                ) : <>نحوّل أفكارك إلى واقع رقمي <span className="highlight">استثنائي</span></>}
              </h1>
              
              <p className="hero-subtitle hero-enter-3">
                {data.site?.hero_subtitle ?? 'من الهوية البصرية وتصميم الواجهات إلى المنصات المتقدمة، نحن هنا لنبني لعلامتك التجارية حضورًا قويًا ينمو ويتفوق.'}
              </p>
              
              <div className="actions hero-actions hero-enter-4">
                <button className="btn btn--primary btn--lg hero-btn-main" onClick={() => openOrder()}>
                  {data.site?.hero_primary_btn ?? 'ابدأ مشروعك الآن'} <ArrowLeft size={18} aria-hidden />
                </button>
                <a href="#portfolio" className="btn btn--lg btn--outline hero-btn-secondary">
                  {data.site?.hero_secondary_btn ?? 'تصفح أعمالنا'}
                </a>
              </div>

              {/* Trust badges */}
              <div className="hero-trust-row hero-enter-5">
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
            <div className="hero-art-wrapper hero-enter-art">
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
              >
                {/* Floating stats inside hero art card */}
                <div style={{
                  position: 'absolute', bottom: 20, right: 16, left: 16,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  {[
                    { icon: '🚀', label: data.site?.stat_1_num || '+150', sub: 'مشروع مكتمل' },
                    { icon: '⭐', label: '100%', sub: 'رضا العملاء' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
                      borderRadius: 12, padding: '8px 14px',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: '#fff', lineHeight: 1.2 }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Metrics & Highlights Bar */}
        <section className="stats-banner-section reveal-on-scroll">
          <div className="container">
            <div className="stats-glass-bar card card--lift">
              <div className="stat-tile">
                <div className="stat-tile__icon-wrap">
                  <TrendingUp size={22} className="stat-tile__icon" />
                </div>
                <div>
                  <AnimatedStat value={data.site?.stat_1_num || '+150'} />
                  <div className="stat-tile__label">{data.site?.stat_1_label || 'مشروع ناجح ومكتمل'}</div>
                </div>
              </div>

              <div className="stat-tile__divider" />

              <div className="stat-tile">
                <div className="stat-tile__icon-wrap">
                  <Award size={22} className="stat-tile__icon" />
                </div>
                <div>
                  <AnimatedStat value={data.site?.stat_2_num || '100%'} />
                  <div className="stat-tile__label">{data.site?.stat_2_label || 'نسبة رضا وثقة العملاء'}</div>
                </div>
              </div>

              <div className="stat-tile__divider" />

              <div className="stat-tile">
                <div className="stat-tile__icon-wrap">
                  <Clock size={22} className="stat-tile__icon" />
                </div>
                <div>
                  <AnimatedStat value={data.site?.stat_3_num || '48 س'} />
                  <div className="stat-tile__label">{data.site?.stat_3_label || 'متوسط بدء التنفيذ'}</div>
                </div>
              </div>

              <div className="stat-tile__divider" />

              <div className="stat-tile">
                <div className="stat-tile__icon-wrap">
                  <Headphones size={22} className="stat-tile__icon" />
                </div>
                <div>
                  <AnimatedStat value={data.site?.stat_4_num || '24/7'} />
                  <div className="stat-tile__label">{data.site?.stat_4_label || 'متابعة ودعم مستمر'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials (Social Proof) */}
        {data.testimonials && data.testimonials.length > 0 && (
          <section className="section reveal-on-scroll" id="testimonials" style={{ background: 'var(--bg-2)' }}>
            <div className="container">
              <div className="section-header">
                <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 8 }}>{data.site?.testimonials_eyebrow || 'آراء العملاء'}</div>
                <h2>{data.site?.testimonials_title || 'ثقة عملائنا هي سر نجاحنا'}</h2>
                <p className="muted">{data.site?.testimonials_subtitle || 'تجارب حقيقية لشركاء النجاح الذين وضعوا ثقتهم في استوديوهاتنا'}</p>
              </div>

              <Carousel autoPlay={true} intervalMs={3800}>
                {data.testimonials.map(t => (
                  <div className="card testimonial-card card--lift" key={t.id}>
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
        <section className="section reveal-on-scroll" id="services" aria-labelledby="services-title">
          <div className="container">
            <div className="section-header">
              <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 8 }}>{data.site?.services_eyebrow || 'خدماتنا المتخصصة'}</div>
              <h2 id="services-title">{data.site?.services_title || 'حلول رقمية متكاملة لنمو أعمالك'}</h2>
              <p className="muted">{data.site?.services_subtitle || 'نقدم مجموعة متكاملة من الخدمات الإبداعية والتقنية وفق أعلى معايير الجودة العالمية'}</p>
            </div>

            <div className="grid grid-3">
              {data.services?.map((s, idx) => (
                <div className="card service-card card--lift reveal-on-scroll" key={s.id} style={{ transitionDelay: `${idx * 0.07}s` }}>
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
        <section className="section reveal-on-scroll" id="packages" aria-labelledby="packages-title" style={{ background: 'var(--bg-2)' }}>
          <div className="container">
            <div className="section-header">
              <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 8 }}>{data.site?.packages_eyebrow || 'باقات الأسعار'}</div>
              <h2 id="packages-title">{data.site?.packages_title || 'باقات متكاملة تناسب طموحاتك'}</h2>
              <p className="muted">{data.site?.packages_subtitle || 'اختر الباقة الأنسب لحجم مشروعك وابدأ رحلة التفوق الرقمي بكل ثقة ووضوح'}</p>
            </div>

            <div className="grid grid-3 pricing-grid">
              {data.packages?.map((p, idx) => (
                <div className={`card package-card card--lift reveal-on-scroll ${p.popular ? 'package-card--popular' : ''}`} key={p.id} style={{ transitionDelay: `${idx * 0.1}s` }}>
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
        <section className="section reveal-on-scroll" id="portfolio" aria-labelledby="portfolio-title">
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
          <section className="section reveal-on-scroll" id="faqs" aria-labelledby="faqs-title" style={{ background: 'var(--bg-2)' }}>
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
                <div className="cta-banner-actions">
                  {data.site?.whatsapp && (
                    <a 
                      href={waLink(data.site.whatsapp, `مرحباً ${data.site.brand || 'PREMIRALAB'}، أريد استشارة سريعة حول مشروعي.`)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn--lg cta-btn-whatsapp"
                    >
                      التواصل عبر واتساب 💬
                    </a>
                  )}
                  <button className="btn btn--primary btn--lg" onClick={() => openOrder()}>
                    {data.site?.cta_btn_primary || 'ابدأ مشروعك الآن'} <ArrowLeft size={18} />
                  </button>
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
  useEffect(() => {
    trackEvent('begin_checkout');
  }, []);

  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [f, setF] = useState(() => {
    let saved: any = {};
    try {
      const draft = localStorage.getItem('orderFormDraft');
      if (draft) saved = JSON.parse(draft);
    } catch (e) {}
    return {
      name: '', phone: '', email: '',
      serviceId: '', budget: '', deadline: '', notes: '', promoCode: '',
      ...saved,
      packageId: defaultPackage ? String(defaultPackage.id) : (saved.packageId || ''),
      projectType: initialProjectType || saved.projectType || ''
    };
  });

  useEffect(() => {
    localStorage.setItem('orderFormDraft', JSON.stringify(f));
  }, [f]);

  useEffect(() => {
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
  const [clientProfile, setClientProfile] = useState<any>(null);
  useEffect(() => {
    if (localStorage.getItem('client_token')) {
      api.client.profile().then(res => {
        if (res.client) {
          setClientProfile(res.client);
          setF(prev => ({ ...prev, name: res.client.name, phone: res.client.phone, email: res.client.email }));
        }
      }).catch(() => {});
    }
  }, []);
  const [submitted, setSubmitted] = useState<{ orderNo: string } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [promoResult, setPromoResult] = useState<{ success?: string; error?: string; discount?: number; type?: string } | null>(null);

  const updateF = (updates: Partial<typeof f>) => setF(prev => ({ ...prev, ...updates }));

  const selectedPackage = packages.find(p => p.id === Number(f.packageId));
  const selectedService  = services.find(s => s.id === Number(f.serviceId));
  const basePrice = selectedPackage?.price || 0;
  // Effective price to calculate discounts on (package price or manual budget)
  const effectiveBase = basePrice > 0 ? basePrice : (f.budget ? Number(f.budget) : 0);
  const discountVal = promoResult?.success && promoResult.discount && effectiveBase > 0
    ? (promoResult.type === 'percentage'
        ? Math.round(effectiveBase * promoResult.discount / 100)
        : promoResult.discount)
    : 0;
  let finalPrice = Math.max(0, effectiveBase - discountVal);
  let walletDiscount = 0;
  if (f.useWallet && clientProfile && clientProfile.wallet_balance > 0 && finalPrice > 0) {
     walletDiscount = Math.min(clientProfile.wallet_balance, finalPrice);
     finalPrice = Math.max(0, finalPrice - walletDiscount);
  }

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
    setGlobalError('');
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
        referralCode: localStorage.getItem('referral_code') || undefined,
        useWallet:   f.useWallet,
      });
      setSubmitted({ orderNo: res.orderNo });
      localStorage.removeItem('orderFormDraft');
      try {
        const val = finalPrice > 0 ? finalPrice : (f.budget ? Number(f.budget) : 0);
        trackEvent('purchase', { value: val, currency: 'EGP', transaction_id: res.orderNo, items: [{ item_name: selectedPackage?.title || f.projectType }] });
        trackEvent('generate_lead', { value: val, currency: 'EGP' });
      } catch (e) { /* ignore */ }
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally { setLoading(false); }
  };

  const [copied, setCopied] = useState(false);
  const copyTrackerUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const goNext = () => {
    const errs: Record<string, string> = {};
    setGlobalError('');

    if (step === 1) {
      if (!f.packageId && !f.serviceId && !f.projectType.trim()) {
        errs.service = 'يرجى اختيار باقة أو خدمة أو كتابة نوع مشروعك';
      }
    }
    if (step === 3) {
      if (!f.name.trim()) errs.name = 'الاسم الكامل مطلوب';
      if (!f.phone.trim()) {
        errs.phone = 'رقم الهاتف مطلوب';
      } else {
        const clean = f.phone.trim().replace(/\s+/g, '');
        if (!/^(\+?\d{7,15}|01\d{9})$/.test(clean)) errs.phone = 'رقم هاتف غير صحيح';
      }
      if (f.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errs.email = 'بريد إلكتروني غير صحيح';
      }
    }

    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    if (step === 1) {
      const pTitle = packages.find(p => p.id === Number(f.packageId))?.title || f.projectType;
      trackEvent('add_to_cart', { items: [{ item_name: pTitle }] });
    }

    setAnimDir('forward');
    setStep(s => s + 1);
  };

  const goPrev = () => {
    setFieldErrors({});
    setGlobalError('');
    setAnimDir('back');
    setStep(s => s - 1);
  };

  const STEPS = ['الخدمة', 'التفاصيل', 'التواصل', 'التأكيد'];
  const PROGRESS = ((step - 1) / (STEPS.length - 1)) * 100;

  // ── Success Screen ─────────────────────────────────────────
  if (submitted) {
    const trackerUrl = `${window.location.origin}/?track=${submitted.orderNo}`;
    return (
      <Modal title="" onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '12px 8px 24px' }}>
          {/* Animated check */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 0 12px rgba(34,197,94,0.12), 0 8px 32px rgba(34,197,94,0.3)',
            animation: 'pulse 2s infinite'
          }}>
            <CheckCircle2 size={42} color="#fff" />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>تم استلام طلبك! 🎉</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px' }}>
            شكراً لثقتك بنا، سنتواصل معك في أقرب وقت ممكن
          </p>

          <div style={{
            background: 'var(--bg-2)', borderRadius: 16,
            border: '1px solid var(--border)', padding: '20px',
            marginBottom: 20
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-muted)' }}>رقم طلبك</p>
            <p style={{
              margin: '0 0 20px', fontSize: 28, fontWeight: 900,
              color: 'var(--accent)', letterSpacing: 2,
              fontFamily: 'monospace'
            }}>{submitted.orderNo}</p>

            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>
              رابط متابعة طلبك (احفظه):
            </p>
            <div style={{
              background: 'var(--bg-3)', borderRadius: 10,
              padding: '10px 14px', marginBottom: 12,
              fontFamily: 'monospace', fontSize: 12,
              wordBreak: 'break-all', textAlign: 'left',
              border: '1px solid var(--border)', color: 'var(--text-muted)'
            }}>{trackerUrl}</div>

            <button
              type="button"
              className={`btn ${copied ? 'btn--success' : 'btn--outline'}`}
              style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
              onClick={() => copyTrackerUrl(trackerUrl)}
            >
              {copied
                ? <><Check size={16} /> تم النسخ بنجاح</>
                : <><Copy size={16} /> نسخ رابط المتابعة</>
              }
            </button>
          </div>

          <button type="button" className="btn btn--primary" onClick={onClose}
            style={{ width: '100%', justifyContent: 'center', minHeight: 48, fontSize: 15, fontWeight: 700 }}>
            إغلاق
          </button>
        </div>
      </Modal>
    );
  }

  // ── Main Modal ────────────────────────────────────────────
  return (
    <Modal title="ابدأ مشروعك الآن 🚀" onClose={onClose} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── Stepper ─────────────────────────────────────── */}
        <div style={{ marginBottom: 28, padding: '0 4px' }}>
          {/* Progress bar */}
          <div style={{ position: 'relative', height: 4, background: 'var(--bg-3)', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: 0, right: 0, height: '100%',
              background: 'linear-gradient(90deg, var(--primary), var(--accent))',
              borderRadius: 99,
              width: `${PROGRESS}%`,
              transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)'
            }} />
          </div>
          {/* Step labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {STEPS.map((label, idx) => {
              const n = idx + 1;
              const done = step > n;
              const active = step === n;
              return (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                    transition: 'all 0.3s',
                    background: done ? 'var(--primary)' : active ? 'var(--accent)' : 'var(--bg-3)',
                    color: (done || active) ? '#fff' : 'var(--text-muted)',
                    boxShadow: active ? '0 0 0 5px var(--accent-dim)' : 'none',
                    border: `2px solid ${done ? 'var(--primary)' : active ? 'var(--accent)' : 'var(--border)'}`
                  }}>
                    {done ? <Check size={15} /> : n}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--text-muted)' }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Global Error ─────────────────────────────────── */}
        {globalError && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', color: '#ef4444',
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, border: '1px solid rgba(239,68,68,0.2)'
          }}>
            <AlertCircle size={16} /> {globalError}
          </div>
        )}

        {/* ── Step Content ─────────────────────────────────── */}
        <div style={{ minHeight: 300 }} className={animDir === 'forward' ? 'step-slide-forward' : 'step-slide-back'} key={step}>

          {/* STEP 1 ─ Choose Service */}
          {step === 1 && (
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
                اختر الباقة المناسبة أو خدمة محددة أو صِف مشروعك بنفسك
              </p>

              {/* Package Cards */}
              {packages.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                    الباقات الجاهزة
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {packages.map(pkg => {
                      const active = f.packageId === String(pkg.id);
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => updateF({ packageId: active ? '' : String(pkg.id), serviceId: '', projectType: active ? f.projectType : '' })}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '14px 18px', borderRadius: 14, textAlign: 'right',
                            border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                            background: active ? 'var(--accent-dim)' : 'var(--bg-2)',
                            cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: active ? '0 0 0 4px var(--accent-dim)' : 'none',
                            width: '100%'
                          }}
                        >
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{pkg.title}</div>
                            {pkg.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{pkg.description}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <span style={{ fontWeight: 800, fontSize: 15, color: active ? 'var(--accent)' : 'var(--text)' }}>
                              {money(pkg.price)}
                            </span>
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%',
                              border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                              background: active ? 'var(--accent)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s', flexShrink: 0
                            }}>
                              {active && <Check size={13} color="#fff" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Services */}
              {services.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                    أو اختر خدمة فردية
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {services.map(svc => {
                      const active = f.serviceId === String(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => updateF({ serviceId: active ? '' : String(svc.id), packageId: '' })}
                          style={{
                            padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                            border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                            background: active ? 'var(--primary)' : 'var(--bg-2)',
                            color: active ? '#fff' : 'var(--text)',
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                        >
                          {svc.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>أو صِف مشروعك بنفسك</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div className="form-field">
                <input
                  className="input"
                  style={{
                    padding: '14px 16px', fontSize: 14,
                    borderColor: fieldErrors.service ? '#ef4444' : undefined,
                    borderRadius: 12
                  }}
                  placeholder="مثال: تصميم هوية بصرية + موقع إلكتروني..."
                  value={f.projectType}
                  onChange={e => updateF({ projectType: e.target.value })}
                />
                {fieldErrors.service && (
                  <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={13} /> {fieldErrors.service}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 ─ Project Details */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                أضف أي تفاصيل تساعدنا على تقديم أفضل عرض لك (كلها اختيارية)
              </p>

              {/* Selected service summary */}
              {(selectedPackage || selectedService || f.projectType) && (
                <div style={{
                  padding: '12px 16px', borderRadius: 12,
                  background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {selectedPackage?.title || selectedService?.title || f.projectType}
                  </span>
                  {selectedPackage && (
                    <span style={{ marginRight: 'auto', fontWeight: 800, color: 'var(--accent)' }}>
                      {money(selectedPackage.price)}
                    </span>
                  )}
                </div>
              )}

              {!f.packageId && (
                <div className="form-field">
                  <label className="form-label">الميزانية المتوقعة</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      style={{ padding: '13px 16px', paddingLeft: 50, borderRadius: 12 }}
                      type="number" min="0" placeholder="0"
                      value={f.budget}
                      onChange={e => updateF({ budget: e.target.value })}
                    />
                    <span style={{
                      position: 'absolute', left: 16, top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)', fontSize: 13, fontWeight: 600
                    }}>ج.م</span>
                  </div>
                </div>
              )}

              <div className="form-field">
                <label className="form-label">الموعد النهائي المطلوب</label>
                <input
                  className="input"
                  style={{ padding: '13px 16px', borderRadius: 12 }}
                  type="date"
                  value={f.deadline}
                  onChange={e => updateF({ deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>نبذة عن المشروع وأهدافه</label>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.notes.length} / 2000</span>
                </div>
                <textarea
                  className="textarea"
                  rows={5}
                  maxLength={2000}
                  style={{ padding: '13px 16px', borderRadius: 12, resize: 'vertical' }}
                  placeholder="صِف فكرتك، الجمهور المستهدف، المرجعيات التصميمية، أو أي تفاصيل تساعدنا على فهم رؤيتك..."
                  value={f.notes}
                  onChange={e => updateF({ notes: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 3 ─ Contact Info */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                كيف يمكننا التواصل معك لمناقشة طلبك؟
              </p>

              <div className="form-field">
                <label className="form-label">الاسم الكامل *</label>
                <input
                  className="input"
                  style={{
                    padding: '13px 16px', borderRadius: 12,
                    borderColor: fieldErrors.name ? '#ef4444' : undefined
                  }}
                  placeholder="محمد أحمد"
                  value={f.name}
                  onChange={e => { updateF({ name: e.target.value }); setFieldErrors(p => ({ ...p, name: '' })); }}
                  autoComplete="name"
                />
                {fieldErrors.name && (
                  <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={13} /> {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">رقم الهاتف / الواتساب *</label>
                <input
                  className="input"
                  style={{
                    padding: '13px 16px', borderRadius: 12, direction: 'ltr', textAlign: 'right',
                    borderColor: fieldErrors.phone ? '#ef4444' : undefined
                  }}
                  placeholder="01xxxxxxxxx"
                  value={f.phone}
                  type="tel"
                  onChange={e => { updateF({ phone: e.target.value }); setFieldErrors(p => ({ ...p, phone: '' })); }}
                  autoComplete="tel"
                />
                {fieldErrors.phone && (
                  <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={13} /> {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">البريد الإلكتروني <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(اختياري)</span></label>
                <input
                  className="input"
                  style={{
                    padding: '13px 16px', borderRadius: 12, direction: 'ltr',
                    borderColor: fieldErrors.email ? '#ef4444' : undefined
                  }}
                  type="email"
                  placeholder="example@email.com"
                  value={f.email}
                  onChange={e => { updateF({ email: e.target.value }); setFieldErrors(p => ({ ...p, email: '' })); }}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={13} /> {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4 ─ Review & Confirm */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                راجع تفاصيل طلبك قبل الإرسال
              </p>

              {/* Order Summary Card */}
              <div style={{ background: 'var(--bg-2)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>ملخص الطلب</span>
                </div>

                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Contact row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>الاسم</span>
                      <strong style={{ fontSize: 14 }}>{f.name}</strong>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>رقم التواصل</span>
                      <strong style={{ fontSize: 14, direction: 'ltr', display: 'inline-block' }}>{f.phone}</strong>
                    </div>
                  </div>

                  {/* Service row */}
                  <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>الخدمة المطلوبة</span>
                    <strong style={{ fontSize: 14, color: 'var(--accent)' }}>
                      {selectedPackage?.title || selectedService?.title || f.projectType || '—'}
                    </strong>
                  </div>

                  {f.deadline && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>الموعد النهائي</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{f.deadline}</span>
                    </div>
                  )}

                  {f.notes && (
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>ملاحظات</span>
                      <p style={{ fontSize: 13, margin: 0, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{f.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Promo Code */}
              <div style={{ background: 'var(--bg-2)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 18px' }}>
                <label className="form-label" style={{ marginBottom: 10 }}>🏷️ كود الخصم <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(اختياري)</span></label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    className="input"
                    style={{ flex: 1, padding: '11px 14px', borderRadius: 10, fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}
                    placeholder="PROMO2025"
                    value={f.promoCode}
                    onChange={e => { updateF({ promoCode: e.target.value.toUpperCase() }); setPromoResult(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleCheckPromo()}
                    disabled={checkingPromo || !!promoResult?.success}
                  />
                  <button
                    type="button"
                    className={`btn ${promoResult?.success ? 'btn--success' : 'btn--outline'}`}
                    onClick={handleCheckPromo}
                    disabled={!f.promoCode || checkingPromo || !!promoResult?.success}
                    style={{ minWidth: 80, borderRadius: 10 }}
                  >
                    {checkingPromo ? '...' : promoResult?.success ? <><Check size={15} /> مطبّق</> : 'تطبيق'}
                  </button>
                </div>
                {promoResult?.success && (
                  <div style={{ color: 'var(--success)', fontSize: 13, marginTop: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} /> {promoResult.success}
                  </div>
                )}
                {promoResult?.error && (
                  <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} /> {promoResult.error}
                  </div>
                )}
              </div>

              {/* Wallet Usage */}
              {clientProfile && clientProfile.wallet_balance > 0 && (
                <div style={{ background: 'var(--bg-2)', borderRadius: 14, border: '1px solid var(--primary-light)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <span style={{ fontSize: 18 }}>💳</span>
                       <div>
                         <div style={{ fontSize: 14, fontWeight: 600 }}>رصيد المحفظة متاح</div>
                         <div style={{ fontSize: 12, color: 'var(--primary)' }}>{clientProfile.wallet_balance} ج.م</div>
                       </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={f.useWallet} onChange={e => setF({ ...f, useWallet: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>استخدام الرصيد</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Price Summary */}
              {effectiveBase > 0 && (
                <div style={{ background: 'var(--bg-2)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {basePrice > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ color: 'var(--text-muted)' }}>سعر الباقة</span>
                      <span>{money(basePrice)}</span>
                    </div>
                  )}
                  {f.budget && !f.packageId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ color: 'var(--text-muted)' }}>الميزانية المقترحة</span>
                      <span>{money(Number(f.budget))}</span>
                    </div>
                  )}
                  {discountVal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--success)' }}>
                      <span>خصم ({f.promoCode})</span>
                      <strong>— {money(discountVal)}</strong>
                    </div>
                  )}
                  {walletDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--primary)' }}>
                      <span>خصم المحفظة</span>
                      <strong>— {money(walletDiscount)}</strong>
                    </div>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: 12, borderTop: '1px solid var(--border)',
                    fontWeight: 900, fontSize: 18, color: 'var(--accent)'
                  }}>
                    <span>الإجمالي المطلوب</span>
                    <span>{money(finalPrice)}</span>
                  </div>
                </div>
              )}

              {/* Trust Note - No payment required yet */}
              <div style={{
                padding: '16px', borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)',
                display: 'flex', gap: 12, alignItems: 'flex-start'
              }}>
                <div style={{ flexShrink: 0, color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 14, color: '#22c55e' }}>لا يوجد دفع مطلوب الآن</h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    سيتم مراجعة طلبك أولاً من قبل الإدارة لضمان فهمنا لمتطلباتك وتحديد الموعد المناسب. بعد الموافقة وتأكيد الطلب، سيتم فتح طرق الدفع الآمنة (فيزا، انستاباي، محافظ، أو فوري).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Actions ────────────────────────────────── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap-reverse', gap: 12,
          marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', gap: 12, flex: '1 1 200px' }}>
            {step > 1 ? (
              <button type="button" className="btn" onClick={goPrev} disabled={loading}
                style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}>
                ← السابق
              </button>
            ) : (
              <button type="button" className="btn" onClick={onClose}
                style={{ flex: 1, minHeight: 48, color: 'var(--text-muted)', background: 'transparent', border: 'none', justifyContent: 'center' }}>
                إلغاء
              </button>
            )}
            <a href="https://wa.me/201069572748?text=مرحباً، أواجه صعوبة في استكمال الطلب، هل يمكنكم مساعدتي؟" target="_blank" rel="noreferrer" 
               style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', background: 'var(--bg-3)', padding: '6px 12px', borderRadius: 8 }}>
               <MessageCircle size={14} /> مساعدة؟
            </a>
          </div>

          {step < 4 ? (
            <button type="button" className="btn btn--primary" onClick={goNext}
              style={{ flex: '1 1 140px', minHeight: 48, fontWeight: 700, fontSize: 15, justifyContent: 'center' }}>
              التالي →
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--glow" onClick={submit}
              disabled={loading}
              style={{ flex: '1 1 140px', minHeight: 48, fontWeight: 800, fontSize: 15, justifyContent: 'center' }}>
              {loading
                ? <><span className="spinner-sm" /> جارٍ الإرسال...</>
                : '✅ تأكيد الطلب'
              }
            </button>
          )}
        </div>
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
  useEffect(() => {
    trackEvent('view_item', { items: [{ item_name: item.title }] });
  }, [item.id]);

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
