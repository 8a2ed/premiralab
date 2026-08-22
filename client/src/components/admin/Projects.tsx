import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, CheckCircle2, XCircle, Clock, Plus } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate, formatBytes } from '../../lib/utils.js';
import type { Project, Revision, Order } from '../../types.js';
import { Skeleton } from '../ui/Skeleton.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';

interface ProjectsProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function Projects({ onToast }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [orderId,  setOrderId]  = useState('');
  const [title,    setTitle]    = useState('');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [revisions, setRevisions] = useState<Record<number, Revision[]>>({});
  const [files,    setFiles]    = useState<Record<number, Array<{ id:number;name:string;url:string;size:number }>>>({});
  const [revTitle, setRevTitle] = useState('');
  const [revDesc,  setRevDesc]  = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, os] = await Promise.all([api.admin.projects(), api.admin.orders({ limit: 200 })]);
      setProjects(ps);
      setOrders(os.rows);
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const loadRevisions = async (pId: number) => {
    const rs = await api.admin.revisions(pId);
    setRevisions(r => ({ ...r, [pId]: rs }));
  };

  const expand = async (pId: number) => {
    if (expanded === pId) { setExpanded(null); return; }
    setExpanded(pId);
    if (!revisions[pId]) await loadRevisions(pId);
  };

  const createProject = async () => {
    if (!orderId || !title.trim()) { onToast('اختر طلباً وأدخل اسم المشروع', 'error'); return; }
    setCreating(true);
    try {
      await api.admin.createProject({ orderId: Number(orderId), title });
      setOrderId(''); setTitle('');
      await load();
      onToast('تم إنشاء المشروع بنجاح', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setCreating(false); }
  };

  const updateProgress = async (pId: number, progress: number) => {
    try { await api.admin.updateProject(pId, { progress }); await load(); }
    catch (e) { onToast((e as Error).message, 'error'); }
  };

  const addRevision = async (pId: number) => {
    if (!revTitle.trim()) { onToast('أدخل عنوان التعديل', 'error'); return; }
    try {
      await api.admin.createRevision({ projectId: pId, title: revTitle, description: revDesc });
      setRevTitle(''); setRevDesc('');
      await loadRevisions(pId);
      onToast('تم إضافة التعديل', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
  };

  const setRevisionStatus = async (pId: number, rId: number, status: 'approved' | 'rejected') => {
    try {
      await api.admin.updateRevision(rId, status);
      await loadRevisions(pId);
      onToast(status === 'approved' ? 'تم اعتماد التعديل' : 'تم رفض التعديل', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
  };

  const uploadFile = async (pId: number, file: File) => {
    try {
      const result = await api.admin.upload(pId, file);
      setFiles(f => ({
        ...f,
        [pId]: [...(f[pId] ?? []), { id: result.id, name: result.originalName, url: result.url, size: result.size }],
      }));
      onToast('تم رفع الملف بنجاح', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
  };

  const revStatusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle2 size={16} className="icon--success" />;
    if (s === 'rejected') return <XCircle      size={16} className="icon--danger" />;
    return <Clock size={16} className="icon--muted" />;
  };

  return (
    <div className="projects-view">
      {/* Create project */}
      <div className="card">
        <h3 className="card-title">إنشاء مساحة مشروع جديد</h3>
        <div className="form-grid">
          <select className="select" value={orderId} onChange={e => setOrderId(e.target.value)} aria-label="اختر الطلب">
            <option value="">اختر الطلب المرتبط</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>{o.order_no} — {o.client_name}</option>
            ))}
          </select>
          <input
            className="input"
            placeholder="اسم المشروع"
            value={title}
            onChange={e => setTitle(e.target.value)}
            aria-label="اسم المشروع"
          />
        </div>
        <button className="btn btn--primary" style={{ marginTop: 12 }} disabled={creating} onClick={createProject}>
          <Plus size={16} /> {creating ? 'جارٍ الإنشاء...' : 'إنشاء المشروع'}
        </button>
      </div>

      {/* Projects list */}
      {loading ? <Skeleton height={80} count={3} /> : (
        <div className="project-list">
          {projects.length === 0 && <div className="empty">لا توجد مشاريع حتى الآن.</div>}
          {projects.map(p => (
            <div key={p.id} className="project-card card">
              <div className="project-card__header" onClick={() => expand(p.id)} role="button" tabIndex={0} aria-expanded={expanded === p.id}>
                <div>
                  <strong>{p.title}</strong>
                  <div className="muted">{p.order_no} — {p.client_name}</div>
                </div>
                <div className="project-card__meta">
                  <span className="muted">{p.progress}%</span>
                </div>
              </div>

              {/* Progress */}
              <div className="progress-wrap">
                <progress max={100} value={p.progress} className="progress-bar" aria-label={`تقدم المشروع ${p.progress}%`} />
                <input
                  type="range" min={0} max={100} value={p.progress}
                  className="progress-slider"
                  onChange={e => updateProgress(p.id, Number(e.target.value))}
                  aria-label="تعديل التقدم"
                />
              </div>

              {/* Expanded detail */}
              {expanded === p.id && (
                <div className="project-card__detail">
                  {/* Revisions */}
                  <h4>التعديلات</h4>
                  {(revisions[p.id] ?? []).map(r => (
                    <div key={r.id} className="revision-item">
                      <div className="revision-item__head">
                        {revStatusIcon(r.status)}
                        <strong>{r.title}</strong>
                        <span className="muted">{formatDate(r.created_at)}</span>
                      </div>
                      {r.description && <p className="muted">{r.description}</p>}
                      {r.status === 'pending' && (
                        <div className="revision-item__actions">
                          <button className="btn btn--success btn--sm" onClick={() => setRevisionStatus(p.id, r.id, 'approved')}>
                            <CheckCircle2 size={14} /> اعتماد
                          </button>
                          <button className="btn btn--danger btn--sm" onClick={() => setRevisionStatus(p.id, r.id, 'rejected')}>
                            <XCircle size={14} /> رفض
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add revision */}
                  <div className="revision-add">
                    <input className="input" placeholder="عنوان التعديل" value={revTitle} onChange={e => setRevTitle(e.target.value)} />
                    <textarea className="textarea" rows={2} placeholder="وصف تفصيلي (اختياري)" value={revDesc} onChange={e => setRevDesc(e.target.value)} />
                    <button className="btn btn--primary btn--sm" onClick={() => addRevision(p.id)}>
                      <Plus size={14} /> إضافة تعديل
                    </button>
                  </div>

                  {/* File upload */}
                  <h4>الملفات</h4>
                  <div className="file-drop" onClick={() => fileRef.current?.click()} role="button" tabIndex={0} aria-label="رفع ملف">
                    <Upload size={20} />
                    <span>اضغط أو اسحب لرفع ملف (PDF, صورة, ZIP — حتى 15 MB)</span>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf,.zip"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(p.id, f); e.target.value = ''; }}
                  />
                  {(files[p.id] ?? []).map(f => (
                    <div key={f.id} className="file-item">
                      <a href={f.url} target="_blank" rel="noopener" className="link">{f.name}</a>
                      <span className="muted">{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
