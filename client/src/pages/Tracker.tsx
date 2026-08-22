import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Clock, FileText, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { money, formatDate, formatBytes } from '../lib/utils.js';
import { ORDER_STATUS_LABELS } from '../types.js';
import type { TrackerData } from '../types.js';
import { Skeleton } from '../components/ui/Skeleton.js';

interface TrackerProps {
  orderNo: string;
  onHome:  () => void;
}

const STATUS_COLOR: Record<string, string> = {
  new: '#888', contacted: '#7c7cf0', approved: '#22c55e',
  payment_pending: '#f59e0b', paid: '#10b981', in_progress: '#cd45cd',
  review: '#7c7cf0', revisions: '#f97316', completed: '#22c55e', cancelled: '#ef4444',
};

const REVISION_ICONS = {
  approved: <CheckCircle2 size={16} className="icon--success" />,
  rejected: <XCircle      size={16} className="icon--danger" />,
  pending:  <Clock        size={16} className="icon--muted" />,
};

export function Tracker({ orderNo, onHome }: TrackerProps) {
  const [data,    setData]    = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.track(orderNo);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [orderNo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tracker">
      {/* Header */}
      <div className="tracker-header">
        <div className="container tracker-header-inner">
          <button className="btn btn--ghost" onClick={onHome} aria-label="العودة للصفحة الرئيسية">
            <ArrowLeft size={16} /> الرئيسية
          </button>
          <div className="brand"><b>تتبع طلبك</b></div>
          <button className="btn btn--icon" onClick={load} aria-label="تحديث">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="container tracker-body">
        {loading && (
          <div style={{ maxWidth: 600, margin: '40px auto' }}>
            <Skeleton height={40} width="60%" radius={12} />
            <Skeleton height={20} count={4} gap={12} />
          </div>
        )}

        {error && !loading && (
          <div className="tracker-error">
            <XCircle size={48} className="icon--danger" />
            <h2>الطلب غير موجود</h2>
            <p>{error}</p>
            <p className="muted">رقم الطلب الذي بحثت عنه: <strong>{orderNo}</strong></p>
            <button className="btn btn--primary" onClick={onHome}>العودة للصفحة الرئيسية</button>
          </div>
        )}

        {data && !loading && (
          <div className="tracker-content">
            {/* Order overview */}
            <div className="card tracker-overview">
              <div className="tracker-overview__id">
                <code className="order-no">{data.orderNo}</code>
                <span
                  className="tracker-status-badge"
                  style={{ background: `${STATUS_COLOR[data.status]}22`, color: STATUS_COLOR[data.status] }}
                >
                  {ORDER_STATUS_LABELS[data.status] ?? data.status}
                </span>
              </div>
              <div className="tracker-meta-grid">
                <div><div className="muted">الخدمة</div><strong>{data.packageTitle ?? data.serviceTitle ?? data.projectType ?? '—'}</strong></div>
                <div><div className="muted">الميزانية</div><strong>{data.budget ? money(data.budget) : '—'}</strong></div>
                <div><div className="muted">الموعد النهائي</div><strong>{data.deadline ? formatDate(data.deadline) : '—'}</strong></div>
                <div><div className="muted">تاريخ الطلب</div><strong>{formatDate(data.createdAt)}</strong></div>
              </div>
            </div>

            {/* Project progress */}
            {data.project ? (
              <div className="card">
                <h3 className="card-title">تقدم المشروع — {data.project.title}</h3>
                <div className="progress-display">
                  <progress max={100} value={data.project.progress} className="progress-bar progress-bar--lg" />
                  <span className="progress-pct">{data.project.progress}%</span>
                </div>
              </div>
            ) : (
              <div className="card">
                <h3 className="card-title">المشروع</h3>
                <div className="empty">سيتم إنشاء مساحة المشروع قريباً بعد التواصل معك.</div>
              </div>
            )}

            {/* Files */}
            {data.files.length > 0 && (
              <div className="card">
                <h3 className="card-title">الملفات المتاحة</h3>
                <div className="file-grid">
                  {data.files.map(f => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-tile"
                      aria-label={`تحميل ${f.name}`}
                    >
                      <FileText size={24} aria-hidden />
                      <div className="file-tile__name">{f.name}</div>
                      <div className="file-tile__size muted">{formatBytes(f.size)}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Revisions */}
            {data.revisions.length > 0 && (
              <div className="card">
                <h3 className="card-title">طلبات التعديل</h3>
                {data.revisions.map(r => (
                  <div key={r.id} className="revision-item">
                    <div className="revision-item__head">
                      {REVISION_ICONS[r.status as keyof typeof REVISION_ICONS] ?? <Clock size={16} />}
                      <strong>{r.title}</strong>
                      <span className="muted">{formatDate(r.created_at)}</span>
                    </div>
                    {r.description && <p className="muted">{r.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
