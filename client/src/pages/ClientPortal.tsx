import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Lock, Mail, User, Phone, LogOut, FileText, Download, CheckCircle2, AlertCircle, Key, FileBox } from 'lucide-react';
import { money, formatDate } from '../lib/utils.js';

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

  useEffect(() => {
    // Check if URL has reset token
    const url = new URL(window.location.href);
    const urlToken = url.searchParams.get('token');
    const urlEmail = url.searchParams.get('email');
    if (urlToken && urlEmail) {
      setToken(urlToken);
      setEmail(urlEmail);
      setView('reset');
      setLoading(false);
      return;
    }

    // Check auth
    api.client.me()
      .then(res => {
        setClient(res.client);
        setView('dashboard');
        loadDashboard();
      })
      .catch(() => {
        setView('login');
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
      setView('dashboard');
      loadDashboard();
      onToast('تم تسجيل الدخول بنجاح', 'success');
    } catch (err: any) {
      onToast(err.message || 'بيانات الدخول غير صحيحة', 'error');
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
      setView('dashboard');
      loadDashboard();
      onToast('تم إنشاء الحساب بنجاح', 'success');
    } catch (err: any) {
      onToast(err.message || 'فشل إنشاء الحساب', 'error');
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
      
      // Clear URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
      
      setView('login');
      setPassword('');
    } catch (err: any) {
      onToast(err.message || 'حدث خطأ', 'error');
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
    return <div className="container" style={{ marginTop: 100, textAlign: 'center' }}>جاري التحميل...</div>;
  }

  if (view === 'dashboard' && client) {
    return (
      <div className="container" style={{ marginTop: 100, minHeight: '70vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <div>
            <h2>مرحباً بك، {client.name}</h2>
            <p className="muted">بوابة العميل الخاصة بك</p>
          </div>
          <button className="btn btn--outline" onClick={handleLogout}>
            <LogOut size={18} /> تسجيل الخروج
          </button>
        </div>

        {activeProject ? (
          <div className="card">
            <button className="btn btn--outline" onClick={() => setActiveProject(null)} style={{ marginBottom: 20 }}>عودة للطلبات</button>
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
                <h3 className="card-title">طلباتي</h3>
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
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', marginTop: 60 }}>
      <div className="card" style={{ maxWidth: 450, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <User size={48} color="var(--primary)" style={{ background: 'var(--primary-light)', padding: 10, borderRadius: '50%', marginBottom: 15 }} />
          <h2>بوابة العملاء</h2>
          <p className="muted">
            {view === 'login' && 'سجل دخولك لمتابعة طلباتك ومشاريعك'}
            {view === 'register' && 'أنشئ حساباً جديداً لسهولة المتابعة'}
            {view === 'forgot' && 'استرجاع كلمة المرور'}
            {view === 'reset' && 'إنشاء كلمة مرور جديدة'}
          </p>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLogin} className="form-stack">
            <div className="form-field">
              <label className="form-label">البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', right: 12, top: 11, color: 'var(--muted)' }} />
                <input type="email" required className="form-input" style={{ paddingRight: 40 }} value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', right: 12, top: 11, color: 'var(--muted)' }} />
                <input type="password" required className="form-input" style={{ paddingRight: 40 }} value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <div style={{ textAlign: 'left', marginBottom: 15 }}>
              <button type="button" className="btn-link" onClick={() => setView('forgot')} style={{ fontSize: 13 }}>نسيت كلمة المرور؟</button>
            </div>
            <button type="submit" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <span className="muted">ليس لديك حساب؟ </span>
              <button type="button" className="btn-link" onClick={() => setView('register')}>إنشاء حساب جديد</button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="form-stack">
            <div className="form-field">
              <label className="form-label">الاسم بالكامل</label>
              <input type="text" required className="form-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">رقم الجوال</label>
              <input type="tel" required className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">البريد الإلكتروني</label>
              <input type="email" required className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
              <div className="form-hint" style={{ fontSize: 12, marginTop: 4, color: 'var(--primary)' }}>إذا كنت قد طلبت منا سابقاً بهذا البريد، سيتم ربط طلباتك السابقة بحسابك تلقائياً!</div>
            </div>
            <div className="form-field">
              <label className="form-label">كلمة المرور</label>
              <input type="password" required minLength={6} className="form-input" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} disabled={loading}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <span className="muted">لديك حساب بالفعل؟ </span>
              <button type="button" className="btn-link" onClick={() => setView('login')}>تسجيل الدخول</button>
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="form-stack">
            <div className="form-field">
              <label className="form-label">البريد الإلكتروني</label>
              <input type="email" required className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'جاري الإرسال...' : 'إرسال رابط الاسترجاع'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button type="button" className="btn-link" onClick={() => setView('login')}>العودة لتسجيل الدخول</button>
            </div>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleReset} className="form-stack">
            <div className="form-field">
              <label className="form-label">كلمة المرور الجديدة</label>
              <input type="password" required minLength={6} className="form-input" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
