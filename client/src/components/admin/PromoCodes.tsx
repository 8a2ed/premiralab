import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Tag, Percent, DollarSign, Trash2, Pencil, Copy, Check,
  Zap, Calendar, Users, ToggleLeft, ToggleRight, X, RefreshCw,
  TrendingUp, ShieldCheck, Clock, Gift, AlertTriangle
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { Modal } from '../ui/Modal.js';
import type { PromoCode } from '../../types.js';

interface PromoCodesProps {
  onToast: (msg: string, type: 'success' | 'error') => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function generateCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits  = '23456789';
  const part1 = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  return `${part1}-${part2}`;
}

function isExpired(expires_at: string | null): boolean {
  if (!expires_at) return false;
  return new Date(expires_at) < new Date();
}

function isExhausted(c: PromoCode): boolean {
  return c.max_uses != null && c.current_uses >= c.max_uses;
}

function getCodeStatus(c: PromoCode): 'active' | 'inactive' | 'expired' | 'exhausted' {
  if (!c.active) return 'inactive';
  if (isExpired(c.expires_at)) return 'expired';
  if (isExhausted(c)) return 'exhausted';
  return 'active';
}

const STATUS_CONFIG = {
  active:    { label: 'نشط',       color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <ShieldCheck size={11} /> },
  inactive:  { label: 'معطل',      color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: <ToggleLeft size={11} /> },
  expired:   { label: 'منتهي',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <Clock size={11} /> },
  exhausted: { label: 'مستنفد',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <AlertTriangle size={11} /> },
};

