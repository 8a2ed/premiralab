import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Lightbulb, Copy, Check } from 'lucide-react';
import { api } from '../../lib/api.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { TableSkeleton } from '../ui/Skeleton.js';
import { Modal } from '../ui/Modal.js';

type ResourceName = 'packages' | 'services' | 'portfolio' | 'testimonials';

const RESOURCE_FIELDS: Record<ResourceName, string[]> = {
  packages:     ['title', 'price', 'description', 'features', 'popular'],
  services:     ['title', 'description', 'icon'],
  portfolio:    ['title', 'category', 'description', 'image_url'],
  testimonials: ['name', 'role', 'content', 'rating', 'avatar_url'],
};

const FIELD_LABELS: Record<string, string> = {
  title: 'العنوان', name: 'الاسم', price: 'السعر', description: 'الوصف',
  features: 'المميزات', popular: 'باقة مميزة (1=نعم، 0=لا)', icon: 'الأيقونة',
  category: 'الفئة', image_url: 'رابط الصورة', role: 'الدور/الوظيفة',
  content: 'التقييم/الرأي', rating: 'التقييم (1-5)', avatar_url: 'صورة العميل',
};

const FIELD_TIPS: Record<string, { desc: string; template?: string }> = {
  features: { 
    desc: 'اكتب المميزات بصيغة قائمة نصية JSON لتظهر بشكل صحيح.', 
    template: '[\n  "تصميم هوية كاملة",\n  "دعم فني لمدة شهر",\n  "تعديلات غير محدودة"\n]' 
  },
  icon: {
    desc: 'اسم الأيقونة باللغة الإنجليزية من مكتبة Lucide.',
    template: 'Code\n// أمثلة أخرى: PenTool, Monitor, Image, Layout'
  },
  image_url: {
    desc: 'رابط مباشر للصورة (يجب أن يبدأ بـ http)',
    template: 'https://example.com/image.png'
  }
};

const HIDDEN_FIELDS = new Set(['id', 'created_at', 'updated_at']);

interface CrudProps {
  resource: ResourceName;
  title:    string;
  onToast:  (msg: string, type?: 'success' | 'error') => void;
}

