import { useState, useEffect, useCallback } from 'react';
import { 
  Search, Download, MessageSquare, Phone, Key, ShieldCheck, 
  User, RefreshCw, Layers, Eye, EyeOff, Copy, Check, Trash2, Edit, ExternalLink 
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate, debounce, downloadUrl, waLink, money } from '../../lib/utils.js';
import type { Client, Paginated, Order } from '../../types.js';
import { TableSkeleton } from '../ui/Skeleton.js';
import { Modal } from '../ui/Modal.js';
import { ORDER_STATUS_LABELS } from '../../types.js';

interface ClientsProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function Clients({ onToast }: ClientsProps) {
  const [data,           setData]           = useState<Paginated<Client> | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [page,           setPage]           = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const load = useCallback(async (s = search, p = page) => {
    setLoading(true);
    try {
      const res = await api.admin.clients({ page: p, search: s || undefined });
      setData(res);
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [search, page, onToast]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedSearch = useCallback(
    debounce((val: unknown) => { setPage(1); load(val as string, 1); }, 400),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleSearch = (val: string) => { setSearch(val); debouncedSearch(val); };
  const exportCSV = () => downloadUrl(api.admin.exportClientsUrl(), `clients-${new Date().toISOString().slice(0,10)}.csv`);

  const getClientWa = (phone: string, name: string) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    const msg = `مرحبًا ${name}، نتواصل معك من استوديو PREMIRALAB.`;
    return waLink(intlPhone, msg);
  };

  const handleDeleteClient = async (c: Client) => {
    if (!window.confirm(`هل أنت متأكد من حذف العميل "${c.name}"؟`)) return;
    try {
      const res = await api.admin.deleteClient(c.id);
      onToast(res.message || 'تم حذف العميل بنجاح', 'success');
      load();
    } catch (e: any) {
      onToast(e.message || 'فشل حذف العميل', 'error');
    }
  };

  return (
    <div className="card" style={{ padding: '20px', borderRadius: 16 }}>
      {/* Top Toolbar */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div className="toolbar__search" style={{ flex: 1, minWidth: 260 }}>
          <Search size={16} className="toolbar__search-icon" aria-hidden />
          <input
            className="input toolbar__input"
            placeholder="بحث بالاسم، رقم الهاتف، أو البريد الإلكتروني..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            aria-label="بحث في العملاء"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--outline btn--sm" onClick={() => load()} title="تحديث البيانات">
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> تحديث
          </button>
          <button className="btn btn--sm" onClick={exportCSV}>
            <Download size={14} /> تصدير CSV
          </button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} cols={5} /> : (
        <>
          {/* Desktop Table View */}
          <div className="clients-desktop-table table-wrap" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: 720 }}>
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>بيانات التواصل</th>
                  <th>حالة الحساب</th>
                  <th>الطلبات والمبالغ</th>
                  <th>المحفظة/النقاط</th>
                  <th>تاريخ الانضمام</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: 14,
                        }}>
                          {(c.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: 14, display: 'block' }}>{c.name}</strong>
                          <span className="muted" style={{ fontSize: 11 }}>ID: #{c.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{c.phone}</span>
                          <a
                            href={getClientWa(c.phone, c.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn--icon btn--sm"
                            style={{ color: '#25D366', padding: 2 }}
                            title="مراسلة عبر واتساب"
                          >
                            <MessageSquare size={13} />
                          </a>
                          <a
                            href={`tel:${c.phone}`}
                            className="btn btn--icon btn--sm"
                            style={{ color: 'var(--text-muted)', padding: 2 }}
                            title="اتصال هاتفي"
                          >
                            <Phone size={13} />
                          </a>
                        </div>
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="muted link" style={{ fontSize: 11, direction: 'ltr', textAlign: 'right' }}>
                            {c.email}
                          </a>
                        )}
                      </div>
                    </td>

                    <td>
                      {c.has_password ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          <ShieldCheck size={13} /> حساب مسجل
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          <User size={13} /> طلب ضيف
                        </span>
                      )}
                    </td>

