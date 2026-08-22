import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import type { SiteSettings } from '../../types.js';

interface SettingsPanelProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

const DEFAULT_SETTINGS: SiteSettings = {
  brand: '', phone: '', email: '', currency: 'EGP', whatsapp: '', telegram: '',
};

export function SettingsPanel({ onToast }: SettingsPanelProps) {
  const [s,       setS]       = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    api.admin.settings().then(data => {
      setS({ ...DEFAULT_SETTINGS, ...data.site });
    }).catch(e => onToast((e as Error).message, 'error'))
      .finally(() => setLoading(false));
  }, [onToast]);

  const save = async () => {
    setSaving(true);
    try {
      await api.admin.saveSettings('site', s);
      onToast('تم حفظ الإعدادات', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="card"><p className="muted">جارٍ التحميل...</p></div>;

  return (
    <div className="card">
      <h3 className="card-title">إعدادات الموقع</h3>
      <div className="form-stack">
        <Field label="اسم الاستوديو"    value={s.brand}    onChange={v => setS(x => ({ ...x, brand: v }))} />
        <Field label="رقم الهاتف"        value={s.phone}    onChange={v => setS(x => ({ ...x, phone: v }))} />
        <Field label="البريد الإلكتروني" value={s.email}    onChange={v => setS(x => ({ ...x, email: v }))} type="email" />
        <Field label="رقم الواتساب"      value={s.whatsapp} onChange={v => setS(x => ({ ...x, whatsapp: v }))} placeholder="مثال: 01012345678" />
        <Field label="التيليغرام"        value={s.telegram} onChange={v => setS(x => ({ ...x, telegram: v }))} />
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
          {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </button>
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