export function Crud({ resource, title, onToast }: CrudProps) {
  const [rows,    setRows]    = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form,    setForm]    = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [copiedTip, setCopiedTip] = useState<string | null>(null);

  const fields = RESOURCE_FIELDS[resource];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.crud(resource).list();
      setRows(data as Record<string, unknown>[]);
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [resource, onToast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    const defaults: Record<string, string> = {};
    fields.forEach(f => {
      if (f === 'popular') defaults[f] = '0';
      else if (f === 'rating') defaults[f] = '5';
      else if (f === 'features') defaults[f] = '[]';
      else defaults[f] = '';
    });
    setForm(defaults);
    setEditing('new');
  };

  const openEdit = (row: Record<string, unknown>) => {
    const f: Record<string, string> = {};
    fields.forEach(field => {
      const v = row[field];
      f[field] = v != null ? (typeof v === 'object' ? JSON.stringify(v) : String(v)) : '';
    });
    setEditing(row.id as number);
    setForm(f);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach(f => {
        const raw = form[f];
        if (f === 'price' || f === 'popular' || f === 'rating') payload[f] = Number(raw);
        else payload[f] = raw;
      });
      if (editing === 'new') {
        await api.admin.crud(resource).create(payload);
      } else {
        await api.admin.crud(resource).update(editing as number, payload);
      }
      setEditing(null);
      await load();
      onToast('تم الحفظ بنجاح', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    try {
      await api.admin.crud(resource).remove(id);
      await load();
      onToast('تم الحذف', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setConfirm(null); }
  };

  const displayValue = (row: Record<string, unknown>, field: string) => {
    const v = row[field];
    if (v == null) return '—';
    if (typeof v === 'boolean') return v ? 'نعم' : 'لا';
    if (Array.isArray(v)) return v.join('، ');
    return String(v);
  };

  return (
    <div className="card">
      <div className="topbar">
        <h3 className="card-title">{title}</h3>
        <button className="btn btn--primary" onClick={openNew}>
          <Plus size={16} /> إضافة
        </button>
      </div>

      {loading ? <TableSkeleton rows={4} cols={3} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>العنوان / الاسم</th>
                <th>التفاصيل</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id as number}>
                  <td><strong>{String(r.title ?? r.name ?? '—')}</strong></td>
                  <td className="muted">{String((r.description ?? r.content ?? r.price ?? '—')).slice(0, 80)}</td>
                  <td className="actions-cell">
                    <button className="btn btn--icon" onClick={() => openEdit(r)} aria-label="تعديل">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn--icon btn--danger" onClick={() => setConfirm(r.id as number)} aria-label="حذف">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="empty">لا يوجد عناصر. أضف أول عنصر!</div>}
        </div>
      )}

      {/* Edit / Create Modal */}
      {editing !== null && (
        <Modal
          title={editing === 'new' ? `إضافة ${title}` : `تعديل ${title}`}
          onClose={() => setEditing(null)}
        >
          <div className="form-stack">
            {fields.map(f => (
              <div key={f} className="form-field" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" htmlFor={`field-${f}`} style={{ margin: 0 }}>
                    {FIELD_LABELS[f] ?? f}
                  </label>
                  {FIELD_TIPS[f] && (
                    <button
                      type="button"
                      className="btn btn--icon btn--sm"
                      style={{ background: activeTip === f ? 'var(--accent-dim)' : 'transparent', color: 'var(--accent)', border: 'none', padding: 4 }}
                      onClick={() => setActiveTip(activeTip === f ? null : f)}
                      title="مساعدة وتوضيح"
                    >
                      <Lightbulb size={16} />
                    </button>
                  )}
                </div>

                {activeTip === f && FIELD_TIPS[f] && (
                  <div className="animation-fade-in" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: FIELD_TIPS[f].template ? 10 : 0 }}>{FIELD_TIPS[f].desc}</div>
                    {FIELD_TIPS[f].template && (
                      <div style={{ position: 'relative' }}>
                        <pre style={{ margin: 0, padding: 10, background: 'var(--bg-3)', borderRadius: 6, fontSize: 12, overflowX: 'auto', border: '1px solid var(--border)', direction: 'ltr', textAlign: 'left' }}>
                          <code>{FIELD_TIPS[f].template}</code>
                        </pre>
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{ position: 'absolute', top: 6, right: 6, padding: '4px 8px', fontSize: 11 }}
                          onClick={() => {
                            setForm(prev => ({ ...prev, [f]: FIELD_TIPS[f].template as string }));
                            setCopiedTip(f);
                            setTimeout(() => setCopiedTip(null), 2000);
                          }}
                        >
                          {copiedTip === f ? <><Check size={12}/> تم الإدراج</> : <><Copy size={12}/> إدراج القالب</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {f === 'description' || f === 'content' || f === 'features' ? (
                  <textarea
                    id={`field-${f}`}
                    className="textarea"
                    rows={f === 'features' ? 5 : 3}
                    style={{ direction: f === 'features' || f === 'image_url' || f === 'icon' ? 'ltr' : undefined, textAlign: f === 'features' || f === 'image_url' || f === 'icon' ? 'left' : undefined, fontFamily: f === 'features' ? 'monospace' : undefined }}
                    value={form[f] ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))}
                  />
                ) : (
                  <input
                    id={`field-${f}`}
                    className="input"
                    type={f === 'price' || f === 'rating' || f === 'popular' ? 'number' : 'text'}
                    style={{ direction: f === 'image_url' || f === 'icon' || f === 'avatar_url' ? 'ltr' : undefined, textAlign: f === 'image_url' || f === 'icon' || f === 'avatar_url' ? 'left' : undefined }}
                    value={form[f] ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            <button className="btn btn--primary" onClick={save} disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm delete */}
      {confirm !== null && (
        <ConfirmDialog
          message="هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء."
          confirmLabel="حذف"
          danger
          onConfirm={() => remove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
