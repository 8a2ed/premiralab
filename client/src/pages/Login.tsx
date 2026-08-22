import { useState } from 'react';
import { api } from '../lib/api.js';

interface LoginProps {
  onSuccess: () => void;
  onToast:   (msg: string, type?: 'success' | 'error') => void;
}

export function Login({ onSuccess, onToast }: LoginProps) {
  const [u,       setU]       = useState('');
  const [p,       setP]       = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.login(u, p);
      onSuccess();
    } catch (err) {
      onToast((err as Error).message, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', zIndex: 200 }}>
      <form className="modal login-form" onSubmit={submit} aria-label="نموذج تسجيل دخول الإدارة">
        <div className="login-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/logo.png" alt="PREMIRALAB" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 12, objectFit: 'contain' }} />
          <h2>تسجيل دخول الإدارة</h2>
          <p className="muted">PREMIRALAB — المصادقة تتم على الخادم باستخدام جلسة آمنة.</p>
        </div>
        <div className="form-stack">
          <div className="form-field">
            <label className="form-label" htmlFor="login-user">اسم المستخدم</label>
            <input
              id="login-user"
              className="input"
              placeholder="admin"
              value={u}
              onChange={e => setU(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="login-pass">كلمة المرور</label>
            <input
              id="login-pass"
              className="input"
              type="password"
              placeholder="••••••••••••"
              value={p}
              onChange={e => setP(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? 'جارٍ التحقق...' : 'دخول آمن'}
          </button>
        </div>
      </form>
    </div>
  );
}
