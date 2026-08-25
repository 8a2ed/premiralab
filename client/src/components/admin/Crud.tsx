import { useState, useEffect, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { Plus, Pencil, Trash2, Lightbulb, Copy, Check, Eye, GripVertical } from 'lucide-react';
import { api } from '../../lib/api.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { TableSkeleton } from '../ui/Skeleton.js';
import { Modal } from '../ui/Modal.js';

type ResourceName = 'packages' | 'services' | 'portfolio' | 'testimonials' | 'faqs';

const RESOURCE_FIELDS: Record<ResourceName, string[]> = {
  packages:     ['title', 'price', 'description', 'features', 'popular'],
  services:     ['title', 'description', 'icon'],
  portfolio:    ['title', 'category', 'description', 'image_url', 'sort_order'],
  testimonials: ['name', 'role', 'content', 'rating', 'avatar_url', 'sort_order'],
  faqs:         ['question', 'answer', 'sort_order'],
};

const FIELD_LABELS: Record<string, string> = {
  title: 'العنوان', name: 'الاسم', price: 'السعر', description: 'الوصف', question: 'السؤال', answer: 'الإجابة',
  features: 'المميزات', popular: 'باقة مميزة (1=نعم، 0=لا)', icon: 'الأيقونة',
  category: 'الفئة', image_url: 'رابط الصورة', role: 'الدور/الوظيفة',
  content: 'التقييم/الرأي', rating: 'التقييم (1-5)', avatar_url: 'صورة العميل', sort_order: 'أولوية العرض (رقم)',
};

const FIELD_TIPS: Record<string, { desc: string; template?: string }> = {
  features: { 
    desc: 'اكتب المميزات بصيغة قائمة نصية JSON لتظهر بشكل صحيح.', 
    template: '[\n  "تصميم هوية كاملة",\n  "دعم فني لمدة شهر",\n  "تعديلات غير محدودة"\n]' 
  },
  icon: {
    desc: 'اختر أيقونة من القائمة السريعة أدناه أو اكتب اسم الأيقونة بالإنجليزية.',
    template: 'Monitor'
  },
  sort_order: {
    desc: 'الرقم الأقل يظهر أولًا (مثال: 1 يظهر قبل 2). الأرقام المتساوية تترتب حسب الأحدث.',
    template: '1'
  },
  image_url: {
    desc: 'رابط مباشر للصورة (يجب أن يبدأ بـ http)',
    template: 'https://example.com/image.png'
  }
};

const ICON_CATEGORIES: Array<{
  name: string;
  icons: Array<{ name: string; label: string }>;
}> = [
  {
    name: '🎨 التصميم والهوية',
    icons: [
      { name: 'Palette', label: 'ألوان وهوية' },
      { name: 'PenTool', label: 'رسم ولوجو' },
      { name: 'Brush', label: 'تلوين ورسم' },
      { name: 'Layers', label: 'طبقات وتصميم' },
      { name: 'Sparkles', label: 'لمسات إبداعية' },
      { name: 'Wand2', label: 'تعديلات ذكية' },
      { name: 'Shapes', label: 'أشكال هندسية' },
      { name: 'Crop', label: 'قص وتأطير' },
      { name: 'Feather', label: 'ريشة رسم' },
      { name: 'Image', label: 'صور وبوسترات' },
    ],
  },
  {
    name: '💻 البرمجة والويب',
    icons: [
      { name: 'Monitor', label: 'مواقع ويب' },
      { name: 'Smartphone', label: 'تطبيقات جوال' },
      { name: 'Laptop', label: 'أنظمة وبرامج' },
      { name: 'Globe', label: 'نطاقات ومواقع' },
      { name: 'Code2', label: 'أكواد وحلول' },
      { name: 'AppWindow', label: 'واجهات سحابية' },
      { name: 'Database', label: 'قواعد بيانات' },
      { name: 'Cpu', label: 'أداء وسرعة' },
      { name: 'Server', label: 'سيرفرات واستضافة' },
      { name: 'Terminal', label: 'سطر أوامر' },
    ],
  },
  {
    name: '📢 التسويق والسوشيال',
    icons: [
      { name: 'Megaphone', label: 'حملات إعلانية' },
      { name: 'Rocket', label: 'إطلاق ونمو' },
      { name: 'TrendingUp', label: 'أرباح وSEO' },
      { name: 'Target', label: 'استهداف دقيق' },
      { name: 'Share2', label: 'سوشيال ميديا' },
      { name: 'BarChart3', label: 'تقارير وإحصاء' },
      { name: 'Flame', label: 'تفاعل وترويج' },
      { name: 'Eye', label: 'مشاهدات ووصول' },
      { name: 'Users', label: 'إدارة مجتمعات' },
      { name: 'Send', label: 'نشر وإرسال' },
    ],
  },
  {
    name: '🎬 الميديا والفيديو',
    icons: [
      { name: 'Film', label: 'موشن جرافيك' },
      { name: 'Clapperboard', label: 'مونتاج فيديو' },
      { name: 'Video', label: 'ريلز وتصوير' },
      { name: 'Camera', label: 'تصوير فوتوغرافي' },
      { name: 'Mic', label: 'تعليق صوتي' },
      { name: 'Headphones', label: 'هندسة صوتية' },
      { name: 'PlayCircle', label: 'إعلانات فيديو' },
    ],
  },
  {
    name: '🛍️ المتاجر والمدفوعات',
    icons: [
      { name: 'ShoppingBag', label: 'متجر ومنتجات' },
      { name: 'ShoppingCart', label: 'سلة شراء' },
      { name: 'CreditCard', label: 'دفع إلكتروني' },
      { name: 'Store', label: 'متجر متكامل' },
      { name: 'Package', label: 'باقات وحزم' },
      { name: 'Tag', label: 'عروض وتخفيض' },
      { name: 'Wallet', label: 'محافظ وكاش' },
      { name: 'Receipt', label: 'فواتير وسداد' },
      { name: 'BadgeDollarSign', label: 'أسعار مميزة' },
    ],
  },
  {
    name: '🛡️ الجودة والأمان',
    icons: [
      { name: 'ShieldCheck', label: 'حماية وضمان' },
      { name: 'Award', label: 'جودة معتمدة' },
      { name: 'Zap', label: 'تنفيذ فوري' },
      { name: 'Clock', label: 'مواعيد دقيقة' },
      { name: 'CheckCircle2', label: 'خدمة موثوقة' },
      { name: 'HeartHandshake', label: 'دعم واستشارات' },
    ],
  },
];

function IconPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState(0);

  // Selected Icon Dynamic Renderer
  const SelectedIcon = (LucideIcons as any)[value] || LucideIcons.Palette;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Top Search & Live Preview Box */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: 'rgba(124, 58, 237, 0.15)',
          border: '1.5px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          flexShrink: 0,
          boxShadow: '0 0 14px rgba(124, 58, 237, 0.3)',
        }}>
          <SelectedIcon size={24} />
        </div>

        <input
          className="input"
          type="text"
          placeholder="اكتب اسم أي أيقونة (مثال: Palette, Monitor, Rocket...)"
          dir="ltr"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
        />
      </div>

      {/* Quick Select Section */}
      <div style={{
        background: 'var(--bg-3)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 12,
        marginTop: 4,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
            ⚡ قائمة الاختيار السريع للأيقونات:
          </span>
          <span className="muted" style={{ fontSize: 11 }}>
            اضغط على أي أيقونة لاختيارها فورًا
          </span>
        </div>

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 6,
          marginBottom: 10,
          scrollbarWidth: 'thin',
        }}>
          {ICON_CATEGORIES.map((cat, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveCategory(idx)}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: activeCategory === idx ? 700 : 500,
                background: activeCategory === idx ? 'var(--accent)' : 'var(--bg-2)',
                color: activeCategory === idx ? '#fff' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: activeCategory === idx ? 'var(--accent)' : 'var(--border)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Icon Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
          gap: 8,
          maxHeight: '180px',
          overflowY: 'auto',
          padding: '2px',
        }}>
          {ICON_CATEGORIES[activeCategory].icons.map(item => {
            const IconComp = (LucideIcons as any)[item.name] || LucideIcons.Palette;
            const isSelected = value.toLowerCase() === item.name.toLowerCase();

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => onChange(item.name)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '8px 6px',
                  borderRadius: 8,
                  background: isSelected ? 'rgba(124, 58, 237, 0.2)' : 'var(--bg-2)',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  color: isSelected ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 10px rgba(124, 58, 237, 0.3)' : 'none',
                }}
                title={item.name}
              >
                <IconComp size={20} color={isSelected ? 'var(--accent)' : 'currentColor'} />
                <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 500, textAlign: 'center', lineHeight: 1.2 }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

  // Drag & Drop
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const fields = RESOURCE_FIELDS[resource];
  const supportsSort = fields.includes('sort_order');

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDragOverId(null);
    if (draggedId === null || draggedId === targetId) return;

    const items = [...rows];
    const draggedIndex = items.findIndex(r => r.id === draggedId);
    const targetIndex = items.findIndex(r => r.id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    // Re-assign sort_order based on new visual index
    const reordered = items.map((r, i) => ({ ...r, sort_order: i + 1 }));
    setRows(reordered);

    try {
      await api.admin.crud(resource).reorder(reordered.map(r => ({ id: (r as any).id as number, sort_order: (r as any).sort_order as number })));
      onToast('تم تحديث ترتيب العرض بنجاح', 'success');
    } catch (err) {
      onToast('فشل تحديث الترتيب', 'error');
      load(); // revert
    }
    setDraggedId(null);
  };

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
      else if (f === 'sort_order') defaults[f] = '0';
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

  const getColumnLabels = () => {
    switch (resource) {
      case 'faqs':
        return { primary: 'السؤال', secondary: 'الإجابة' };
      case 'testimonials':
        return { primary: 'اسم العميل', secondary: 'التقييم / الرأي' };
      case 'portfolio':
        return { primary: 'عنوان العمل', secondary: 'التفاصيل / التصنيف' };
      case 'packages':
        return { primary: 'اسم الباقة', secondary: 'السعر والمميزات' };
      case 'services':
        return { primary: 'اسم الخدمة', secondary: 'الوصف' };
      default:
        return { primary: 'العنوان / الاسم', secondary: 'التفاصيل' };
    }
  };

  const colLabels = getColumnLabels();

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
                <th style={{ width: '40%' }}>{colLabels.primary}</th>
                <th style={{ width: '45%' }}>{colLabels.secondary}</th>
                <th style={{ width: '15%', textAlign: 'center' }}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr 
                  key={r.id as number}
                  draggable={supportsSort}
                  onDragStart={(e) => {
                    setDraggedId(r.id as number);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedId && draggedId !== r.id) setDragOverId(r.id as number);
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleDrop(e, r.id as number)}
                  style={{
                    opacity: draggedId === r.id ? 0.5 : 1,
                    background: dragOverId === r.id ? 'var(--accent-dim)' : undefined,
                    transition: 'background 0.2s',
                    cursor: supportsSort ? 'grab' : 'default'
                  }}
                >
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {supportsSort && <GripVertical size={16} className="muted" style={{ cursor: 'grab', flexShrink: 0 }} />}
                    <strong style={{ wordBreak: 'break-word' }}>
                      {String(r.question ?? r.title ?? r.name ?? '—')}
                    </strong>
                  </td>
                  <td className="muted" style={{ wordBreak: 'break-word', fontSize: 13, lineHeight: 1.5 }}>
                    {String(r.answer ?? r.description ?? r.content ?? (r.price != null ? `${r.price}` : '—')).slice(0, 120)}
                    {String(r.answer ?? r.description ?? r.content ?? '').length > 120 ? '...' : ''}
                  </td>
                  <td className="actions-cell" style={{ textAlign: 'center' }}>
                    {Boolean(r.image_url) && (
                      <button className="btn btn--icon" onClick={() => window.open(r.image_url as string, '_blank')} aria-label="معاينة الصورة" title="معاينة الصورة">
                        <Eye size={14} />
                      </button>
                    )}
                    <button className="btn btn--icon" onClick={() => openEdit(r)} aria-label="تعديل" title="تعديل">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn--icon btn--danger" onClick={() => setConfirm(r.id as number)} aria-label="حذف" title="حذف">
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
            {fields.filter(f => f !== 'sort_order').map(f => (
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

                {f === 'icon' ? (
                  <IconPickerField
                    value={form[f] ?? ''}
                    onChange={val => setForm(prev => ({ ...prev, [f]: val }))}
                  />
                ) : f === 'description' || f === 'content' || f === 'features' || f === 'answer' ? (
                  <textarea
                    id={`field-${f}`}
                    className="textarea"
                    rows={f === 'features' ? 5 : (f === 'answer' ? 4 : 3)}
                    style={{ direction: f === 'features' ? 'ltr' : undefined, textAlign: f === 'features' ? 'left' : undefined, fontFamily: f === 'features' ? 'monospace' : undefined }}
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
