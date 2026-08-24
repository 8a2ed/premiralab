import { useState, useEffect } from 'react';
import { Send, Bot, CreditCard, LineChart, Mail, Palette } from 'lucide-react';
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
  hero_title: 'نحول أفكارك إلى واقع رقمي مذهل.',
  hero_subtitle: 'من الهوية البصرية إلى المنصات المتقدمة، نحن هنا لنبني لك حضورًا استثنائيًا ينمو ويتفوق.',
  hero_primary_btn: 'تصفح باقاتنا', hero_secondary_btn: 'معرض الأعمال',
  footer_text: 'جميع الحقوق محفوظة',
};

export function SettingsPanel({ onToast }: SettingsPanelProps) {
  const [s,         setS]         = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

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
      onToast('تم حفظ الإعدادات بنجاح', 'success');
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
      {/* Appearance & Content Settings */}
      <div className="card" style={{ border: '1px solid var(--accent-dim)' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Palette size={20} className="icon--accent" /> المظهر والمحتوى (الرئيسية)
        </h3>
        <div className="form-stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <Field label="رابط اللوجو (Logo)" value={s.logo_url ?? ''} onChange={v => setS(x => ({ ...x, logo_url: v }))} placeholder="/logo.png" />
            <Field label="رابط أيقونة المتصفح (Favicon)" value={s.favicon_url ?? ''} onChange={v => setS(x => ({ ...x, favicon_url: v }))} placeholder="/logo.png" />
            <Field label="اللون الرئيسي (Primary)" value={s.primary_color ?? ''} onChange={v => setS(x => ({ ...x, primary_color: v }))} placeholder="#c084fc" />
            <Field label="اللون الفرعي (Accent)" value={s.accent_color ?? ''} onChange={v => setS(x => ({ ...x, accent_color: v }))} placeholder="#a855f7" />
          </div>
          <hr style={{ margin: '10px 0', border: 'none', borderBottom: '1px solid var(--border)' }} />
          <Field label="العنوان الرئيسي (Hero Title)" value={s.hero_title ?? ''} onChange={v => setS(x => ({ ...x, hero_title: v }))} />
          
          <div className="form-field">
            <label className="form-label">النص الفرعي (Hero Subtitle)</label>
            <textarea className="textarea" rows={2} value={s.hero_subtitle ?? ''} onChange={e => setS(x => ({ ...x, hero_subtitle: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <Field label="نص الزر الأساسي" value={s.hero_primary_btn ?? ''} onChange={v => setS(x => ({ ...x, hero_primary_btn: v }))} />
            <Field label="نص الزر الثانوي" value={s.hero_secondary_btn ?? ''} onChange={v => setS(x => ({ ...x, hero_secondary_btn: v }))} />
          </div>
          
          <div className="form-field">
            <label className="form-label">نص تذييل الموقع (Footer)</label>
            <input className="input" value={s.footer_text ?? ''} onChange={e => setS(x => ({ ...x, footer_text: e.target.value }))} />
          </div>

          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ المظهر'}
          </button>
        </div>
      </div>

      {/* General Settings */}
      <div className="card">
        <h3 className="card-title">إعدادات الموقع والهوية</h3>
        <div className="form-stack">
          <Field label="اسم الاستوديو"    value={s.brand}    onChange={v => setS(x => ({ ...x, brand: v }))} />
          <Field label="رقم الهاتف"        value={s.phone}    onChange={v => setS(x => ({ ...x, phone: v }))} />
          <Field label="البريد الإلكتروني" value={s.email}    onChange={v => setS(x => ({ ...x, email: v }))} type="email" />
          <Field label="رقم الواتساب"      value={s.whatsapp} onChange={v => setS(x => ({ ...x, whatsapp: v }))} placeholder="مثال: 01012345678" />
          <Field label="اسم مستخدم التيليغرام (للتواصل العام)" value={s.telegram} onChange={v => setS(x => ({ ...x, telegram: v }))} placeholder="مثال: premiralab" />
          <div className="form-field">
            <label className="form-label">العملة</label>
            <select className="select" value={s.currency} onChange={e => setS(x => ({ ...x, currency: e.target.value }))}>
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="AED">درهم إماراتي (AED)</option>
            </select>
          </div>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات العامة'}
          </button>
        </div>
      </div>

      {/* Payment & Banking Methods */}
      <div className="card" style={{ border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <CreditCard size={22} style={{ color: 'var(--accent)' }} />
          <h3 className="card-title" style={{ margin: 0 }}>طرق الدفع والتحويل البنكي (Payments & Banking)</h3>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
          ستظهر هذه البيانات لعملائك في صفحة تتبع الطلب وفي الفاتورة الرسمية ليتمكنوا من تحويل المستحقات ورفع إيصال السداد مباشرة.
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
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ بيانات الدفع'}
          </button>
        </div>
      </div>

      {/* Instant Telegram Alerts & Automations */}
      <div className="card" style={{ border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Bot size={22} style={{ color: 'var(--accent)' }} />
          <h3 className="card-title" style={{ margin: 0 }}>إشعارات التيليغرام الفورية (Telegram Alerts)</h3>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
          احصل على إشعار فوري على هاتفك بالثانية بمجرد أن يرسل أي عميل طلب مشروع جديد أو إيصال سداد أو طلب تعديل، متضمنًا بيانات العميل ورابط المحادثة المباشر على واتساب.
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

          <div style={{ background: 'var(--bg-3)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: 12, lineHeight: 1.8, color: 'var(--text-muted)' }}>
            <strong>💡 كيف تحصل على بيانات البوت في دقيقة واحدة؟</strong>
            <ol style={{ paddingRight: 20, marginTop: 4 }}>
              <li>افتح تطبيق التيليغرام وابحث عن <code>@BotFather</code> واكتب <code>/newbot</code> ثم انسخ الـ <b>Token</b>.</li>
              <li>ابحث عن <code>@userinfobot</code> في التيليغرام واضغط Start لمعرفة الـ <b>Id</b> الخاص بك.</li>
              <li>ابدأ محادثة مع بوتك الجديد بالضغط على <b>Start</b> لكي يتمكن من إرسال الرسائل إليك.</li>
            </ol>
          </div>

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

      {/* Analytics & Tracking */}
      <div className="card" style={{ border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <LineChart size={22} style={{ color: 'var(--accent)' }} />
          <h3 className="card-title" style={{ margin: 0 }}>تحليلات وتتبع الزوار (Analytics & Tracking)</h3>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
          قم بإضافة معرفات التتبع الخاصة بك لمراقبة الزيارات وقياس أداء الموقع والحملات الإعلانية. سيتم دمجها تلقائيًا بالصفحات العامة.
        </p>

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
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ بيانات التتبع'}
          </button>
        </div>
      </div>

      {/* SMTP Email Settings */}
      <div className="card" style={{ border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Mail size={22} style={{ color: 'var(--accent)' }} />
          <h3 className="card-title" style={{ margin: 0 }}>إعدادات البريد الإلكتروني (SMTP Emails)</h3>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
          قم بربط خادم بريد SMTP (مثل Gmail App Passwords أو Resend أو Namecheap) لإرسال رسائل تأكيد الطلب للعملاء بشكل احترافي.
        </p>

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
