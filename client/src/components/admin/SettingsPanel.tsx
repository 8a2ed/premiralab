import { useState, useEffect } from 'react';
import { Send, Bot, CreditCard, LineChart, Mail, Palette, Sparkles, TrendingUp, Layout, MessageSquare, Layers } from 'lucide-react';
import { api } from '../../lib/api.js';
import type { SiteSettings } from '../../types.js';

interface SettingsPanelProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

const DEFAULT_SETTINGS: SiteSettings = {
  brand: '', phone: '', email: '', currency: 'EGP', whatsapp: '', telegram: '',
  telegram_bot_token: '', telegram_chat_id: '',
  instapay_username: '', vodafone_cash: '', bank_details: '', payment_instructions: '',
  google_analytics_id: '', meta_pixel_id: '',
  smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '', smtp_from_name: '', smtp_from_email: '',
  logo_url: '/logo.png', favicon_url: '/logo.png', primary_color: '#c084fc', accent_color: '#a855f7',
  hero_badge: 'استوديو رقمي متكامل للتصميم والتطوير',
  hero_title: 'نحوّل أفكارك إلى واقع رقمي استثنائي',
  hero_subtitle: 'من الهوية البصرية وتصميم الواجهات إلى المنصات المتقدمة، نحن هنا لنبني لعلامتك التجارية حضورًا قويًا ينمو ويتفوق.',
  hero_primary_btn: 'ابدأ مشروعك الآن', 
  hero_secondary_btn: 'تصفح أعمالنا',
  hero_trust_1: 'ضمان أعلى جودة',
  hero_trust_2: 'تسليم سريع ومتقن',
  // Live Metrics
  stat_1_num: '+150', stat_1_label: 'مشروع ناجح ومكتمل',
  stat_2_num: '100%', stat_2_label: 'نسبة رضا وثقة العملاء',
  stat_3_num: '48 س', stat_3_label: 'متوسط بدء التنفيذ',
  stat_4_num: '24/7', stat_4_label: 'متابعة ودعم مستمر',
  // Section Headings
  testimonials_eyebrow: 'آراء العملاء',
  seo_title: '', seo_description: '', seo_image: '/og-image.png',
  testimonials_title: 'ثقة عملائنا هي سر نجاحنا',
  testimonials_subtitle: 'تجارب حقيقية لشركاء النجاح الذين وضعوا ثقتهم في استوديوهاتنا',
  services_eyebrow: 'خدماتنا المتخصصة',
  services_title: 'حلول رقمية متكاملة لنمو أعمالك',
  services_subtitle: 'نقدم مجموعة متكاملة من الخدمات الإبداعية والتقنية وفق أعلى معايير الجودة العالمية',
  packages_eyebrow: 'باقات الأسعار',
  packages_title: 'باقات متكاملة تناسب طموحاتك',
  packages_subtitle: 'اختر الباقة الأنسب لحجم مشروعك وابدأ رحلة التفوق الرقمي بكل ثقة ووضوح',
  portfolio_eyebrow: 'معرض الأعمال',
  portfolio_title: 'أعمال نفتخر بإنجازها',
  portfolio_subtitle: 'نماذج وتجارب بصرية صممناها لشركائنا بأعلى درجات الإتقان والابتكار',
  faqs_eyebrow: 'الأسئلة الشائعة',
  faqs_title: 'إجابات عن أكثر ما يشغل بالك',
  faqs_subtitle: 'كل ما تود معرفته عن مراحل العمل، الدفع، والتسليم',
  // Bottom CTA
  cta_badge: 'لنبدأ معًا اليوم',
  cta_title: 'جاهز لنقل علامتك التجارية إلى المستوى التالي؟',
  cta_desc: 'دعنا نبتكر لك هوية وتجربة رقمية فريدة تُميّزك عن منافسيك وتحقق أهدافك بأعلى احترافية.',
  cta_btn_primary: 'ابدأ مشروعك الآن',
  cta_btn_wa: 'استشارة عبر واتساب',
  footer_text: 'جميع الحقوق محفوظة',
};

