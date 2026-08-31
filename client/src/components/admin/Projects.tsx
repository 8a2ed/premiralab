import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, CheckCircle2, XCircle, Clock, Plus, Eye, Download, FileText, Trash2, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate, formatBytes, debounce } from '../../lib/utils.js';
import type { Project, Revision, Order } from '../../types.js';
import { Skeleton } from '../ui/Skeleton.js';
import { Modal } from '../ui/Modal.js';

interface ProjectsProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

type FileEntry = { id: number; name: string; url: string; size: number };

export function Projects({ onToast }: ProjectsProps) {
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [orderId,     setOrderId]     = useState('');
  const [title,       setTitle]       = useState('');
  const [creating,    setCreating]    = useState(false);
  const [expanded,    setExpanded]    = useState<number | null>(null);
  const [revisions,   setRevisions]   = useState<Record<number, Revision[]>>({});
  const [files,       setFiles]       = useState<Record<number, FileEntry[]>>({});
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>({});

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
    try {
      const rs = await api.admin.revisions(pId);
      setRevisions(r => ({ ...r, [pId]: rs }));
    } catch (e) { onToast((e as Error).message, 'error'); }
  };

  const loadFiles = async (pId: number) => {
    try {
      const fs = await api.admin.projectFiles(pId);
      setFiles(f => ({
        ...f,
        [pId]: fs.map(x => ({ id: x.id, name: x.originalName, url: x.url, size: x.size })),
      }));
    } catch (e) { onToast((e as Error).message, 'error'); }
  };

  const expand = async (pId: number) => {
    if (expanded === pId) { setExpanded(null); return; }
    setExpanded(pId);
    if (!revisions[pId]) loadRevisions(pId);
    if (!files[pId])     loadFiles(pId);
  };

  const createProject = async () => {
    if (!orderId || !title.trim()) { onToast('اختر طلبًا وأدخل اسم المشروع', 'error'); return; }
    setCreating(true);
    try {
      await api.admin.createProject({ orderId: Number(orderId), title });
      setOrderId(''); setTitle('');
      await load();
      onToast('تم إنشاء المشروع بنجاح', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setCreating(false); }
  };

  const debouncedSaveProgress = useCallback(
    debounce((pId: unknown, progress: unknown) => {
      api.admin.updateProject(pId as number, { progress: progress as number }).catch(e => {
        onToast((e as Error).message, 'error');
      });
    }, 400),
    [onToast],
  );

  const updateProgress = (pId: number, progress: number) => {
    setProjects(prev => prev.map(p => (p.id === pId ? { ...p, progress } : p)));
    debouncedSaveProgress(pId, progress);
  };

  const addRevision = async (pId: number, revTitle: string, revDesc: string, clearForm: () => void) => {
    if (!revTitle.trim()) { onToast('أدخل عنوان التعديل', 'error'); return; }
    try {
      await api.admin.createRevision({ projectId: pId, title: revTitle, description: revDesc });
      clearForm();
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
    if (file.size > 15 * 1024 * 1024) {
      onToast('حجم الملف يتجاوز الحد الأقصى المسموح به (15 ميجابايت)', 'error');
      return;
    }
    setUploadingFiles(prev => ({ ...prev, [pId]: true }));
    try {
      const result = await api.admin.upload(pId, file);
      setFiles(f => ({
        ...f,
        [pId]: [...(f[pId] ?? []), { id: result.id, name: result.originalName, url: result.url, size: result.size }],
      }));
      onToast('تم رفع الملف بنجاح', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setUploadingFiles(prev => ({ ...prev, [pId]: false })); }
  };

  
  const deleteFile = async (pId: number, fId: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف؟')) return;
    try {
      await api.admin.deleteFile(pId, fId);
      setFiles(f => ({ ...f, [pId]: f[pId].filter(file => file.id !== fId) }));
      onToast('تم الحذف بنجاح', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
  };

  const renameFile = async (pId: number, fId: number, newName: string) => {
    try {
      await api.admin.updateFile(pId, fId, newName);
      setFiles(f => ({
        ...f,
        [pId]: f[pId].map(file => file.id === fId ? { ...file, name: newName } : file)
      }));
      onToast('تم تغيير الاسم', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
  };

  const reorderFiles = async (pId: number, direction: 'up' | 'down', index: number) => {
    const arr = [...(files[pId] || [])];
    if (direction === 'up' && index > 0) {
      [arr[index], arr[index - 1]] = [arr[index - 1], arr[index]];
    } else if (direction === 'down' && index < arr.length - 1) {
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    } else { return; }
    
    setFiles(f => ({ ...f, [pId]: arr }));
    try {
      await api.admin.reorderFiles(pId, arr.map(a => a.id));
    } catch (e) { onToast((e as Error).message, 'error'); }
  };

  const revStatusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle2 size={16} className="icon--success" />;
    if (s === 'rejected') return <XCircle      size={16} className="icon--danger" />;
    return <Clock size={16} className="icon--muted" />;
  };

  return (
    <div className="projects-view">
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

              <div className="progress-wrap">
                <progress max={100} value={p.progress} className="progress-bar" aria-label={`تقدم المشروع ${p.progress}%`} />
                <input
                  type="range" min={0} max={100} value={p.progress}
                  className="progress-slider"
                  onChange={e => updateProgress(p.id, Number(e.target.value))}
                  aria-label="تعديل التقدم"
                />
              </div>

              {expanded === p.id && (
                <ProjectDetail
                  revisions={revisions[p.id] ?? []}
                  files={files[p.id] ?? []}
                  revStatusIcon={revStatusIcon}
                  onAddRevision={(rt, rd, clear) => addRevision(p.id, rt, rd, clear)}
                  onSetRevisionStatus={(rId, status) => setRevisionStatus(p.id, rId, status)}
                  onUploadFile={file => uploadFile(p.id, file)}
                  onPreviewFile={file => setPreviewFile(file)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* In-Browser File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

// ─── Per-project detail panel ──────────────────────────────────────────────────

interface ProjectDetailProps {
  revisions:           Revision[];
  files:               FileEntry[];
  revStatusIcon:       (s: string) => React.ReactNode;
  onAddRevision:       (title: string, desc: string, clearForm: () => void) => void;
  onSetRevisionStatus: (rId: number, status: 'approved' | 'rejected') => void;
  onUploadFile:        (file: File) => void;
  onPreviewFile:       (file: FileEntry) => void;
  isUploading?:        boolean;
  onDeleteFile:        (fId: number) => void;
  onRenameFile:        (fId: number, name: string) => void;
  onReorderFile:       (index: number, direction: 'up' | 'down') => void;
}

function ProjectDetail({
  revisions, files, revStatusIcon, onAddRevision, onSetRevisionStatus, onUploadFile, onPreviewFile, isUploading, onDeleteFile, onRenameFile, onReorderFile
}: ProjectDetailProps) {
  const [revTitle, setRevTitle] = useState('');
  const [revDesc,  setRevDesc]  = useState('');
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const clearForm = () => { setRevTitle(''); setRevDesc(''); };

  return (
    <div className="project-card__detail">
      <h4>التعديلات</h4>
      {revisions.map(r => (
        <div key={r.id} className="revision-item">
          <div className="revision-item__head">
            {revStatusIcon(r.status)}
            <strong>{r.title}</strong>
            <span className="muted">{formatDate(r.created_at)}</span>
          </div>
          {r.description && <p className="muted">{r.description}</p>}
          {r.status === 'pending' && (
            <div className="revision-item__actions">
              <button className="btn btn--success btn--sm" onClick={() => onSetRevisionStatus(r.id, 'approved')}>
                <CheckCircle2 size={14} /> اعتماد
              </button>
              <button className="btn btn--danger btn--sm" onClick={() => onSetRevisionStatus(r.id, 'rejected')}>
                <XCircle size={14} /> رفض
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="revision-add">
        <input className="input" placeholder="عنوان التعديل" value={revTitle} onChange={e => setRevTitle(e.target.value)} />
        <textarea className="textarea" rows={2} placeholder="وصف تفصيلي (اختياري)" value={revDesc} onChange={e => setRevDesc(e.target.value)} />
        <button className="btn btn--primary btn--sm" onClick={() => onAddRevision(revTitle, revDesc, clearForm)}>
          <Plus size={14} /> إضافة تعديل
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>الملفات والتسليمات</h4>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{files.length} ملفات</span>
      </div>
      <div 
        className={`file-drop ${isUploading ? 'is-uploading' : ''}`} 
        onClick={() => !isUploading && fileRef.current?.click()} 
        role="button" 
        tabIndex={0} 
        aria-label="رفع ملف"
        style={{
          border: '2px dashed var(--border)',
          background: isUploading ? 'rgba(124, 58, 237, 0.05)' : 'var(--bg-2)',
          padding: '30px 20px',
          borderRadius: 12,
          textAlign: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16
        }}
      >
        {isUploading ? (
          <>
            <div className="spinner" style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>جارٍ الرفع... يرجى الانتظار</span>
          </>
        ) : (
          <>
            <div style={{ background: 'var(--bg-3)', padding: 10, borderRadius: '50%', color: 'var(--text-muted)' }}>
              <Upload size={24} />
            </div>
            <strong style={{ display: 'block', fontSize: 14 }}>اضغط أو اسحب الملف هنا للرفع</strong>
            <span className="muted" style={{ fontSize: 12 }}>يدعم: PDF, JPG, PNG, ZIP (بحد أقصى 15 MB)</span>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.zip"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUploadFile(f); e.target.value = ''; }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {files.map((f, i) => (
          <div key={f.id} className="file-item" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            padding: '12px 16px',
            borderRadius: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary)', padding: 8, borderRadius: 8 }}>
                <FileText size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {editingFileId === f.id ? (
                  <input
                    autoFocus
                    className="input"
                    style={{ padding: '2px 8px', fontSize: 12, height: 24 }}
                    value={editingFileName}
                    onChange={e => setEditingFileName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { onRenameFile(f.id, editingFileName); setEditingFileId(null); }
                      if (e.key === 'Escape') setEditingFileId(null);
                    }}
                    onBlur={() => { onRenameFile(f.id, editingFileName); setEditingFileId(null); }}
                  />
                ) : (
                  <span
                    className="link"
                    onClick={() => onPreviewFile(f)}
                    style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                    role="button"
                    tabIndex={0}
                  >
                    {f.name}
                  </span>
                )}
                <span className="muted" style={{ fontSize: 12 }}>{formatBytes(f.size)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginLeft: 8 }}>
                <button className="btn btn--icon" style={{ padding: 2, height: 'auto', background: 'transparent' }} onClick={() => onReorderFile(i, 'up')} disabled={i === 0}>
                  <ChevronUp size={12} />
                </button>
                <button className="btn btn--icon" style={{ padding: 2, height: 'auto', background: 'transparent' }} onClick={() => onReorderFile(i, 'down')} disabled={i === files.length - 1}>
                  <ChevronDown size={12} />
                </button>
              </div>
              <button
                className="btn btn--icon btn--sm"
                title="إعادة تسمية"
                onClick={() => { setEditingFileId(f.id); setEditingFileName(f.name); }}
              >
                <Edit2 size={14} />
              </button>
              <button
                className="btn btn--icon btn--sm"
                title="حذف"
                onClick={() => onDeleteFile(f.id)}
              >
                <Trash2 size={14} className="icon--danger" />
              </button>
              <button
                className="btn btn--icon btn--sm"
                title="معاينة"
              onClick={() => onPreviewFile(f)}
            >
              <Eye size={14} />
            </button>
            <a
              href={f.url}
              download={f.name}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--icon btn--sm"
              title="تحميل"
            >
              <Download size={14} />
            </a>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

// ─── File Preview Modal ────────────────────────────────────────────────────────

function FilePreviewModal({ file, onClose }: { file: FileEntry; onClose: () => void }) {
  const isImage = /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
  const isPdf = /\.pdf$/i.test(file.name);

  return (
    <Modal title={file.name} onClose={onClose} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="file-preview-wrap">
          {isImage && (
            <img src={file.url} alt={file.name} className="file-preview-img" />
          )}
          {isPdf && (
            <iframe src={file.url} title={file.name} className="file-preview-iframe" />
          )}
          {!isImage && !isPdf && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <FileText size={48} className="icon--muted" style={{ margin: '0 auto 12px' }} />
              <p className="muted">هذا الملف ليس صورة أو مستند PDF للعرض المباشر.</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span className="muted">{formatBytes(file.size)}</span>
          <a
            href={file.url}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary btn--sm"
          >
            <Download size={14} /> تحميل الملف
          </a>
        </div>
      </div>
    </Modal>
  );
}
