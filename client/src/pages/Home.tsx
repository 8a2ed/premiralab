import { useState } from 'react';
import { ArrowLeft, Star, CheckCircle2, Palette, Monitor, Layout } from 'lucide-react';
import { Nav } from '../components/layout/Nav.js';
import { Footer } from '../components/layout/Footer.js';
import { Modal } from '../components/ui/Modal.js';
import { money } from '../lib/utils.js';
import { api } from '../lib/api.js';
import type { PublicData, Package } from '../types.js';

const ICON_MAP: Record<string, React.ReactNode> = {
  palette: <Palette size={28} className="service-icon" />,
  monitor: <Monitor size={28} className="service-icon" />,
  layout:  <Layout  size={28} className="service-icon" />,
};

interface HomeProps {
  data:    PublicData;
  onAdmin: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function Home({ data, onAdmin, onToast }: HomeProps) {
  const [orderOpen, setOrderOpen] = useState(false);
  const [selected,  setSelected]  = useState<Package | null>(null);

  const openOrder = (pkg?: Package) => {
    setSelected(pkg ?? null);
    setOrderOpen(true);
  };

  return (
    <>
      <Nav site={data.site} onOrder={() => openOrder()} onAdmin={onAdmin} />

      <main id="top">
        {/* Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">استوديو تصميم رقمي متكامل</div>
              <h1>نحوّل الأفكار إلى <span className="highlight">تجارب بصرية</span> قوية.</h1>
              <p>من الهوية البصرية إلى المنتجات الرقمية — منظومة تصميم احترافية مع إدارة مشاريع وملفات ومراجعات منظمة.</p>
              <div className="actions">
                <button className="btn btn--primary btn--lg" onClick={() => openOrder()}>
                  اطلب مشروعك <ArrowLeft size={18} aria-hidden />
                </button>
                <button className="btn btn--ghost btn--lg" onClick={onAdmin}>لوحة الإدارة</button>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true" />
          </div>
        </section>

        {/* Services */}
        <section className="section" id="services" aria-labelledby="services-title">
          <div className="container">
            <h2 id="services-title">الخدمات</h2>
            <p className="muted">حلول تصميم قابلة للتوسع.</p>
            <div className="grid grid-3" style={{ marginTop: 28 }}>
              {data.services?.map(s => (
                <div className="card" key={s.id}>
                  {ICON_MAP[s.icon] ?? <Palette size={28} className="service-icon" />}
                  <h3>{s.title}</h3>
                  <p className="muted">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Packages */}
        <section className="section" id="packages" aria-labelledby="packages-title">
          <div className="container">
            <h2 id="packages-title">الباقات</h2>
            <p className="muted">اختر نقطة البداية المناسبة.</p>
            <div className="grid grid-3" style={{ marginTop: 28 }}>
              {data.packages?.map(p => (
                <div className={`card package-card ${p.popular ? 'package-card--popular' : ''}`} key={p.id}>
                  {p.popular && <span className="tag">الأكثر طلباً ⭐</span>}
                  <h3>{p.title}</h3>
                  <div className="price">{money(p.price, data.site?.currency)}</div>
                  <p className="muted">{p.description}</p>
                  <ul className="feature-list" aria-label="مميزات الباقة">
                    {p.features.map(f => (
                      <li key={f}><CheckCircle2 size={14} aria-hidden /> {f}</li>
                    ))}
                  </ul>
                  <button className="btn btn--primary" onClick={() => openOrder(p)} style={{ marginTop: 'auto' }}>
                    اطلب الباقة
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Portfolio */}
        <section className="section" id="portfolio" aria-labelledby="portfolio-title">
          <div className="container">
            <h2 id="portfolio-title">أعمال مختارة</h2>
            <div className="grid grid-3" style={{ marginTop: 28 }}>
              {data.portfolio?.length ? data.portfolio.map(p => (
                <div className="card" key={p.id}>
                  {p.image_url && (
                    <img className="portfolio-img" src={p.image_url} loading="lazy" decoding="async" alt={p.title} />
                  )}
                  <h3>{p.title}</h3>
                  {p.category && <span className="tag tag--sm">{p.category}</span>}
                  <p className="muted">{p.description}</p>
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
                    {t.avatar_url && <img src={t.avatar_url} alt={t.name} className="avatar" />}
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

      {/* Order Modal */}
      {orderOpen && (
        <OrderModal
          packages={data.packages ?? []}
          services={data.services ?? []}
          defaultPackage={selected}
          onClose={() => setOrderOpen(false)}
          onDone={(msg, type) => { onToast(msg, type); setOrderOpen(false); }}
        />
      )}
    </>
  );
}

// ─── Order Modal ──────────────────────────────────────────────────────────────

interface OrderModalProps {
  packages:       Package[];
  services:       Array<{ id: number; title: string }>;
  defaultPackage: Package | null;
  onClose:        () => void;
  onDone:         (msg: string, type: 'success' | 'error') => void;
}

function OrderModal({ packages, services, defaultPackage, onClose, onDone }: OrderModalProps) {
  const [f, setF] = useState({
    name: '', phone: '', email: '',
    packageId: defaultPackage ? String(defaultPackage.id) : '',
    serviceId: '', projectType: '', budget: '', deadline: '', notes: '',
  });
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState<{ orderNo: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.order({
        name: f.name, phone: f.phone, email: f.email || undefined,
        packageId:   f.packageId ? Number(f.packageId) : undefined,
        serviceId:   f.serviceId ? Number(f.serviceId) : undefined,
        projectType: f.projectType,
        notes:       f.notes,
        budget:      f.budget ? Number(f.budget) : undefined,
        deadline:    f.deadline || undefined,
      });
      setSubmitted({ orderNo: res.orderNo });
    } catch (err) {
      onDone((err as Error).message, 'error');
    } finally { setLoading(false); }
  };

  if (submitted) {
    const trackerUrl = `${window.location.origin}/?track=${submitted.orderNo}`;
    return (
      <Modal title="تم استلام طلبك 🎉" onClose={onClose}>
        <div className="order-success">
          <CheckCircle2 size={48} className="icon--success" />
          <h3>شكراً لك!</h3>
          <p>رقم طلبك: <strong className="order-no-highlight">{submitted.orderNo}</strong></p>
          <p className="muted">احفظ هذا الرقم لمتابعة حالة مشروعك.</p>
          <div className="tracker-link-box">
            <p className="muted">رابط متابعة المشروع:</p>
            <a href={trackerUrl} className="tracker-link" target="_blank" rel="noopener">{trackerUrl}</a>
          </div>
          <button className="btn btn--primary" onClick={onClose} style={{ marginTop: 20 }}>إغلاق</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="ابدأ مشروعك" onClose={onClose} size="lg">
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="order-name">الاسم الكامل *</label>
            <input id="order-name" className="input" required placeholder="محمد أحمد" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="order-phone">رقم الهاتف *</label>
            <input id="order-phone" className="input" required placeholder="01xxxxxxxxx" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="order-email">البريد الإلكتروني</label>
            <input id="order-email" className="input" type="email" placeholder="email@example.com" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="order-type">نوع المشروع</label>
            <input id="order-type" className="input" placeholder="هوية بصرية، سوشيال ميديا..." value={f.projectType} onChange={e => setF(p => ({ ...p, projectType: e.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="order-pkg">الباقة</label>
            <select id="order-pkg" className="select" value={f.packageId} onChange={e => setF(p => ({ ...p, packageId: e.target.value }))}>
              <option value="">اختر باقة (اختياري)</option>
              {packages.map(p => <option key={p.id} value={p.id}>{p.title} — {money(p.price)}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="order-svc">الخدمة</label>
            <select id="order-svc" className="select" value={f.serviceId} onChange={e => setF(p => ({ ...p, serviceId: e.target.value }))}>
              <option value="">اختر خدمة (اختياري)</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="order-budget">الميزانية المتوقعة (جنيه)</label>
            <input id="order-budget" className="input" type="number" min="0" placeholder="5000" value={f.budget} onChange={e => setF(p => ({ ...p, budget: e.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="order-deadline">الموعد النهائي</label>
            <input id="order-deadline" className="input" type="date" value={f.deadline} onChange={e => setF(p => ({ ...p, deadline: e.target.value }))} />
          </div>
        </div>
        <div className="form-field" style={{ marginTop: 10 }}>
          <label className="form-label" htmlFor="order-notes">تفاصيل المشروع</label>
          <textarea id="order-notes" className="textarea" rows={4} maxLength={2000}
            placeholder="صف مشروعك، مرجعياتك، وأي طلبات خاصة..."
            value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))}
          />
        </div>
        <button type="submit" className="btn btn--primary" disabled={loading} style={{ width: '100%', marginTop: 14 }}>
          {loading ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
        </button>
      </form>
    </Modal>
  );
}