// ── Main Component ───────────────────────────────────────────────────────────
export function PromoCodes({ onToast }: PromoCodesProps) {
  const [codes,    setCodes]    = useState<PromoCode[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editing,  setEditing]  = useState<Partial<PromoCode> | null>(null);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [formErr,  setFormErr]  = useState('');

  const fetchCodes = async () => {
    try {
      const data = await api.admin.promo.list();
      setCodes(data);
    } catch (err: any) {
      onToast(err.message || 'فشل تحميل الكوبونات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCodes(); }, []);

  // ── Computed Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active    = codes.filter(c => getCodeStatus(c) === 'active').length;
    const totalUses = codes.reduce((sum, c) => sum + (c.current_uses || 0), 0);
    const expired   = codes.filter(c => isExpired(c.expires_at)).length;
    const expiringSoon = codes.filter(c => {
      if (!c.expires_at || !c.active) return false;
      const diff = new Date(c.expires_at).getTime() - Date.now();
      return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // 3 days
    }).length;
    return { total: codes.length, active, totalUses, expired, expiringSoon };
  }, [codes]);

  // ── Filtered Codes ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = codes;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(q));
    }
    if (filter !== 'all') {
      list = list.filter(c => {
        const s = getCodeStatus(c);
        if (filter === 'active')   return s === 'active';
        if (filter === 'inactive') return s === 'inactive' || s === 'exhausted';
        if (filter === 'expired')  return s === 'expired';
        return true;
      });
    }
    return list;
  }, [codes, search, filter]);

  // ── Copy Code ─────────────────────────────────────────────────────────────
  const copyCode = (code: PromoCode) => {
    navigator.clipboard.writeText(code.code).then(() => {
      setCopiedId(code.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  // ── Toggle Active ─────────────────────────────────────────────────────────
  const toggleActive = async (code: PromoCode) => {
    const newActive = code.active ? 0 : 1;
    setCodes(prev => prev.map(c => c.id === code.id ? { ...c, active: newActive } : c));
    try {
      await api.admin.promo.update(code.id, { active: newActive });
      onToast(newActive ? 'تم تفعيل الكوبون' : 'تم تعطيل الكوبون', 'success');
    } catch (err: any) {
      setCodes(prev => prev.map(c => c.id === code.id ? { ...c, active: code.active } : c));
      onToast(err.message || 'فشل التحديث', 'error');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.admin.promo.remove(id);
      setCodes(prev => prev.filter(c => c.id !== id));
      onToast('تم حذف الكوبون', 'success');
    } catch (err: any) {
      onToast(err.message || 'فشل الحذف', 'error');
    } finally {
      setDeleting(null);
    }
  };

  // ── Save (Create / Update) ────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    if (!editing?.code?.trim()) { setFormErr('كود الخصم مطلوب'); return; }
    if (!editing.discount_value || editing.discount_value <= 0) { setFormErr('قيمة الخصم يجب أن تكون أكبر من صفر'); return; }
    if (editing.discount_type === 'percentage' && editing.discount_value > 100) { setFormErr('نسبة الخصم لا يمكن أن تتجاوز 100%'); return; }

    setSaving(true);
    try {
      const payload = {
        ...editing,
        code: editing.code.trim().toUpperCase().replace(/\s+/g, ''),
      };
      if (editing.id) {
        const updated = await api.admin.promo.update(editing.id, payload);
        setCodes(prev => prev.map(c => c.id === editing.id ? { ...c, ...updated } : c));
        onToast('تم تحديث الكوبون بنجاح', 'success');
      } else {
        const created = await api.admin.promo.create(payload);
        setCodes(prev => [created, ...prev]);
        onToast('تم إضافة الكوبون بنجاح ✅', 'success');
      }
      setEditing(null);
    } catch (err: any) {
      setFormErr(err.message || 'حدث خطأ، تأكد من عدم تكرار الكود');
    } finally {
      setSaving(false);
    }
  };

  const openNew = () => setEditing({ discount_type: 'percentage', discount_value: 10, active: 1, code: generateCode() });
  const openEdit = (c: PromoCode) => setEditing({ ...c });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-content">

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 22 }}>
            <Gift size={22} style={{ color: 'var(--accent)' }} />
            كوبونات الخصم
          </h2>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            أنشئ وأدر كوبونات الخصم لعملائك
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={() => { setLoading(true); fetchCodes(); }} title="تحديث">
            <RefreshCw size={15} />
          </button>
          <button className="btn btn--primary" onClick={openNew} style={{ gap: 8, display: 'flex', alignItems: 'center' }}>
            <Plus size={16} /> كوبون جديد
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الكوبونات', value: stats.total,     icon: <Tag size={16} />,        color: 'var(--accent)' },
          { label: 'كوبونات نشطة',     value: stats.active,    icon: <ShieldCheck size={16} />, color: '#10b981' },
          { label: 'إجمالي الاستخدام', value: stats.totalUses, icon: <TrendingUp size={16} />,  color: '#3b82f6' },
          { label: 'تنتهي قريباً',     value: stats.expiringSoon, icon: <Clock size={16} />,   color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: s.color, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="بحث بالكود..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        {(['all', 'active', 'inactive', 'expired'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn ${filter === f ? 'btn--primary' : 'btn--outline'}`}
            style={{ fontSize: 13, padding: '8px 14px' }}
          >
            {{ all: 'الكل', active: 'نشط', inactive: 'معطل', expired: 'منتهي' }[f]}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
          <p>جاري التحميل...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <Gift size={40} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
          <p className="muted">{search ? 'لا توجد نتائج للبحث' : 'لا توجد كوبونات بعد'}</p>
          {!search && <button className="btn btn--primary" onClick={openNew} style={{ marginTop: 12 }}>إنشاء أول كوبون</button>}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>نوع الخصم</th>
                  <th>قيمة الخصم</th>
                  <th>الاستخدام</th>
                  <th>الانتهاء</th>
                  <th>الحالة</th>
                  <th style={{ width: 120 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const status = getCodeStatus(c);
                  const sc = STATUS_CONFIG[status];
                  const usesPct = c.max_uses ? Math.min(100, Math.round((c.current_uses / c.max_uses) * 100)) : null;
                  return (
                    <tr key={c.id} style={{ opacity: status === 'expired' || status === 'exhausted' ? 0.65 : 1 }}>

                      {/* Code */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: 15,
                            letterSpacing: 1,
                            color: 'var(--accent)',
                            background: 'var(--accent-dim)',
                            padding: '3px 10px',
                            borderRadius: 6,
                          }}>
                            {c.code}
                          </span>
                          <button
                            className="btn btn--icon"
                            style={{ width: 28, height: 28, padding: 0 }}
                            onClick={() => copyCode(c)}
                            title="نسخ الكود"
                          >
                            {copiedId === c.id ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          {c.discount_type === 'percentage'
                            ? <><Percent size={13} style={{ color: '#3b82f6' }} /> نسبة مئوية</>
                            : <><DollarSign size={13} style={{ color: '#10b981' }} /> مبلغ ثابت</>
                          }
                        </div>
                      </td>

                      {/* Value */}
                      <td>
                        <strong style={{ fontSize: 16, color: 'var(--text)' }}>
                          {c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value} ج.م`}
                        </strong>
                      </td>

                      {/* Usage */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                            <Users size={12} />
                            <span>{c.current_uses}</span>
                            {c.max_uses && <span className="muted">/ {c.max_uses}</span>}
                            {!c.max_uses && <span className="muted">مرة</span>}
                          </div>
                          {usesPct !== null && (
                            <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, width: 80 }}>
                              <div style={{
                                height: '100%',
                                width: `${usesPct}%`,
                                background: usesPct >= 90 ? '#ef4444' : usesPct >= 60 ? '#f59e0b' : '#10b981',
                                borderRadius: 999,
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Expiry */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                          {c.expires_at ? (
                            <>
                              <Calendar size={12} style={{ color: isExpired(c.expires_at) ? '#ef4444' : 'var(--text-muted)' }} />
                              <span style={{ color: isExpired(c.expires_at) ? '#ef4444' : 'var(--text)' }} dir="ltr">
                                {new Date(c.expires_at).toLocaleDateString('ar-EG')}
                              </span>
                            </>
                          ) : (
                            <span className="muted">بلا انتهاء</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                          color: sc.color, background: sc.bg,
                        }}>
                          {sc.icon}{sc.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            className="btn btn--icon"
                            onClick={() => toggleActive(c)}
                            title={c.active ? 'تعطيل' : 'تفعيل'}
                            style={{ color: c.active ? '#10b981' : 'var(--text-muted)', width: 32, height: 32 }}
                          >
                            {c.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            className="btn btn--icon"
                            onClick={() => openEdit(c)}
                            title="تعديل"
                            style={{ width: 32, height: 32 }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn--icon"
                            onClick={() => handleDelete(c.id)}
                            disabled={deleting === c.id}
                            title="حذف"
                            style={{ color: '#ef4444', width: 32, height: 32 }}
                          >
                            {deleting === c.id
                              ? <RefreshCw size={13} style={{ animation: 'spin 0.7s linear infinite' }} />
                              : <Trash2 size={14} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {editing && (
        <Modal
          title={editing.id ? `تعديل: ${editing.code}` : 'إضافة كوبون جديد'}
          onClose={() => { setEditing(null); setFormErr(''); }}
          size="sm"
        >
          <form onSubmit={handleSave} className="form-stack">

            {/* Form Error */}
            {formErr && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <AlertTriangle size={14} /> {formErr}
              </div>
            )}

            {/* Code Field */}
            <div className="form-field">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Tag size={13} /> كود الخصم</span>
                <button
                  type="button"
                  onClick={() => setEditing(prev => prev ? { ...prev, code: generateCode() } : prev)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Zap size={12} /> توليد عشوائي
                </button>
              </label>
              <input
                required
                className="input"
                value={editing.code || ''}
                onChange={e => setEditing(prev => prev ? { ...prev, code: e.target.value.replace(/\s/g, '').toUpperCase() } : prev)}
                placeholder="PROMO-2026"
                style={{ fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700, fontSize: 16, textAlign: 'center' }}
              />
            </div>

            {/* Type + Value */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-field">
                <label className="form-label">نوع الخصم</label>
                <select
                  className="input"
                  value={editing.discount_type || 'percentage'}
                  onChange={e => setEditing(prev => prev ? { ...prev, discount_type: e.target.value as any } : prev)}
                >
                  <option value="percentage">نسبة مئوية %</option>
                  <option value="fixed">مبلغ ثابت (ج.م)</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">
                  قيمة الخصم
                  {editing.discount_type === 'percentage' && editing.discount_value
                    ? <span className="muted" style={{ fontWeight: 400, marginRight: 4, fontSize: 11 }}>({editing.discount_value}%)</span>
                    : null
                  }
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={editing.discount_type === 'percentage' ? 100 : undefined}
                  className="input"
                  value={editing.discount_value || ''}
                  onChange={e => setEditing(prev => prev ? { ...prev, discount_value: Number(e.target.value) } : prev)}
                  placeholder={editing.discount_type === 'percentage' ? '0 - 100' : 'بالجنيه'}
                />
              </div>
            </div>

            {/* Max Uses + Expiry */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-field">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={12} /> الحد الأقصى <span className="muted" style={{ fontWeight: 400 }}>(اختياري)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={editing.max_uses || ''}
                  onChange={e => setEditing(prev => prev ? { ...prev, max_uses: e.target.value ? Number(e.target.value) : null } : prev)}
                  placeholder="لا محدود"
                />
              </div>
              <div className="form-field">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={12} /> تاريخ الانتهاء <span className="muted" style={{ fontWeight: 400 }}>(اختياري)</span>
                </label>
                <input
                  type="date"
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                  value={editing.expires_at ? editing.expires_at.split('T')[0] : ''}
                  onChange={e => setEditing(prev => prev ? { ...prev, expires_at: e.target.value || null } : prev)}
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} style={{ color: editing.active ? '#10b981' : 'var(--text-muted)' }} />
                الكوبون {editing.active ? 'نشط' : 'معطل'}
              </span>
              <button
                type="button"
                onClick={() => setEditing(prev => prev ? { ...prev, active: prev.active ? 0 : 1 } : prev)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: editing.active ? '#10b981' : 'var(--text-muted)', padding: 0 }}
              >
                {editing.active ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
              </button>
            </div>

            {/* Tip */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 8, lineHeight: 1.6 }}>
              💡 اتركِ "الحد الأقصى" أو "تاريخ الانتهاء" فارغاً لجعل الكوبون سارياً إلى أجل غير مسمى.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={saving}>
                {saving
                  ? <><RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> جاري الحفظ...</>
                  : editing.id ? 'حفظ التعديلات' : 'إضافة الكوبون'
                }
              </button>
              <button type="button" className="btn" onClick={() => { setEditing(null); setFormErr(''); }} disabled={saving}>
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
