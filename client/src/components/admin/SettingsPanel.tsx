import { useState, useEffect } from 'react';
import { Send, Bot, CreditCard, LineChart } from 'lucide-react';
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
};

export function SettingsPanel({ onToast }: SettingsPanelProps) {
  const [s,         setS]         = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [testingTg, setTestingTg] = useState(false);

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

  const testTelegramAlert = async () => {
    if (!s.telegram_bot_token || !s.telegram_chat_id) {
      onToast('يرجى إدخال Bot Token و Chat ID أولاً ثم حفظ الإعدادات', 'error');
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
          احصل على إشعار فوري على هاتفك بالثانية بمجرد أن يرسل أي عميل طلب مشروع جديد أو إيصال سداد أو طلب تعديل، متضمناً بيانات العميل ورابط المحادثة المباشر على واتساب.
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
          قم بإضافة معرفات التتبع الخاصة بك لمراقبة الزيارات وقياس أداء الموقع والحملات الإعلانية. سيتم دمجها تلقائياً بالصفحات العامة.
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
