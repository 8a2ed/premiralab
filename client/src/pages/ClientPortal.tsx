import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Lock, Mail, User, Phone, LogOut, FileText, Download, FileBox, ShieldCheck, ArrowRight, ExternalLink, Activity } from 'lucide-react';
import { formatDate, money } from '../lib/utils.js';

interface ClientPortalProps {
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateHome: () => void;
}

type View = 'login' | 'register' | 'forgot' | 'reset' | 'dashboard';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  new:             { label: 'طلب جديد', bg: 'rgba(124, 58, 237, 0.12)', color: '#c084fc', dot: '#c084fc' },
  contacted:       { label: 'تم التواصل', bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', dot: '#60a5fa' },
  approved:        { label: 'معتمد للتنفيذ', bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', dot: '#4ade80' },
  payment_pending: { label: 'بانتظار الدفع', bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', dot: '#fbbf24' },
  paid:            { label: 'تم السداد', bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', dot: '#34d399' },
  in_progress:     { label: 'قيد التنفيذ', bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6', dot: '#f472b6' },
  review:          { label: 'مراجعة العميل', bg: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', dot: '#818cf8' },
  revisions:       { label: 'تعديلات مطلوبة', bg: 'rgba(249, 115, 22, 0.12)', color: '#fb923c', dot: '#fb923c' },
  completed:       { label: 'مكتمل ومسلّم 🎉', bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', dot: '#4ade80' },
  cancelled:       { label: 'ملغي', bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', dot: '#f87171' },
};

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
      onToast('إذا كان البريد مسجلًا، فستصلك رسالة الاسترجاع قريبًا', 'info');
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
      <div className="container" style={{ marginTop: 90, minHeight: '75vh', padding: '0 16px', maxWidth: 1100, boxSizing: 'border-box' }}>
        {/* Luxury Top Header Card */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          background: 'linear-gradient(145deg, rgba(124, 58, 237, 0.08), var(--bg-2))',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '16px 20px',
          marginBottom: 24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              fontWeight: 900,
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
            }}>
              {(client.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>مرحبًا بك، {client.name}</h2>
              <p className="muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
                بوابة العميل الرسمية • {client.phone || client.email}
              </p>
            </div>
          </div>
          <button
            className="btn btn--outline btn--sm"
            onClick={handleLogout}
            style={{
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 12,
              color: 'var(--text-muted)',
              borderColor: 'var(--border)',
            }}
          >
            <LogOut size={14} /> تسجيل الخروج
          </button>
        </div>

        {activeProject ? (
          <div className="card" style={{ borderRadius: 18, padding: 24 }}>
            <button className="btn btn--ghost" onClick={() => setActiveProject(null)} style={{ marginBottom: 20, padding: 0, gap: 6 }}>
              <ArrowRight size={16} /> عودة للطلبات
            </button>
            <h3 className="card-title" style={{ fontSize: 20 }}>مشروع: {activeProject.project.title}</h3>
            
            <div className="progress-bar" style={{ marginTop: 20, height: 10, borderRadius: 10 }}>
              <div className="progress-bar-fill" style={{ width: `${activeProject.project.progress}%` }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 13 }} className="muted">
              <span>تقدم المشروع</span>
              <strong style={{ color: 'var(--accent)' }}>{activeProject.project.progress}%</strong>
            </div>

            {activeProject.files?.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h4 style={{ fontSize: 16, marginBottom: 14 }}>الملفات المرفقة والتسليمات</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeProject.files.map((f: any) => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <FileBox size={22} className="muted" />
                        <div>
                          <strong style={{ fontSize: 14 }}>{f.original_name}</strong>
                          <div className="muted" style={{ fontSize: 11 }}>{Math.round(f.size / 1024)} KB • {formatDate(f.created_at)}</div>
                        </div>
                      </div>
                      <a href={`/uploads/${f.stored_name}`} target="_blank" rel="noreferrer" download={f.original_name} className="btn btn--primary btn--sm" style={{ padding: '6px 12px', fontSize: 12 }}>
                        <Download size={14} /> تحميل
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid">
            <div className="col-12" style={{ padding: 0 }}>
              <div className="card" style={{ padding: '20px', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 className="card-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>سجل طلباتي</h3>
                    <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: 'var(--accent)', fontSize: 11 }}>
                      {orders.length} طلبات
                    </span>
                  </div>
                  <button
                    className="btn btn--primary btn--glow btn--sm"
                    onClick={() => window.location.href = '/?order=1'}
                    style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    + طلب جديد
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <FileText size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontSize: 15 }}>لا يوجد لديك طلبات سابقة حتى الآن.</p>
                    <button className="btn btn--primary btn--sm" style={{ marginTop: 14 }} onClick={() => window.location.href = '/?order=1'}>
                      ابدأ أول مشروع الآن
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Desktop / Tablet Table View */}
                    <div className="client-orders-desktop-table table-wrap" style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ width: '100%', minWidth: 650 }}>
                        <thead>
                          <tr>
                            <th>رقم الطلب</th>
                            <th>الخدمة / الباقة</th>
                            <th>الميزانية</th>
                            <th>حالة الطلب</th>
                            <th>التاريخ</th>
                            <th>الإجراء والمتابعة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => {
                            const statusCfg = STATUS_CONFIG[o.status] || {
                              label: o.status,
                              bg: 'rgba(255,255,255,0.08)',
                              color: 'var(--text)',
                              dot: '#aaa',
                            };
                            return (
                              <tr key={o.id}>
                                <td>
                                  <a 
                                    href={`/?track=${o.order_no}`} 
                                    style={{ fontWeight: 800, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'monospace' }}
                                    title="فتح صفحة تتبع الطلب"
                                  >
                                    #{o.order_no}
                                  </a>
                                </td>
                                <td><strong>{o.package_title || o.service_title || 'خدمة مخصصة'}</strong></td>
                                <td>
                                  <strong>{money(o.budget || o.package_price || o.payment_amount || 0)}</strong>
                                  {o.payment_status === 'paid' && (
                                    <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: 11, marginRight: 6 }}>
                                      مسدد ✔
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '4px 10px',
                                      borderRadius: 20,
                                      background: statusCfg.bg,
                                      color: statusCfg.color,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      border: `1px solid ${statusCfg.color}35`,
                                    }}
                                  >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.dot }} />
                                    {statusCfg.label}
                                  </span>
                                </td>
                                <td>{formatDate(o.created_at)}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <a 
                                      href={`/?track=${o.order_no}`} 
                                      className="btn btn--sm btn--primary" 
                                      style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                    >
                                      <Activity size={13} /> تتبع الطلب والفاتورة
                                    </a>
                                    {o.project_id && (
                                      <button className="btn btn--outline btn--sm" onClick={() => loadProject(o.project_id)} style={{ padding: '6px 10px', fontSize: 12 }}>
                                        <FileText size={13} /> مساحة العمل
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Luxury Cards View */}
                    <div className="client-orders-mobile-cards" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {orders.map(o => {
                        const statusCfg = STATUS_CONFIG[o.status] || {
                          label: o.status,
                          bg: 'rgba(255,255,255,0.08)',
                          color: 'var(--text)',
                          dot: '#aaa',
                        };

                        return (
                          <div 
                            key={o.id} 
                            style={{ 
                              background: 'linear-gradient(145deg, var(--bg-2), var(--bg-3))', 
                              padding: '16px', 
                              borderRadius: 16, 
                              border: '1px solid var(--border)', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 12,
                              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                              overflow: 'hidden',
                              boxSizing: 'border-box',
                            }}
                          >
                            {/* Top Header: Order No + Localized Status Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <a
                                href={`/?track=${o.order_no}`}
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  fontSize: 15,
                                  color: 'var(--accent)',
                                  textDecoration: 'none',
                                  letterSpacing: 0.5,
                                }}
                              >
                                #{o.order_no}
                              </a>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '4px 10px',
                                  borderRadius: 20,
                                  background: statusCfg.bg,
                                  color: statusCfg.color,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  border: `1px solid ${statusCfg.color}35`,
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.dot }} />
                                {statusCfg.label}
                              </span>
                            </div>

                            {/* Service / Package Title */}
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.4 }}>
                              {o.package_title || o.service_title || 'خدمة تصميم وتطوير متكاملة'}
                            </div>

                            {/* Financial & Date Summary */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '8px 12px',
                              borderRadius: 10,
                              border: '1px solid rgba(255,255,255,0.04)',
                              fontSize: 12,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--text-muted)' }}>الميزانية:</span>
                                <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                                  {money(o.budget || o.package_price || o.payment_amount || 0)}
                                </strong>
                                {o.payment_status === 'paid' && (
                                  <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: 10, padding: '2px 6px' }}>
                                    مسدد ✔
                                  </span>
                                )}
                              </div>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                {formatDate(o.created_at)}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 2, width: '100%' }}>
                              <a
                                href={`/?track=${o.order_no}`}
                                className="btn btn--primary btn--sm btn--glow"
                                style={{
                                  flex: 1,
                                  justifyContent: 'center',
                                  gap: 6,
                                  padding: '10px 12px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  borderRadius: 10,
                                  textDecoration: 'none',
                                  textAlign: 'center',
                                  minWidth: 0,
                                }}
                              >
                                <Activity size={14} /> تتبع الطلب والفاتورة
                              </a>
                              {o.project_id && (
                                <button
                                  className="btn btn--outline btn--sm"
                                  onClick={() => loadProject(o.project_id)}
                                  style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '10px 12px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    borderRadius: 10,
                                    minWidth: 0,
                                  }}
                                >
                                  <FileText size={14} /> مساحة العمل
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
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
        <h1 style={{ fontSize: 42, marginBottom: 15, lineHeight: 1.2 }}>مرحبًا بك في<br/>بوابة العملاء</h1>
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
            {view === 'login' && <><h2 style={{ fontSize: 28, marginBottom: 5 }}>تسجيل الدخول</h2><p className="muted">أهلًا بعودتك! سجل دخولك لمتابعة أعمالك.</p></>}
            {view === 'register' && <><h2 style={{ fontSize: 28, marginBottom: 5 }}>إنشاء حساب</h2><p className="muted">أهلًا بك! يرجى ملء بياناتك للبدء.</p></>}
            {view === 'forgot' && <><h2 style={{ fontSize: 28, marginBottom: 5 }}>استرجاع الحساب</h2><p className="muted">أدخل بريدك وسنرسل لك رابطًا للتغيير.</p></>}
            {view === 'reset' && <><h2 style={{ fontSize: 28, marginBottom: 5 }}>كلمة المرور الجديدة</h2><p className="muted">يرجى اختيار كلمة مرور قوية.</p></>}
            {redirect === 'order' && view === 'register' && (
              <div style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: 12, borderRadius: 8, marginTop: 15, fontSize: 14 }}>
                يرجى إنشاء حسابك أولًا لتتمكن من تقديم الطلب ومتابعته لاحقًا.
              </div>
            )}
            {redirect === 'order' && view === 'login' && (
              <div style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: 12, borderRadius: 8, marginTop: 15, fontSize: 14 }}>
                يرجى تسجيل الدخول أولًا لتتمكن من تقديم الطلب ومتابعته لاحقًا.
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
                  <ShieldCheck size={14} /> سيتم ربط طلباتك السابقة بحسابك تلقائيًا إذا استخدمت نفس الإيميل.
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
