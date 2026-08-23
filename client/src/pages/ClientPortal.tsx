import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Lock, Mail, User, Phone, LogOut, FileText, Download, FileBox, ShieldCheck, ArrowRight } from 'lucide-react';
import { formatDate } from '../lib/utils.js';

interface ClientPortalProps {
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateHome: () => void;
}

type View = 'login' | 'register' | 'forgot' | 'reset' | 'dashboard';

export function ClientPortal({ onToast, onNavigateHome }: ClientPortalProps) {
  const [view, setView] = useState<View>('login');
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  
  // Dashboard State
  const [orders, setOrders] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);

  // Check redirects
  const url = new URL(window.location.href);
  const redirect = url.searchParams.get('redirect');

  useEffect(() => {
    const urlToken = url.searchParams.get('token');
    const urlEmail = url.searchParams.get('email');
    const urlView = url.searchParams.get('view') as View;

    if (urlToken && urlEmail) {
      setToken(urlToken);
      setEmail(urlEmail);
      setView('reset');
      setLoading(false);
      return;
    }

    if (urlView === 'register') {
      setView('register');
    }

    // Check auth
    api.client.me()
      .then(res => {
        setClient(res.client);
        if (redirect === 'order') {
          window.location.href = '/?order=1';
        } else {
          setView('dashboard');
          loadDashboard();
        }
      })
      .catch(() => {
        // Not logged in, stay on login/register view
      })
      .finally(() => setLoading(false));
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.client.orders();
      setOrders(res.orders);
    } catch (e) {
      onToast('فشل تحميل الطلبات', 'error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.client.login({ email, password });
      setClient(res);
      onToast('تم تسجيل الدخول بنجاح', 'success');
      
      if (redirect === 'order') {
        window.location.href = '/?order=1';
      } else {
        setView('dashboard');
        loadDashboard();
      }
    } catch (err: any) {
      onToast(err.error || err.message || 'بيانات الدخول غير صحيحة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.client.register({ name, phone, email, password });
      setClient(res);
      onToast('تم إنشاء الحساب بنجاح', 'success');
      
      if (redirect === 'order') {
        window.location.href = '/?order=1';
      } else {
        setView('dashboard');
        loadDashboard();
      }
    } catch (err: any) {
      onToast(err.error || err.message || 'فشل إنشاء الحساب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.client.forgotPassword(email);
      onToast('إذا كان البريد مسجلاً، فستصلك رسالة الاسترجاع قريباً', 'info');
      setView('login');
    } catch (err) {
      onToast('حدث خطأ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.client.resetPassword({ token, email, password });
      onToast('تم تغيير كلمة المرور بنجاح، تفضل بتسجيل الدخول', 'success');
      url.searchParams.delete('token');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
      setView('login');
      setPassword('');
    } catch (err: any) {
      onToast(err.error || err.message || 'حدث خطأ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.client.logout();
    setClient(null);
    setView('login');
  };

  const loadProject = async (id: number) => {
    try {
      const res = await api.client.project(id);
      setActiveProject(res);
    } catch (e) {
      onToast('فشل تحميل تفاصيل المشروع', 'error');
    }
  };

  if (loading && !client && view !== 'reset') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-card)' }}>
        <div className="auth-brand-side" style={{ flex: 1, background: 'linear-gradient(135deg, var(--bg-1), var(--accent-dim))', borderLeft: '1px solid var(--border)' }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ height: 40, width: '60%', background: 'var(--bg-3)', borderRadius: 8, marginBottom: 10, margin: '0 auto' }} />
            <div style={{ height: 20, width: '40%', background: 'var(--bg-3)', borderRadius: 8, marginBottom: 40, margin: '0 auto' }} />
            <div style={{ height: 48, background: 'var(--bg-3)', borderRadius: 8, marginBottom: 15 }} />
            <div style={{ height: 48, background: 'var(--bg-3)', borderRadius: 8, marginBottom: 25 }} />
            <div style={{ height: 48, background: 'var(--accent-dim)', borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  // Render Dashboard
  if (view === 'dashboard' && client) {
    return (
      <div className="container" style={{ marginTop: 100, minHeight: '70vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <div>
            <h2 style={{ margin: '0 0 5px' }}>مرحباً بك، {client.name}</h2>
            <p className="muted" style={{ margin: 0 }}>بوابة العميل الخاصة بك</p>
          </div>
          <button className="btn btn--outline" onClick={handleLogout}>
            <LogOut size={18} /> تسجيل الخروج
          </button>
        </div>

        {activeProject ? (
          <div className="card">
            <button className="btn btn--ghost" onClick={() => setActiveProject(null)} style={{ marginBottom: 20, padding: 0 }}>
              <ArrowRight size={18} /> عودة للطلبات
            </button>
            <h3 className="card-title">مشروع: {activeProject.project.title}</h3>
            
            <div className="progress-bar" style={{ marginTop: 20 }}>
              <div className="progress-bar-fill" style={{ width: `${activeProject.project.progress}%` }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 13 }} className="muted">
              <span>تقدم المشروع</span>
              <span>{activeProject.project.progress}%</span>
            </div>

            {activeProject.files?.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h4>الملفات المرفقة والتسليمات</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15 }}>
                  {activeProject.files.map((f: any) => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: 15, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <FileBox size={24} className="muted" />
                        <div>
                          <strong>{f.original_name}</strong>
                          <div className="muted" style={{ fontSize: 12 }}>{Math.round(f.size / 1024)} KB • {formatDate(f.created_at)}</div>
                        </div>
                      </div>
                      <a href={`/uploads/${f.stored_name}`} target="_blank" rel="noreferrer" download={f.original_name} className="btn btn--primary btn--sm">
                        <Download size={16} /> تحميل
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid">
            <div className="col-12">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="card-title" style={{ margin: 0 }}>طلباتي</h3>
                  <button className="btn btn--primary" onClick={() => window.location.href = '/?order=1'}>طلب جديد</button>
                </div>
                {orders.length === 0 ? (
                  <div className="empty">لا يوجد لديك طلبات سابقة.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>رقم الطلب</th>
                          <th>الخدمة / الباقة</th>
                          <th>الحالة</th>
                          <th>التاريخ</th>
                          <th>المشروع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(o => (
                          <tr key={o.id}>
                            <td><strong>{o.order_no}</strong></td>
                            <td>{o.package_title || o.service_title || '—'}</td>
                            <td><span className={`badge status-${o.status}`}>{o.status}</span></td>
                            <td>{formatDate(o.created_at)}</td>
                            <td>
                              {o.project_id ? (
                                <button className="btn btn--outline btn--sm" onClick={() => loadProject(o.project_id)}>
                                  <FileText size={14} /> عرض المشروع
                                </button>
                              ) : <span className="muted">قيد الانتظار</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Auth Forms
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-card)' }}>
      {/* Left side: Branding (Hidden on mobile) */}
      <div className="auth-brand-side" style={{ flex: 1, background: 'linear-gradient(135deg, var(--bg-1), var(--accent-dim))', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 60, borderLeft: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 42, marginBottom: 15, lineHeight: 1.2 }}>مرحباً بك في<br/>بوابة العملاء</h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.6, marginBottom: 40 }}>
          تابع طلباتك ومشاريعك بكل سهولة، وحمل ملفاتك النهائية بأمان تام في أي وقت.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, color: 'var(--text)', background: 'var(--bg-3)', padding: '15px 20px', borderRadius: 12, width: 'fit-content' }}>
          <ShieldCheck size={28} color="var(--success)" />
          <div>
            <div style={{ fontWeight: 'bold' }}>منصة آمنة 100%</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>جميع بياناتك وملفاتك مشفرة بالكامل.</div>
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            {view === 'login' && <><h2 style={{ fontSize: 28, marginBottom: 5 }}>تسجيل الدخول</h2><p className="muted">أهلاً بعودتك! سجل دخولك لمتابعة أعمالك.</p></>}
            {view === 'register' && <><h2 style={{ fontSize: 28, marginBottom: 5 }}>إنشاء حساب</h2><p className="muted">أهلاً بك! يرجى ملء بياناتك للبدء.</p></>}
            {view === 'forgot' && <><h2 style={{ fontSize: 28, marginBottom: 5 }}>استرجاع الحساب</h2><p className="muted">أدخل بريدك وسنرسل لك رابطاً للتغيير.</p></>}
            {view === 'reset' && <><h2 style={{ fontSize: 28, marginBottom: 5 }}>كلمة المرور الجديدة</h2><p className="muted">يرجى اختيار كلمة مرور قوية.</p></>}
            {redirect === 'order' && view === 'register' && (
              <div style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: 12, borderRadius: 8, marginTop: 15, fontSize: 14 }}>
                يرجى إنشاء حسابك أولاً لتتمكن من تقديم الطلب ومتابعته لاحقاً.
              </div>
            )}
            {redirect === 'order' && view === 'login' && (
              <div style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: 12, borderRadius: 8, marginTop: 15, fontSize: 14 }}>
                يرجى تسجيل الدخول أولاً لتتمكن من تقديم الطلب ومتابعته لاحقاً.
              </div>
            )}
          </div>

          {view === 'login' && (
            <form onSubmit={handleLogin} className="form-stack">
              <div className="form-field">
                <label className="form-label">البريد الإلكتروني</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input type="email" required className="form-input" style={{ paddingRight: 42, paddingLeft: 12, height: 48 }} value={email} onChange={e => setEmail(e.target.value)} placeholder="example@domain.com" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">كلمة المرور</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input type="password" required className="form-input" style={{ paddingRight: 42, paddingLeft: 12, height: 48 }} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <div style={{ textAlign: 'left', marginBottom: 25 }}>
                <button type="button" className="link" onClick={() => setView('forgot')} style={{ fontSize: 13 }}>نسيت كلمة المرور؟</button>
              </div>
              <button type="submit" className="btn btn--primary btn--lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 30 }}>
                <span className="muted">ليس لديك حساب؟ </span>
                <button type="button" className="link" onClick={() => setView('register')}>إنشاء حساب جديد</button>
              </div>
            </form>
          )}

          {view === 'register' && (
            <form onSubmit={handleRegister} className="form-stack">
              <div className="form-field">
                <label className="form-label">الاسم بالكامل</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input type="text" required className="form-input" style={{ paddingRight: 42, paddingLeft: 12, height: 48 }} value={name} onChange={e => setName(e.target.value)} placeholder="أحمد محمد" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">رقم الجوال</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input type="tel" required className="form-input" style={{ paddingRight: 42, paddingLeft: 12, height: 48 }} value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">البريد الإلكتروني</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input type="email" required className="form-input" style={{ paddingRight: 42, paddingLeft: 12, height: 48 }} value={email} onChange={e => setEmail(e.target.value)} placeholder="example@domain.com" />
                </div>
                <div className="form-hint" style={{ fontSize: 12, marginTop: 6, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={14} /> سيتم ربط طلباتك السابقة بحسابك تلقائياً إذا استخدمت نفس الإيميل.
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">كلمة المرور</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input type="password" required minLength={6} className="form-input" style={{ paddingRight: 42, paddingLeft: 12, height: 48 }} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" className="btn btn--primary btn--lg" style={{ width: '100%', justifyContent: 'center', marginTop: 15 }} disabled={loading}>
                {loading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 30 }}>
                <span className="muted">لديك حساب بالفعل؟ </span>
                <button type="button" className="link" onClick={() => setView('login')}>تسجيل الدخول</button>
              </div>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgot} className="form-stack">
              <div className="form-field">
                <label className="form-label">البريد الإلكتروني</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input type="email" required className="form-input" style={{ paddingRight: 42, paddingLeft: 12, height: 48 }} value={email} onChange={e => setEmail(e.target.value)} placeholder="example@domain.com" />
                </div>
              </div>
              <button type="submit" className="btn btn--primary btn--lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'جاري الإرسال...' : 'إرسال رابط الاسترجاع'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 30 }}>
                <button type="button" className="link" onClick={() => setView('login')}>العودة لتسجيل الدخول</button>
              </div>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handleReset} className="form-stack">
              <div className="form-field">
                <label className="form-label">كلمة المرور الجديدة</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input type="password" required minLength={6} className="form-input" style={{ paddingRight: 42, paddingLeft: 12, height: 48 }} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" className="btn btn--primary btn--lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