export function SettingsPanel({ onToast }: SettingsPanelProps) {
  const [s,         setS]         = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'metrics' | 'sections' | 'general' | 'payments' | 'integrations'>('content');

  useEffect(() => {
    api.admin.settings().then(data => {
      setS({ ...DEFAULT_SETTINGS, ...data.site });
    }).catch(e => onToast((e as Error).message, 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      await api.admin.saveSettings('site', s);
      onToast('تم حفظ وتحديث الإعدادات بنجاح في الموقع فورًا 🚀', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  const testEmail = async () => {
    setTestingEmail(true);
    try {
      await api.admin.saveSettings('site', s);
      const res = await api.admin.testEmail();
      onToast(res.message || 'تم الإرسال بنجاح!', 'success');
    } catch (e) {
      onToast((e as Error).message, 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  const testTelegramAlert = async () => {
    if (!s.telegram_bot_token || !s.telegram_chat_id) {
      onToast('يرجى إدخال Bot Token و Chat ID أولًا ثم حفظ الإعدادات', 'error');
      return;
    }
    setTestingTg(true);
    try {
      await api.admin.saveSettings('site', s);
      const res = await api.admin.testTelegram();
      onToast(res.message || 'تم إرسال الإشعار إلى هاتفك بنجاح!', 'success');
    } catch (e) {
      onToast((e as Error).message, 'error');
    } finally {
      setTestingTg(false);
    }
  };

  if (loading) return <div className="card"><p className="muted">جارٍ التحميل...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sub-Navigation Tabs */}
      <div className="admin-tabs-nav" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <TabBtn label="واجهة البداية والهوية" icon={<Palette size={16} />} active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
        <TabBtn label="شريط الأرقام والمؤشرات" icon={<TrendingUp size={16} />} active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} />
        <TabBtn label="نصوص وعناوين الأقسام" icon={<Layout size={16} />} active={activeTab === 'sections'} onClick={() => setActiveTab('sections')} />
        <TabBtn label="بيانات التواصل والعامة" icon={<MessageSquare size={16} />} active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
        <TabBtn label="طرق الدفع والبنوك" icon={<CreditCard size={16} />} active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} />
        <TabBtn label="الربط والإشعارات" icon={<Bot size={16} />} active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
        <TabBtn label="الظهور والروابط (SEO)" icon={<Sparkles size={16} />} active={activeTab === 'seo'} onClick={() => setActiveTab('seo')} />
      </div>

      {/* TAB 1: Hero & Appearance */}
      {activeTab === 'content' && (
        <div className="card animation-fade-in" style={{ border: '1px solid var(--accent-dim)' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Palette size={20} className="icon--accent" /> واجهة البداية والمظهر العام (Hero Section)
          </h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            تحكّم بشكل كامل في نصوص البداية، الشارات، الألوان، والشعار الرئيسي للموقع.
          </p>

          <div className="form-stack">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <Field label="رابط اللوجو (Logo)" value={s.logo_url ?? ''} onChange={v => setS(x => ({ ...x, logo_url: v }))} placeholder="/logo.png" />
              <Field label="رابط أيقونة المتصفح (Favicon)" value={s.favicon_url ?? ''} onChange={v => setS(x => ({ ...x, favicon_url: v }))} placeholder="/logo.png" />
              <Field label="اللون الرئيسي (Primary)" value={s.primary_color ?? ''} onChange={v => setS(x => ({ ...x, primary_color: v }))} placeholder="#c084fc" />
              <Field label="اللون الفرعي (Accent)" value={s.accent_color ?? ''} onChange={v => setS(x => ({ ...x, accent_color: v }))} placeholder="#a855f7" />
            </div>

            <hr style={{ margin: '10px 0', border: 'none', borderBottom: '1px solid var(--border)' }} />

            <Field label="الشارة العلوية (Hero Badge)" value={s.hero_badge ?? ''} onChange={v => setS(x => ({ ...x, hero_badge: v }))} placeholder="مثال: استوديو رقمي متكامل للتصميم والتطوير" />
            <Field label="العنوان الرئيسي (Hero Title)" value={s.hero_title ?? ''} onChange={v => setS(x => ({ ...x, hero_title: v }))} placeholder="مثال: نحوّل أفكارك إلى واقع رقمي استثنائي" />
            
            <div className="form-field">
              <label className="form-label">النص التعريفي الفرعي (Hero Subtitle)</label>
              <textarea className="textarea" rows={2} value={s.hero_subtitle ?? ''} onChange={e => setS(x => ({ ...x, hero_subtitle: e.target.value }))} placeholder="وصف موجز وقوي يظهر تحت العنوان الرئيسي..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Field label="نص الزر الأساسي" value={s.hero_primary_btn ?? ''} onChange={v => setS(x => ({ ...x, hero_primary_btn: v }))} placeholder="ابدأ مشروعك الآن" />
              <Field label="نص الزر الثانوي" value={s.hero_secondary_btn ?? ''} onChange={v => setS(x => ({ ...x, hero_secondary_btn: v }))} placeholder="تصفح أعمالنا" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Field label="شارة الثقة 1 (Trust Badge 1)" value={s.hero_trust_1 ?? ''} onChange={v => setS(x => ({ ...x, hero_trust_1: v }))} placeholder="ضمان أعلى جودة" />
              <Field label="شارة الثقة 2 (Trust Badge 2)" value={s.hero_trust_2 ?? ''} onChange={v => setS(x => ({ ...x, hero_trust_2: v }))} placeholder="تسليم سريع ومتقن" />
            </div>

            <div className="form-field">
              <label className="form-label">نص تذييل الموقع (Footer Text)</label>
              <input className="input" value={s.footer_text ?? ''} onChange={e => setS(x => ({ ...x, footer_text: e.target.value }))} placeholder="جميع الحقوق محفوظة..." />
            </div>

            <button className="btn btn--primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', minWidth: 160 }}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات فورًا'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Live Metrics Bar */}
      {activeTab === 'metrics' && (
        <div className="card animation-fade-in" style={{ border: '1px solid var(--accent-dim)' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={20} className="icon--accent" /> شريط الأرقام والمؤشرات الحية (Live Stats Bar)
          </h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            عدّل الأرقام والكلمات الترويجية التي تظهر في شريط الإحصائيات أسفل واجهة البداية مباشرة.
          </p>

          <div className="form-stack">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {/* Stat 1 */}
              <div style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', marginBottom: 10, color: 'var(--accent)' }}>المؤشر الأول:</strong>
                <Field label="الرقم / النسبة" value={s.stat_1_num ?? ''} onChange={v => setS(x => ({ ...x, stat_1_num: v }))} placeholder="+150" />
                <Field label="الوصف" value={s.stat_1_label ?? ''} onChange={v => setS(x => ({ ...x, stat_1_label: v }))} placeholder="مشروع ناجح ومكتمل" />
              </div>

              {/* Stat 2 */}
              <div style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', marginBottom: 10, color: 'var(--accent)' }}>المؤشر الثاني:</strong>
                <Field label="الرقم / النسبة" value={s.stat_2_num ?? ''} onChange={v => setS(x => ({ ...x, stat_2_num: v }))} placeholder="100%" />
                <Field label="الوصف" value={s.stat_2_label ?? ''} onChange={v => setS(x => ({ ...x, stat_2_label: v }))} placeholder="نسبة رضا وثقة العملاء" />
              </div>

              {/* Stat 3 */}
              <div style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', marginBottom: 10, color: 'var(--accent)' }}>المؤشر الثالث:</strong>
                <Field label="الرقم / المدة" value={s.stat_3_num ?? ''} onChange={v => setS(x => ({ ...x, stat_3_num: v }))} placeholder="48 س" />
                <Field label="الوصف" value={s.stat_3_label ?? ''} onChange={v => setS(x => ({ ...x, stat_3_label: v }))} placeholder="متوسط بدء التنفيذ" />
              </div>

              {/* Stat 4 */}
              <div style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', marginBottom: 10, color: 'var(--accent)' }}>المؤشر الرابع:</strong>
                <Field label="الرقم / التواجد" value={s.stat_4_num ?? ''} onChange={v => setS(x => ({ ...x, stat_4_num: v }))} placeholder="24/7" />
                <Field label="الوصف" value={s.stat_4_label ?? ''} onChange={v => setS(x => ({ ...x, stat_4_label: v }))} placeholder="متابعة ودعم مستمر" />
              </div>
            </div>

            <button className="btn btn--primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', minWidth: 160, marginTop: 10 }}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ المؤشرات فورًا'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Section Headings & CTA Banner */}
      {activeTab === 'sections' && (
        <div className="card animation-fade-in" style={{ border: '1px solid var(--border)' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layout size={20} className="icon--accent" /> نصوص وعناوين أقسام الصفحة الرئيسية
          </h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            يمكنك تخصيص الشارة العلوية (Eyebrow)، العنوان الرئيسي (Title)، والوصف (Subtitle) لكل قسم على حدة.
          </p>

          <div className="form-stack">
            {/* Testimonials */}
            <SectionGroup title="قسم آراء العملاء (Testimonials)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                <Field label="الشارة العلوية" value={s.testimonials_eyebrow ?? ''} onChange={v => setS(x => ({ ...x, testimonials_eyebrow: v }))} placeholder="آراء العملاء" />
                <Field label="العنوان الرئيسي" value={s.testimonials_title ?? ''} onChange={v => setS(x => ({ ...x, testimonials_title: v }))} placeholder="ثقة عملائنا هي سر نجاحنا" />
              </div>
              <Field label="النص التوضيحي" value={s.testimonials_subtitle ?? ''} onChange={v => setS(x => ({ ...x, testimonials_subtitle: v }))} placeholder="تجارب حقيقية لشركاء النجاح..." />
            </SectionGroup>

            {/* Services */}
            <SectionGroup title="قسم الخدمات (Services)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                <Field label="الشارة العلوية" value={s.services_eyebrow ?? ''} onChange={v => setS(x => ({ ...x, services_eyebrow: v }))} placeholder="خدماتنا المتخصصة" />
                <Field label="العنوان الرئيسي" value={s.services_title ?? ''} onChange={v => setS(x => ({ ...x, services_title: v }))} placeholder="حلول رقمية متكاملة لنمو أعمالك" />
              </div>
              <Field label="النص التوضيحي" value={s.services_subtitle ?? ''} onChange={v => setS(x => ({ ...x, services_subtitle: v }))} placeholder="نقدم مجموعة متكاملة من الخدمات الإبداعية..." />
            </SectionGroup>

            {/* Packages */}
            <SectionGroup title="قسم باقات الأسعار (Packages)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                <Field label="الشارة العلوية" value={s.packages_eyebrow ?? ''} onChange={v => setS(x => ({ ...x, packages_eyebrow: v }))} placeholder="باقات الأسعار" />
                <Field label="العنوان الرئيسي" value={s.packages_title ?? ''} onChange={v => setS(x => ({ ...x, packages_title: v }))} placeholder="باقات متكاملة تناسب طموحاتك" />
              </div>
              <Field label="النص التوضيحي" value={s.packages_subtitle ?? ''} onChange={v => setS(x => ({ ...x, packages_subtitle: v }))} placeholder="اختر الباقة الأنسب لحجم مشروعك..." />
            </SectionGroup>

            {/* Portfolio */}
            <SectionGroup title="قسم معرض الأعمال (Portfolio)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                <Field label="الشارة العلوية" value={s.portfolio_eyebrow ?? ''} onChange={v => setS(x => ({ ...x, portfolio_eyebrow: v }))} placeholder="معرض الأعمال" />
                <Field label="العنوان الرئيسي" value={s.portfolio_title ?? ''} onChange={v => setS(x => ({ ...x, portfolio_title: v }))} placeholder="أعمال نفتخر بإنجازها" />
              </div>
              <Field label="النص التوضيحي" value={s.portfolio_subtitle ?? ''} onChange={v => setS(x => ({ ...x, portfolio_subtitle: v }))} placeholder="نماذج وتجارب بصرية صممناها لشركائنا..." />
            </SectionGroup>

            {/* FAQs */}
            <SectionGroup title="قسم الأسئلة الشائعة (FAQs)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                <Field label="الشارة العلوية" value={s.faqs_eyebrow ?? ''} onChange={v => setS(x => ({ ...x, faqs_eyebrow: v }))} placeholder="الأسئلة الشائعة" />
                <Field label="العنوان الرئيسي" value={s.faqs_title ?? ''} onChange={v => setS(x => ({ ...x, faqs_title: v }))} placeholder="إجابات عن أكثر ما يشغل بالك" />
              </div>
              <Field label="النص التوضيحي" value={s.faqs_subtitle ?? ''} onChange={v => setS(x => ({ ...x, faqs_subtitle: v }))} placeholder="كل ما تود معرفته عن مراحل العمل..." />
            </SectionGroup>

            {/* Bottom CTA */}
            <SectionGroup title="بنر التحويل الختامي (Bottom CTA Banner)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                <Field label="الشارة العلوية" value={s.cta_badge ?? ''} onChange={v => setS(x => ({ ...x, cta_badge: v }))} placeholder="لنبدأ معًا اليوم" />
                <Field label="العنوان الرئيسي" value={s.cta_title ?? ''} onChange={v => setS(x => ({ ...x, cta_title: v }))} placeholder="جاهز لنقل علامتك التجارية إلى المستوى التالي؟" />
              </div>
              <Field label="النص التوضيحي" value={s.cta_desc ?? ''} onChange={v => setS(x => ({ ...x, cta_desc: v }))} placeholder="دعنا نبتكر لك هوية وتجربة رقمية فريدة..." />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="نص زر الطلب" value={s.cta_btn_primary ?? ''} onChange={v => setS(x => ({ ...x, cta_btn_primary: v }))} placeholder="ابدأ مشروعك الآن" />
                <Field label="نص زر الواتساب" value={s.cta_btn_wa ?? ''} onChange={v => setS(x => ({ ...x, cta_btn_wa: v }))} placeholder="استشارة عبر واتساب" />
              </div>
            </SectionGroup>

            <button className="btn btn--primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', minWidth: 160, marginTop: 10 }}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ نصوص الأقسام فورًا'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: General Settings */}
      {activeTab === 'general' && (
        <div className="card animation-fade-in">
          <h3 className="card-title">إعدادات الموقع والهوية ومعلومات التواصل</h3>
          <div className="form-stack">
            <Field label="اسم الاستوديو (Brand Name)" value={s.brand} onChange={v => setS(x => ({ ...x, brand: v }))} placeholder="PREMIRALAB" />
            <Field label="رقم الهاتف الأساسي" value={s.phone} onChange={v => setS(x => ({ ...x, phone: v }))} />
            <Field label="البريد الإلكتروني للتواصل" value={s.email} onChange={v => setS(x => ({ ...x, email: v }))} type="email" />
            <Field label="رقم الواتساب (للتواصل السريع والطلبات)" value={s.whatsapp} onChange={v => setS(x => ({ ...x, whatsapp: v }))} placeholder="مثال: 01012345678" />
            <Field label="اسم مستخدم التيليغرام (للتواصل العام)" value={s.telegram} onChange={v => setS(x => ({ ...x, telegram: v }))} placeholder="مثال: premiralab" />
            <div className="form-field">
              <label className="form-label">العملة الافتراضية</label>
              <select className="select" value={s.currency} onChange={e => setS(x => ({ ...x, currency: e.target.value }))}>
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="AED">درهم إماراتي (AED)</option>
              </select>
            </div>
            <button className="btn btn--primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', minWidth: 160 }}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات العامة'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: Payment Methods */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animation-fade-in">
          {/* Electronic Payment Gateway (Paymob) */}
          <div className="card" style={{ border: '1px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreditCard size={22} style={{ color: 'var(--accent)' }} />
                <h3 className="card-title" style={{ margin: 0 }}>بوابة الدفع الإلكتروني (Paymob — فودافون كاش، فيزا، ميزة، فوري)</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(s.paymob_enabled)}
                    onChange={e => setS(x => ({ ...x, paymob_enabled: e.target.checked }))}
                  />
                  <span>تفعيل الدفع الإلكتروني التلقائي</span>
                </label>
              </div>
            </div>

            <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
              عند تفعيل Paymob، سيتمكن العملاء من سداد قيمة الطلبات المعتمدة فوراً باستخدام <strong>فودافون كاش، اتصالات/أورنج كاش، بطاقات فيزا وماستركارد وميزة، أو كود فوري</strong>. يتم تحديث حالة الطلب إلى (مدفوع) تلقائياً بالثانية.
            </p>

            <div className="form-stack">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  id="paymob_test_mode"
                  checked={Boolean(s.paymob_test_mode)}
                  onChange={e => setS(x => ({ ...x, paymob_test_mode: e.target.checked }))}
                />
                <label htmlFor="paymob_test_mode" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
                  <strong>وضع الاختبار التجريبي (Test / Sandbox Mode)</strong> — استخدم بيانات بطاقات الاختبار
                </label>
              </div>

              <div className="grid-2">
                <Field
                  label="مفتاح الـ API الأساسي (Paymob API Key)"
                  value={s.paymob_api_key ?? ''}
                  onChange={v => setS(x => ({ ...x, paymob_api_key: v }))}
                  placeholder="ZXlKaGJHY2lPaUpTVXpVeE..."
                />
                <Field
                  label="المفتاح السري (Secret Key)"
                  value={s.paymob_secret_key ?? ''}
                  onChange={v => setS(x => ({ ...x, paymob_secret_key: v }))}
                  placeholder="sec_..."
                />
              </div>

              <div className="grid-3">
                <Field
                  label="معرف ربط الكروت وفيزا وميزة (Card Integration ID)"
                  value={s.paymob_integration_id_card ?? ''}
                  onChange={v => setS(x => ({ ...x, paymob_integration_id_card: v }))}
                  placeholder="مثال: 123456"
                />
                <Field
                  label="معرف ربط فودافون كاش والمحافظ (Wallet Integration ID)"
                  value={s.paymob_integration_id_wallet ?? ''}
                  onChange={v => setS(x => ({ ...x, paymob_integration_id_wallet: v }))}
                  placeholder="مثال: 123457"
                />
                <Field
                  label="معرف ربط كود فوري (Fawry Integration ID)"
                  value={s.paymob_integration_id_fawry ?? ''}
                  onChange={v => setS(x => ({ ...x, paymob_integration_id_fawry: v }))}
                  placeholder="مثال: 123458"
                />
              </div>

              <div className="grid-2">
                <Field
                  label="معرف نافذة الدفع (iFrame ID)"
                  value={s.paymob_iframe_id ?? ''}
                  onChange={v => setS(x => ({ ...x, paymob_iframe_id: v }))}
                  placeholder="مثال: 789012"
                />
                <Field
                  label="توقيع الأمان (HMAC Secret) — للتحقق من صحة المعاملات"
                  value={s.paymob_hmac_secret ?? ''}
                  onChange={v => setS(x => ({ ...x, paymob_hmac_secret: v }))}
                  placeholder="HEX String من لوحة تحكم Paymob"
                />
              </div>

              <div style={{ background: 'var(--bg-3)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: 12, lineHeight: 1.8, color: 'var(--text-muted)' }}>
                <strong>🔗 رابط الـ Webhook الخاص بك لإضافته في لوحة تحكم Paymob:</strong>
                <br />
                <code style={{ background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 6, color: 'var(--accent)', direction: 'ltr', display: 'inline-block', marginTop: 4 }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/payment/paymob/webhook` : '/api/payment/paymob/webhook'}
                </code>
              </div>

              <button className="btn btn--primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', minWidth: 160 }}>
                {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات Paymob'}
              </button>
            </div>
          </div>

          {/* Manual Offline Payment Methods */}
          <div className="card" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <CreditCard size={22} style={{ color: 'var(--accent)' }} />
              <h3 className="card-title" style={{ margin: 0 }}>التحويلات المباشرة اليدوية (InstaPay & Vodafone Cash Manual)</h3>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
              ستظهر هذه البيانات لعملائك كخيار بديل في حال رغبتهم في التحويل المباشر عبر تطبيق InstaPay أو محفظة كاش ورفع صورة إيصال التحويل للمراجعة.
            </p>

            <div className="form-stack">
              <Field
                label="عنوان انستاباي (InstaPay Handle / IPA)"
                value={s.instapay_username ?? ''}
                onChange={v => setS(x => ({ ...x, instapay_username: v }))}
                placeholder="مثال: studio@instapay"
              />
              <Field
                label="رقم فودافون كاش ومحافظ إلكترونية (Vodafone Cash / Wallets)"
                value={s.vodafone_cash ?? ''}
                onChange={v => setS(x => ({ ...x, vodafone_cash: v }))}
                placeholder="مثال: 010xxxxxxxx"
              />
              <Field
                label="بيانات الحساب البنكي والآيبان (Bank Account / IBAN)"
                value={s.bank_details ?? ''}
                onChange={v => setS(x => ({ ...x, bank_details: v }))}
                placeholder="مثال: بنك CIB - الحساب: 1000xxxx - الآيبان: EGxxxxxxxx"
              />
              <div className="form-field">
                <label className="form-label">إرشادات وتعليمات الدفع للعملاء</label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={s.payment_instructions ?? ''}
                  onChange={e => setS(x => ({ ...x, payment_instructions: e.target.value }))}
                  placeholder="مثال: يرجى تحويل 50% دفعة مقدمة لبدء العمل، ثم رفع صورة إيصال التحويل لتأكيد الطلب."
                />
              </div>
              <button className="btn btn--primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', minWidth: 160 }}>
                {saving ? 'جارٍ الحفظ...' : 'حفظ بيانات التحويل اليدوي'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Integrations, Telegram, Analytics & SMTP */}
      {activeTab === 'integrations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animation-fade-in">
          {/* Telegram */}
          <div className="card" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Bot size={22} style={{ color: 'var(--accent)' }} />
              <h3 className="card-title" style={{ margin: 0 }}>إشعارات التيليغرام الفورية (Telegram Alerts)</h3>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
              احصل على إشعار فوري على هاتفك بالثانية بمجرد أن يرسل أي عميل طلب مشروع جديد أو إيصال سداد أو طلب تعديل.
            </p>

            <div className="form-stack">
              <Field
                label="رمز البوت (Telegram Bot Token)"
                value={s.telegram_bot_token ?? ''}
                onChange={v => setS(x => ({ ...x, telegram_bot_token: v }))}
                placeholder="مثال: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
              />
              <Field
                label="معرّف المحادثة (Telegram Chat ID)"
                value={s.telegram_chat_id ?? ''}
                onChange={v => setS(x => ({ ...x, telegram_chat_id: v }))}
                placeholder="مثال: 123456789"
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                <button className="btn btn--primary" onClick={save} disabled={saving}>
                  {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات البوت'}
                </button>
                <button className="btn" onClick={testTelegramAlert} disabled={testingTg}>
                  <Send size={15} /> {testingTg ? 'جارٍ الإرسال...' : 'إرسال إشعار تجريبي'}
                </button>
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="card" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <LineChart size={22} style={{ color: 'var(--accent)' }} />
              <h3 className="card-title" style={{ margin: 0 }}>تحليلات وتتبع الزوار (Analytics & Tracking)</h3>
            </div>
            <div className="form-stack">
              <Field
                label="Google Analytics Measurement ID (G-XXXXXXXXXX)"
                value={s.google_analytics_id ?? ''}
                onChange={v => setS(x => ({ ...x, google_analytics_id: v }))}
                placeholder="مثال: G-1234567890"
              />
              <Field
                label="Meta / Facebook Pixel ID"
                value={s.meta_pixel_id ?? ''}
                onChange={v => setS(x => ({ ...x, meta_pixel_id: v }))}
                placeholder="مثال: 123456789012345"
              />
              <button className="btn btn--primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                {saving ? 'جارٍ الحفظ...' : 'حفظ بيانات التتبع'}
              </button>
            </div>
          </div>

          {/* SMTP */}
          <div className="card" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Mail size={22} style={{ color: 'var(--accent)' }} />
              <h3 className="card-title" style={{ margin: 0 }}>إعدادات البريد الإلكتروني (SMTP Emails)</h3>
            </div>
            <div className="form-stack">
              <div className="grid-2">
                <Field label="اسم المرسل (From Name)" value={s.smtp_from_name ?? ''} onChange={v => setS(x => ({ ...x, smtp_from_name: v }))} placeholder="مثال: Design Studio" />
                <Field label="إيميل المرسل (From Email)" value={s.smtp_from_email ?? ''} onChange={v => setS(x => ({ ...x, smtp_from_email: v }))} placeholder="مثال: no-reply@example.com" />
              </div>
              <div className="grid-2">
                <Field label="خادم SMTP (Host)" value={s.smtp_host ?? ''} onChange={v => setS(x => ({ ...x, smtp_host: v }))} placeholder="مثال: smtp.gmail.com" />
                <Field label="المنفذ (Port)" value={s.smtp_port ?? ''} onChange={v => setS(x => ({ ...x, smtp_port: v }))} placeholder="مثال: 465 أو 587" />
              </div>
              <div className="grid-2">
                <Field label="اسم المستخدم (SMTP User)" value={s.smtp_user ?? ''} onChange={v => setS(x => ({ ...x, smtp_user: v }))} placeholder="مثال: youremail@gmail.com" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>كلمة المرور (SMTP Password)</label>
                  <input type="password" className="input" value={s.smtp_pass ?? ''} onChange={e => setS(x => ({ ...x, smtp_pass: e.target.value }))} placeholder="كلمة مرور التطبيق (App Password)" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn--primary" onClick={save} disabled={saving}>
                  {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات البريد'}
                </button>
                <button className="btn btn--outline" onClick={testEmail} disabled={testingEmail || saving}>
                  {testingEmail ? 'جارٍ الإرسال...' : 'إرسال رسالة اختبار'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animation-fade-in">
          <div className="card" style={{ border: '1px solid var(--accent-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Sparkles size={22} style={{ color: 'var(--accent)' }} />
              <h3 className="card-title" style={{ margin: 0 }}>إعدادات الظهور ومعاينة الروابط (SEO & Open Graph)</h3>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
              تحكم في كيف يظهر موقعك عند مشاركة الرابط على الواتساب، فيسبوك، ماسنجر أو تيليجرام.
            </p>
            
            <div className="form-stack">
              <Field
                label="عنوان معاينة الرابط (OG Title)"
                value={s.seo_title ?? ''}
                onChange={v => setS(x => ({ ...x, seo_title: v }))}
                placeholder="مثال: PREMIRALAB | منصة تصميم احترافية"
              />
              
              <div className="form-field">
                <label className="form-label">وصف معاينة الرابط (OG Description)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={s.seo_description ?? ''}
                  onChange={e => setS(x => ({ ...x, seo_description: e.target.value }))}
                  placeholder="وصف مختصر يظهر تحت العنوان عند مشاركة الرابط"
                />
              </div>

              <div className="form-field">
                <label className="form-label">صورة معاينة الرابط (OG Image URL)</label>
                <input
                  className="input"
                  value={s.seo_image ?? ''}
                  onChange={e => setS(x => ({ ...x, seo_image: e.target.value }))}
                  placeholder="مسار أو رابط الصورة (مثال: /og-image.png أو رابط مباشر)"
                  dir="ltr"
                />
                <span className="muted" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  يُفضل أن تكون الصورة أفقية (نسبة 1.91:1) بحجم لا يقل عن 1200×630 بيكسل لضمان أفضل ظهور.
                </span>
                
                {s.seo_image && (
                  <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', maxWidth: 400 }}>
                    <img src={s.seo_image} alt="OG Preview" style={{ width: '100%', display: 'block' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn--primary" onClick={save} disabled={saving}>
                  {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الروابط'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn ${active ? 'btn--primary' : 'btn--outline'}`}
      style={{
        padding: '8px 16px',
        fontSize: 13,
        borderRadius: 999,
        gap: 8,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-3)', padding: 18, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <strong style={{ color: 'var(--accent)', fontSize: 14 }}>{title}</strong>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
