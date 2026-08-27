import { useState } from 'react';
import { Eye, EyeOff, Lock, User, LogIn, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api.js';

interface LoginProps {
  onSuccess: () => void;
  onToast:   (msg: string, type?: 'success' | 'error') => void;
}

export function Login({ onSuccess, onToast }: LoginProps) {
  const [u,        setU]        = useState('');
  const [p,        setP]        = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u.trim() || !p.trim()) {
      onToast('يرجى إدخال اسم المستخدم وكلمة المرور', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.login(u.trim(), p);
      onSuccess();
    } catch (err) {
      onToast((err as Error).message || 'فشل تسجيل الدخول، تحقق من البيانات وأعد المحاولة', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page-bg">
      {/* Ambient Background Blobs */}
      <div className="login-blob login-blob--1" />
      <div className="login-blob login-blob--2" />

      <form className="login-card" onSubmit={submit} aria-label="نموذج تسجيل دخول لوحة التحكم">

        {/* Header */}
        <div className="login-card__header">
          <div className="login-logo-wrap">
            <img src="/logo.png" alt="PREMIRALAB" className="login-logo" />
          </div>
          <h1 className="login-title">لوحة التحكم</h1>
          <p className="login-subtitle">
            مرحباً بك مجدداً، أدخل بياناتك للمتابعة
          </p>
        </div>

        {/* Fields */}
        <div className="login-fields">

          {/* Username */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-user">
              <User size={13} />
              اسم المستخدم
            </label>
            <div className="login-input-wrap">
              <input
                id="login-user"
                className="login-input"
                placeholder="admin"
                value={u}
                onChange={e => setU(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-pass">
              <Lock size={13} />
              كلمة المرور
            </label>
            <div className="login-input-wrap">
              <input
                id="login-pass"
                className="login-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={p}
                onChange={e => setP(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPass(s => !s)}
                aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            
            {/* Forgot Password Link (WhatsApp Reset) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <a 
                href="https://wa.me/201069572748?text=مرحباً، أواجه مشكلة في تسجيل الدخول وأحتاج إلى استعادة كلمة المرور الخاصة بي."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  padding: '2px 4px',
                  borderRadius: 4
                }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--primary-hover)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--primary)'}
              >
                نسيت كلمة المرور؟
              </a>
            </div>
          </div>

          {/* Submit */}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading
              ? <><span className="login-spinner" />جاري التحقق...</>
              : <><LogIn size={18} />دخول الآن</>
            }
          </button>

        </div>

        {/* Footer Note */}
        <div className="login-card__footer">
          <ShieldCheck size={14} />
          <span>للوصول المصرّح به فقط — PREMIRALAB</span>
        </div>

      </form>
    </div>
  );
}
