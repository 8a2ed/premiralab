import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { PromoCode } from '../../types';

interface PromoCodesProps {
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export function PromoCodes({ onToast }: PromoCodesProps) {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PromoCode> | null>(null);

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

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.code || !editing?.discount_value) return;

    try {
      if (editing.id) {
        await api.admin.promo.update(editing.id, editing);
        onToast('تم تحديث الكوبون بنجاح', 'success');
      } else {
        await api.admin.promo.create(editing);
        onToast('تم إضافة الكوبون بنجاح', 'success');
      }
      setEditing(null);
      fetchCodes();
    } catch (err: any) {
      onToast(err.message || 'حدث خطأ', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    try {
      await api.admin.promo.remove(id);
      onToast('تم الحذف بنجاح', 'success');
      fetchCodes();
    } catch (err: any) {
      onToast(err.message || 'فشل الحذف', 'error');
    }
  };

  const toggleActive = async (code: PromoCode) => {
    try {
      await api.admin.promo.update(code.id, { active: code.active ? 0 : 1 });
      fetchCodes();
    } catch (err: any) {
      onToast(err.message, 'error');
    }
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="admin-content" style={{ animation: 'fade-in 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>كوبونات الخصم 🎁</h2>
        <button className="btn btn--primary" onClick={() => setEditing({ discount_type: 'percentage', active: 1 })}>
          + كود جديد
        </button>
      </div>

      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>الخصم</th>
              <th>الاستخدام</th>
              <th>الصلاحية</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>لا توجد كوبونات حاليًا</td>
              </tr>
            ) : (
              codes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.code}</td>
                  <td>{c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value} ج.م`}</td>
                  <td>{c.current_uses} {c.max_uses ? `/ ${c.max_uses}` : ''}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'مستمر'}
                  </td>
                  <td>
                    <button 
                      className={`badge ${c.active ? 'badge--success' : 'badge--error'}`}
                      onClick={() => toggleActive(c)}
                      style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {c.active ? 'نشط' : 'معطل'}
                    </button>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => setEditing(c)}>✏️</button>
                    <button className="btn-icon" style={{ color: 'var(--error)' }} onClick={() => handleDelete(c.id)}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal">
          <div className="modal-content card" style={{ maxWidth: 500 }}>
            <h3>{editing.id ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-field">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>كود الخصم (حساس لحالة الأحرف)</span>
                  <button 
                    type="button" 
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                    onClick={() => {
                      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase() + Math.floor(Math.random() * 1000);
                      setEditing({ ...editing, code: randomCode });
                    }}
                  >
                    ✨ إنشاء عشوائي
                  </button>
                </label>
                <input required className="input" style={{ letterSpacing: 1 }} value={editing.code || ''} onChange={e => setEditing({ ...editing, code: e.target.value.replace(/\s/g, '') })} placeholder="أدخل الكود... (مثال: Promo2026)" />
              </div>
              <div className="grid-2">
                <div className="form-field">
                  <label className="form-label">نوع الخصم</label>
                  <select className="input" value={editing.discount_type} onChange={e => setEditing({ ...editing, discount_type: e.target.value as any })}>
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">قيمة الخصم</label>
                  <input required type="number" step="0.01" min="0" className="input" value={editing.discount_value || ''} onChange={e => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-field">
                  <label className="form-label">الحد الأقصى للاستخدام <span className="muted" style={{ fontWeight: 'normal', fontSize: 11 }}>(اختياري)</span></label>
                  <input type="number" min="1" className="input" value={editing.max_uses || ''} onChange={e => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })} placeholder="لا محدود" />
                </div>
                <div className="form-field">
                  <label className="form-label">تاريخ الانتهاء <span className="muted" style={{ fontWeight: 'normal', fontSize: 11 }}>(اختياري)</span></label>
                  <input type="date" className="input" value={editing.expires_at ? editing.expires_at.split('T')[0] : ''} onChange={e => setEditing({ ...editing, expires_at: e.target.value || null })} />
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-2)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                💡 <b>تلميح:</b> إذا تركت الحد الأقصى أو تاريخ الانتهاء فارغًا، سيبقى الكوبون فعالًا دائمًا حتى تقوم بتعطيله يدويًا.
              </div>

              <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>{editing.id ? 'حفظ التعديلات' : 'إضافة الكوبون'}</button>
                <button type="button" className="btn btn--outline" onClick={() => setEditing(null)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}