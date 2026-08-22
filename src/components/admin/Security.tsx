import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { api } from '../../lib/api.js';

interface SecurityProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function Security({ onToast }: SecurityProps) {
  const [form,    setForm]    = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (form.newPassword !== form.confirm) {
      onToast('كلمات المرور الجديدة غير متطابقة', 'error');
      return;
    }
    if (form.newPassword.length < 12) {
      onToast('كلمة المرور يجب أن تكون 12 حرفاً على الأقل', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.admin.changePassword({
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      onToast('تم تغيير كلمة المرور بنجاح', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <div className="security-header">
        <LockKeyhole size={24} />
        <div>
          <h3 className="card-title">تغيير كلمة المرور</h3>
          <p className="muted">يجب أن تكون كلمة المرور الجديدة 12 حرفاً على الأقل.</p>
        </div>
      </div>
      <div className="form-stack">
        <div className="form-field">
          <label className="form-label">كلمة المرور الحالية</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
          />
        </div>
        <div className="form-field">
          <label className="form-label">كلمة المرور الجديدة</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
          />
          <div className="password-strength">
            <div
              className="password-strength__bar"
              style={{ width: `${Math.min(100, form.newPassword.length * 8)}%` }}
              aria-hidden
            />
          </div>
        </div>
        <div className="form-field">
          <label className="form-label">تأكيد كلمة المرور الجديدة</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
          />
        </div>
        <button className="btn btn--primary" disabled={loading} onClick={submit}>
          {loading ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
        </button>
      </div>
    </div>
  );
}