                    <td>
                      <div>
                        <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: 'var(--accent)', fontSize: 11 }}>
                          {c.orders_count || 0} طلبات
                        </span>
                        {Number(c.total_spent || 0) > 0 && (
                          <div style={{ fontSize: 11, color: '#10b981', marginTop: 3, fontWeight: 700 }}>
                            مسدد: {money(c.total_spent || 0)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--primary)' }}>
                          💳 {c.wallet_balance || 0} ج.م
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          ✨ {c.points || 0} نقطة
                        </span>
                      </div>
                    </td>

                    <td className="muted" style={{ fontSize: 12 }}>{formatDate(c.created_at)}</td>

                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn btn--sm btn--primary"
                          onClick={() => setSelectedClient(c)}
                          style={{ padding: '6px 12px', fontSize: 12, gap: 5 }}
                        >
                          <Key size={13} /> إدارة والحساب
                        </button>
                        <button
                          className="btn btn--icon btn--sm btn--danger"
                          onClick={() => handleDeleteClient(c)}
                          title="حذف العميل"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="clients-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 12 }}>
            {data?.rows.map(c => (
              <div
                key={c.id}
                style={{
                  background: 'var(--bg-3)',
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 15,
                    }}>
                      {(c.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: 15 }}>{c.name}</strong>
                      <div className="muted" style={{ fontSize: 11 }}>{formatDate(c.created_at)}</div>
                    </div>
                  </div>

                  {c.has_password ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                      <ShieldCheck size={12} /> مسجل
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>
                      ضيف
                    </span>
                  )}
                </div>

                {/* Contact Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)', padding: '8px 12px', borderRadius: 10, fontSize: 12 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.phone}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a
                      href={getClientWa(c.phone, c.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--sm"
                      style={{ padding: '4px 8px', color: '#25D366', borderColor: '#25D366', fontSize: 11 }}
                    >
                      <MessageSquare size={12} /> واتساب
                    </a>
                    <a
                      href={`tel:${c.phone}`}
                      className="btn btn--sm btn--outline"
                      style={{ padding: '4px 8px', fontSize: 11 }}
                    >
                      <Phone size={12} /> اتصال
                    </a>
                  </div>
                </div>

                {/* Stats & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                  <div>
                    <span className="muted" style={{ fontSize: 12 }}>الطلبات: </span>
                    <strong>{c.orders_count || 0}</strong>
                    {Number(c.total_spent || 0) > 0 && (
                      <span style={{ color: '#10b981', fontSize: 12, marginRight: 8, fontWeight: 700 }}>
                        ({money(c.total_spent || 0)})
                      </span>
                    )}
                  </div>

                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => setSelectedClient(c)}
                    style={{ padding: '6px 12px', fontSize: 12, gap: 5 }}
                  >
                    <Key size={13} /> التحكم والباسورد
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!data?.rows.length && <div className="empty">لا يوجد عملاء مطابقون.</div>}

          {data && data.total > 50 && (
            <div className="pagination" style={{ marginTop: 20 }}>
              <button className="btn btn--sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(search, p); }}>السابق</button>
              <span className="muted" style={{ fontSize: 13 }}>صفحة {page} من {Math.ceil(data.total / 50)}</span>
              <button className="btn btn--sm" disabled={page >= Math.ceil(data.total / 50)} onClick={() => { const p = page + 1; setPage(p); load(search, p); }}>التالي</button>
            </div>
          )}
        </>
      )}

      {/* Comprehensive Client Detail & Control Modal */}
      {selectedClient && (
        <ClientControlModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onToast={onToast}
          onUpdated={() => { load(); }}
        />
      )}
    </div>
  );
}

// ─── Comprehensive Client Control Modal ───────────────────────────────────────

interface ClientControlModalProps {
  client:    Client;
  onClose:   () => void;
  onToast:   (msg: string, type?: 'success' | 'error') => void;
  onUpdated: () => void;
}

function ClientControlModal({ client, onClose, onToast, onUpdated }: ClientControlModalProps) {
  const [activeTab,     setActiveTab]     = useState<'security' | 'profile' | 'orders'>('security');
  const [fullData,      setFullData]      = useState<{ client: Client; orders: Order[]; stats: any } | null>(null);
  const [, setLoadingData]  = useState(true);

  // Profile Edit State
  const [name,          setName]          = useState(client.name);
  const [phone,         setPhone]         = useState(client.phone);
  const [email,         setEmail]         = useState(client.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security / Password State
  const [newPassword,    setNewPassword]    = useState('');
  const [showPassword,   setShowPassword]   = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Temporary password reset result
  const [tempPassResult, setTempPassResult] = useState<string | null>(null);
  
  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number>(client.wallet_balance || 0);
  const [points, setPoints] = useState<number>(client.points || 0);
  const [savingWallet, setSavingWallet] = useState(false);
  const [copiedPass,     setCopiedPass]     = useState(false);
  const [resettingPass,  setResettingPass]  = useState(false);

  const loadFullClient = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await api.admin.client(client.id);
      setFullData(res);
      setName(res.client.name);
      setPhone(res.client.phone);
      setEmail(res.client.email || '');
      setWalletBalance(res.client.wallet_balance || 0);
      setPoints(res.client.points || 0);
    } catch (e: any) {
      onToast(e.message || 'فشل تحميل بيانات العميل', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [client.id, onToast]);

  useEffect(() => {
    loadFullClient();
  }, [loadFullClient]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.admin.updateClient(client.id, { name, phone, email });
      onToast(res.message || 'تم تحديث بيانات العميل بنجاح', 'success');
      onUpdated();
      loadFullClient();
    } catch (e: any) {
      onToast(e.message || 'فشل حفظ البيانات', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSetCustomPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      onToast('يجب ألا تقل كلمة المرور عن 6 أحرف', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await api.admin.setClientPassword(client.id, newPassword.trim());
      onToast(res.message || 'تم تعيين كلمة المرور الجديدة بنجاح', 'success');
      setNewPassword('');
      setTempPassResult(null);
      onUpdated();
      loadFullClient();
    } catch (e: any) {
      onToast(e.message || 'فشل تعيين كلمة المرور', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleGenerateQuickReset = async () => {
    setResettingPass(true);
    try {
      const res = await api.admin.resetClientPassword(client.id);
      setTempPassResult(res.tempPassword);
      onToast(res.message || 'تم إنشاء كلمة مرور مؤقتة بنجاح', 'success');
      onUpdated();
      loadFullClient();
    } catch (e: any) {
      onToast(e.message || 'فشل إعادة التعيين', 'error');
    } finally {
      setResettingPass(false);
    }
  };


  const handleUpdateWallet = async () => {
    setSavingWallet(true);
    try {
      await api.admin.updateClientWallet(client.id, { balance: walletBalance, points });
      onToast('تم تحديث المحفظة بنجاح', 'success');
      onUpdated();
      loadFullClient();
    } catch (e: any) {
      onToast(e.message || 'فشل تحديث المحفظة', 'error');
    } finally {
      setSavingWallet(false);
    }
  };
  const copyPassword = (pass: string) => {
    navigator.clipboard.writeText(pass).then(() => {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2500);
    });
  };

  const getWaPasswordLink = (pass: string) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    const msg = `مرحبًا ${name}،\nتم تعيين كلمة مرور جديدة لحسابك في منصة PREMIRALAB:\n🔑 كلمة المرور: ${pass}\n\nيمكنك تسجيل الدخول ومتابعة مشاريعك من الرابط:\nhttps://premiralab.up.railway.app/client`;
    return waLink(intlPhone, msg);
  };

  return (
    <Modal title={`إدارة حساب العميل — ${client.name}`} onClose={onClose} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Client Top Header Card */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), var(--bg-2))',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 18,
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
            }}>
              {(name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{name}</h3>
                {fullData?.client.has_password ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    <ShieldCheck size={13} /> حساب مفعل
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    <User size={13} /> حساب ضيف
                  </span>
                )}
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                عضو منذ: {formatDate(client.created_at)} • المعرف: #{client.id}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={waLink(phone, `مرحبًا ${name}، نتواصل معك من استوديو PREMIRALAB.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--sm"
              style={{ color: '#25D366', borderColor: '#25D366', gap: 5, padding: '6px 12px' }}
            >
              <MessageSquare size={14} /> واتساب
            </a>
            <a
              href={`tel:${phone}`}
              className="btn btn--sm btn--outline"
              style={{ gap: 5, padding: '6px 12px' }}
            >
              <Phone size={14} /> اتصال
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'security' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('security')}
            style={{ gap: 6, borderRadius: 8 }}
          >
            <Key size={14} /> الأمان وكلمات المرور
          </button>
          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'orders' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('orders')}
            style={{ gap: 6, borderRadius: 8 }}
          >
            <Layers size={14} /> سجل الطلبات والماليات ({fullData?.orders.length ?? client.orders_count ?? 0})
          </button>
          <button 
            type="button"
            className={`btn btn--sm ${activeTab === 'wallet' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('wallet')}
          >
            المحفظة والنقاط 💳
          </button>
          <button 
            type="button"
            className={`btn btn--sm ${activeTab === 'profile' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('profile')}
          >
            بيانات العميل
          </button>
        </div>

        {activeTab === 'wallet' && (
          <div className="form-stack" style={{ gap: 16 }}>
            <h4 style={{ margin: 0 }}>إدارة رصيد المحفظة ونقاط الولاء</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group">
                <label>رصيد المحفظة (EGP)</label>
                <input type="number" className="input" value={walletBalance} onChange={e => setWalletBalance(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label>نقاط الولاء</label>
                <input type="number" className="input" value={points} onChange={e => setPoints(Number(e.target.value))} />
              </div>
            </div>
            <button className="btn btn--primary" onClick={handleUpdateWallet} disabled={savingWallet} style={{ width: '100%', marginTop: 10 }}>
              {savingWallet ? 'جاري الحفظ...' : 'تحديث المحفظة'}
            </button>
            <div style={{ background: 'var(--bg-3)', padding: 12, borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
              <p>ملاحظة: يمكنك تعديل رصيد العميل ونقاطه يدوياً هنا.</p>
              <p>رابط دعوة العميل: <strong>{client.referral_code || 'لم يتم إنشاء طلب بعد'}</strong></p>
            </div>
          </div>
        )}

        {/* ─── TAB 1: Security & Password Management ─── */}
        {activeTab === 'security' && (
          <div className="form-stack" style={{ gap: 16 }}>
            {/* Quick Reset Generator */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), var(--bg-3))',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: 14,
              padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Key size={16} color="var(--accent)" /> إعادة تعيين وتوليد كلمة مرور مؤقتة (Quick Reset)
                  </h4>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                    توليد كلمة سر عشوائية جديدة للعميل فورًا وإمكانية إرسالها له بضغطة زر.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--sm btn--glow"
                  onClick={handleGenerateQuickReset}
                  disabled={resettingPass}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {resettingPass ? 'جارٍ التوليد...' : '⚡ توليد كلمة مرور جديدة'}
                </button>
              </div>

              {tempPassResult && (
                <div className="animation-fade-in" style={{
                  background: 'var(--bg)',
                  border: '1.5px dashed #22c55e',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginTop: 10,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    تم إنشاء كلمة المرور الجديدة بنجاح:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 900, color: '#22c55e', letterSpacing: 1 }} dir="ltr">
                      {tempPassResult}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn--sm"
                        style={{ background: copiedPass ? '#22c55e' : 'var(--bg-2)', border: '1px solid var(--border)' }}
                        onClick={() => copyPassword(tempPassResult)}
                      >
                        {copiedPass ? <><Check size={13} color="#fff" /> تم النسخ</> : <><Copy size={13} /> نسخ الباسورد</>}
                      </button>
                      <a
                        href={getWaPasswordLink(tempPassResult)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--sm"
                        style={{ background: '#25D366', color: '#fff', border: 'none', gap: 5 }}
                      >
                        <MessageSquare size={13} /> إرسال للعميل عبر واتساب
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Set Custom Password Manually */}
            <div style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 16,
            }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>تعيين كلمة مرور مخصصة يدويًا</h4>
              <p className="muted" style={{ margin: '0 0 14px', fontSize: 12 }}>
                اكتب كلمة مرور جديدة بنفسك للعميل (أقل شيء 6 خانات).
              </p>

              <form onSubmit={handleSetCustomPassword} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة المرور الجديدة (مثال: Mira@2026)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    dir="ltr"
                    style={{ paddingLeft: 40, height: 42, fontFamily: 'monospace' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={savingPassword || !newPassword.trim()}
                  style={{ height: 42, padding: '0 18px', whiteSpace: 'nowrap' }}
                >
                  {savingPassword ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─── TAB 2: Orders & Financial Summary ─── */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Financial Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                <span className="muted" style={{ fontSize: 11, display: 'block' }}>إجمالي الطلبات</span>
                <strong style={{ fontSize: 18, marginTop: 4, display: 'block' }}>
                  {fullData?.stats?.totalOrders ?? client.orders_count ?? 0}
                </strong>
              </div>
              <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                <span className="muted" style={{ fontSize: 11, display: 'block' }}>إجمالي المسدد</span>
                <strong style={{ fontSize: 18, color: '#22c55e', marginTop: 4, display: 'block' }}>
                  {money(fullData?.stats?.totalPaid ?? client.total_spent ?? 0)}
                </strong>
              </div>
              <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                <span className="muted" style={{ fontSize: 11, display: 'block' }}>المتبقي للسداد</span>
                <strong style={{ fontSize: 18, color: 'var(--accent)', marginTop: 4, display: 'block' }}>
                  {money(fullData?.stats?.outstanding ?? 0)}
                </strong>
              </div>
            </div>

            {/* Orders List */}
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fullData?.orders.map(o => (
                <div
                  key={o.id}
                  style={{
                    background: 'var(--bg-3)',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>#{o.order_no}</strong>
                      <span className="badge" style={{ fontSize: 10 }}>
                        {ORDER_STATUS_LABELS[o.status] || o.status}
                      </span>
                      {o.payment_status === 'paid' && (
                        <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: 10 }}>
                          مسدد ✔
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                      {o.package_title || o.service_title || o.project_type || 'طلب مخصص'}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {formatDate(o.created_at)} • الميزانية: {money(o.budget || 0)}
                    </div>
                  </div>

                  <a
                    href={`/?track=${o.order_no}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn--sm btn--outline"
                    style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}
                  >
                    تتبع الطلب <ExternalLink size={12} />
                  </a>
                </div>
              ))}

              {(!fullData?.orders || fullData.orders.length === 0) && (
                <div className="empty" style={{ padding: '20px 0' }}>لا توجد طلبات مسجلة لهذا العميل حتى الآن.</div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: Edit Profile Info ─── */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="form-stack">
            <div className="form-field">
              <label className="form-label">الاسم بالكامل</label>
              <input
                className="input"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">رقم الهاتف / الواتساب</label>
              <input
                className="input"
                type="tel"
                required
                dir="ltr"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">البريد الإلكتروني</label>
              <input
                className="input"
                type="email"
                dir="ltr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              disabled={savingProfile}
              style={{ marginTop: 10 }}
            >
              {savingProfile ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
