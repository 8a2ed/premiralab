import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, Clock, FileText, RefreshCw, XCircle, Plus, Send, CreditCard, Upload, Copy, Check } from 'lucide-react';
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

  // Client revision form state
  const [revOpen,       setRevOpen]       = useState(false);
  const [revTitle,      setRevTitle]      = useState('');
  const [revDesc,       setRevDesc]       = useState('');
  const [submittingRev, setSubmittingRev] = useState(false);
  const [revSuccess,    setRevSuccess]    = useState(false);

  // Payment receipt state
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSuccess,   setReceiptSuccess]   = useState(false);
  const [copiedField,      setCopiedField]      = useState<string | null>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);

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

  const handleSendRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revTitle.trim()) return;
    setSubmittingRev(true);
    try {
      const res = await api.submitRevision(orderNo, { title: revTitle, description: revDesc });
      if (res.ok && res.revision) {
        setData(prev => prev ? {
          ...prev,
          revisions: [res.revision, ...(prev.revisions || [])],
        } : prev);
        setRevTitle('');
        setRevDesc('');
        setRevOpen(false);
        setRevSuccess(true);
        setTimeout(() => setRevSuccess(false), 4000);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmittingRev(false);
    }
  };

  const copyText = (txt: string, field: string) => {
    navigator.clipboard.writeText(txt).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    });
  };

  const handleUploadReceipt = async (file: File) => {
    setUploadingReceipt(true);
    try {
      const res = await api.uploadReceipt(orderNo, file);
      if (res.ok) {
        setData(prev => prev ? {
          ...prev,
          paymentReceipt: res.receiptUrl,
          status: res.status as any,
        } : prev);
        setReceiptSuccess(true);
        setTimeout(() => setReceiptSuccess(false), 5000);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  return (
    <div className="tracker">
      {/* Header */}
      <header className="tracker-head">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn--sm" onClick={onHome}>
            <ArrowLeft size={16} /> ╪º┘ä╪╣┘ê╪»╪⌐ ┘ä┘ä╪▒╪ª┘è╪│┘è╪⌐
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="PREMIRALAB" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
            <strong>┘à╪¬╪º╪¿╪╣╪⌐ ╪º┘ä┘à╪┤╪▒┘ê╪╣</strong>
          </div>
          <button className="btn btn--icon btn--sm" onClick={load} aria-label="╪¬╪¡╪»┘è╪½ ╪º┘ä╪¿┘è╪º┘å╪º╪¬">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      <div className="container tracker-body">
        {loading && <Skeleton height={120} count={3} />}

        {error && (
          <div className="card text-center" style={{ padding: 48 }}>
            <XCircle size={48} className="icon--danger" style={{ margin: '0 auto 16px' }} />
            <h3>╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╖┘ä╪¿</h3>
            <p className="muted">{error}</p>
            <button className="btn btn--primary" onClick={onHome} style={{ marginTop: 20 }}>
              ╪º┘ä╪╣┘ê╪»╪⌐ ┘ä┘ä╪▒╪ª┘è╪│┘è╪⌐
            </button>
          </div>
        )}

        {data && (
          <div className="tracker-grid">
            {/* Order status card */}
            <div className="card">
              <div className="tracker-card__header">
                <div>
                  <div className="muted">╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿</div>
                  <h2>{data.orderNo}</h2>
                </div>
                <span
                  className="badge badge--lg"
                  style={{
                    backgroundColor: `${STATUS_COLOR[data.status] ?? '#888'}22`,
                    color: STATUS_COLOR[data.status] ?? '#888',
                    border: `1px solid ${STATUS_COLOR[data.status] ?? '#888'}44`,
                  }}
                >
                  {ORDER_STATUS_LABELS[data.status] ?? data.status}
                </span>
              </div>
              <div className="tracker-meta-grid">
                <div><div className="muted">╪º┘ä╪«╪»┘à╪⌐</div><strong>{data.packageTitle ?? data.serviceTitle ?? data.projectType ?? 'ΓÇö'}</strong></div>
                {data.budget ? <div><div className="muted">╪º┘ä┘à┘è╪▓╪º┘å┘è╪⌐ ╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è╪⌐</div><strong>{money(data.budget)}</strong></div> : null}
                <div><div className="muted">╪º┘ä┘à┘ê╪╣╪» ╪º┘ä┘å┘ç╪º╪ª┘è</div><strong>{data.deadline ? formatDate(data.deadline) : '╪¡╪│╪¿ ╪º┘ä╪º╪¬┘ü╪º┘é'}</strong></div>
                <div><div className="muted">╪¬╪º╪▒┘è╪« ╪º┘ä╪╖┘ä╪¿</div><strong>{formatDate(data.createdAt)}</strong></div>
              </div>
            </div>

            {/* Payment & Invoice Card */}
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={20} style={{ color: 'var(--accent)' }} />
                  <h3 className="card-title" style={{ margin: 0 }}>╪º┘ä┘à╪│╪¬╪¡┘é╪º╪¬ ┘ê╪│╪»╪º╪» ╪º┘ä╪»┘ü╪╣╪º╪¬</h3>
                </div>
                {data.budget != null && (
                  <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    ╪º┘ä┘à╪¬╪¿┘é┘è: {money(Math.max(0, (data.budget || 0) - (data.paidAmount || 0)))}
                  </span>
                )}
              </div>

              
              {/* Financial summary */}
              <div style={{ background: 'var(--bg-3)', padding: '24px', borderRadius: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, paddingBottom: 20, borderBottom: '1px dashed var(--border)' }}>
                  <div>
                    <span className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>إجمالي الميزانية</span>
                    <strong style={{ fontSize: 24, color: 'var(--text)' }}>{money(data.budget || 0)}</strong>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>المبلغ المدفوع</span>
                    <strong style={{ fontSize: 20, color: 'var(--primary)' }}>{money(data.paidAmount || 0)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>المتبقي للسداد:</span>
                  <strong style={{ fontSize: 18, color: (data.budget || 0) - (data.paidAmount || 0) > 0 ? '#ef4444' : '#10b981' }}>
                    {money(Math.max(0, (data.budget || 0) - (data.paidAmount || 0)))}
                  </strong>
                </div>

                {/* Payment Methods */}
                {data.paymentInfo && (data.paymentInfo.instapayUsername || data.paymentInfo.vodafoneCash || data.paymentInfo.bankDetails) && (
                  <div>
                    <h4 style={{ fontSize: 13, margin: '0 0 12px', color: 'var(--text)' }}>طرق التحويل المتاحة:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      {data.paymentInfo.instapayUsername && (
                        <div style={{ background: 'var(--bg-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--primary-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}>
                          <div>
                            <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>انستاباي (InstaPay)</div>
                            <strong style={{ fontSize: 14, direction: 'ltr', display: 'block', color: '#fff' }}>{data.paymentInfo.instapayUsername}</strong>
                          </div>
                          <button className="btn btn--icon" style={{ background: 'var(--bg-3)' }} onClick={() => copyText(data.paymentInfo!.instapayUsername!, 'insta')} title="نسخ">
                            {copiedField === 'insta' ? <Check size={16} className="icon--success" /> : <Copy size={16} />}
                          </button>
                        </div>
                      )}

                      {data.paymentInfo.vodafoneCash && (
                        <div style={{ background: 'var(--bg-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(230,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}>
                          <div>
                            <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>فودافون كاش ومحافظ كاش</div>
                            <strong style={{ fontSize: 14, direction: 'ltr', display: 'block', color: '#fff' }}>{data.paymentInfo.vodafoneCash}</strong>
                          </div>
                          <button className="btn btn--icon" style={{ background: 'var(--bg-3)' }} onClick={() => copyText(data.paymentInfo!.vodafoneCash!, 'voda')} title="نسخ">
                            {copiedField === 'voda' ? <Check size={16} className="icon--success" /> : <Copy size={16} />}
                          </button>
                        </div>
                      )}
                    </div>

                    {data.paymentInfo.bankDetails && (
                      <div style={{ background: 'var(--bg-2)', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', marginTop: 12 }}>
                        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>التحويل البنكي وحساب الآيبان (IBAN)</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'pre-wrap' }}>{data.paymentInfo.bankDetails}</div>
                      </div>
                    )}

                    {data.paymentInfo.paymentInstructions && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 8, marginTop: 14, fontSize: 12.5, lineHeight: 1.6, borderLeft: '3px solid var(--primary)' }}>
                        <strong style={{ display: 'block', marginBottom: 4 }}>💡 ملاحظة هامة:</strong>
                        <span className="muted">{data.paymentInfo.paymentInstructions}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Receipt Upload */}
              {data.paymentReceipt ? (
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  تم استلام إيصال التحويل بنجاح. سيتم مراجعته وتحديث حالة الطلب.
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <button
                    className="btn btn--primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 8 }}
                    onClick={() => receiptFileRef.current?.click()}
                    disabled={uploadingReceipt}
                  >
                    <Upload size={16} /> {uploadingReceipt ? 'جاري الرفع...' : 'ارفع إيصال التحويل لتأكيد الدفع'}
                  </button>
                </div>
              )}

              </div>

            {/* Project progress */}
            {data.project ? (
              <div className="card">
                <h3 className="card-title">╪¬┘é╪»┘à ╪º┘ä┘à╪┤╪▒┘ê╪╣ ΓÇö {data.project.title}</h3>
                <div className="progress-display">
                  <progress max={100} value={data.project.progress} className="progress-bar progress-bar--lg" />
                  <span className="progress-pct">{data.project.progress}%</span>
                </div>
              </div>
            ) : (
              <div className="card">
                <h3 className="card-title">╪º┘ä┘à╪┤╪▒┘ê╪╣</h3>
                <div className="empty">╪│┘è╪¬┘à ╪Ñ┘å╪┤╪º╪í ┘à╪│╪º╪¡╪⌐ ╪º┘ä┘à╪┤╪▒┘ê╪╣ ┘é╪▒┘è╪¿╪º┘ï ╪¿╪╣╪» ╪º┘ä╪¬┘ê╪º╪╡┘ä ┘à╪╣┘â.</div>
              </div>
            )}

            {/* Files */}
            {data.files.length > 0 && (
              <div className="card">
                <h3 className="card-title">╪º┘ä┘à┘ä┘ü╪º╪¬ ┘ê╪º┘ä╪¬╪│┘ä┘è┘à╪º╪¬ ╪º┘ä┘à╪¬╪º╪¡╪⌐</h3>
                <div className="file-grid">
                  {data.files.map(f => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-tile"
                      aria-label={`╪¬╪¡┘à┘è┘ä ${f.name}`}
                    >
                      <FileText size={24} aria-hidden />
                      <div className="file-tile__name">{f.name}</div>
                      <div className="file-tile__size muted">{formatBytes(f.size)}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Revisions & Direct Feedback */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h3 className="card-title" style={{ margin: 0 }}>╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪¬╪╣╪»┘è┘ä ┘ê╪º┘ä┘à┘ä╪º╪¡╪╕╪º╪¬</h3>
                {data.project && !revOpen && (
                  <button className="btn btn--sm btn--primary" onClick={() => setRevOpen(true)}>
                    <Plus size={14} /> ╪╖┘ä╪¿ ╪¬╪╣╪»┘è┘ä ╪¼╪»┘è╪»
                  </button>
                )}
              </div>

              {revSuccess && (
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  Γ£à ╪¬┘à ╪Ñ╪▒╪│╪º┘ä ╪╖┘ä╪¿ ╪º┘ä╪¬╪╣╪»┘è┘ä ┘ê╪Ñ╪┤╪╣╪º╪▒ ┘ü╪▒┘è┘é ╪º┘ä╪╣┘à┘ä ╪¿┘å╪¼╪º╪¡!
                </div>
              )}

              {revOpen && (
                <form onSubmit={handleSendRevision} style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 16, border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>╪Ñ╪▒╪│╪º┘ä ┘à┘ä╪º╪¡╪╕╪⌐ ╪ú┘ê ╪╖┘ä╪¿ ╪¬╪╣╪»┘è┘ä</h4>
                  <div className="form-stack">
                    <input
                      className="input"
                      required
                      placeholder="╪╣┘å┘ê╪º┘å ╪º┘ä╪¬╪╣╪»┘è┘ä (┘à╪½╪º┘ä: ╪¬╪╣╪»┘è┘ä ╪ú┘ä┘ê╪º┘å ╪º┘ä╪┤╪╣╪º╪▒ ┘ä╪¬┘â┘ê┘å ╪ú╪║┘à┘é)"
                      value={revTitle}
                      onChange={e => setRevTitle(e.target.value)}
                    />
                    <textarea
                      className="textarea"
                      rows={3}
                      placeholder="╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä╪¬╪╣╪»┘è┘ä ╪º┘ä┘à╪╖┘ä┘ê╪¿ ╪¿╪»┘é╪⌐..."
                      value={revDesc}
                      onChange={e => setRevDesc(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn btn--primary btn--sm" disabled={submittingRev}>
                        <Send size={13} /> {submittingRev ? '╪¼╪º╪▒┘ì ╪º┘ä╪Ñ╪▒╪│╪º┘ä...' : '╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪¬╪╣╪»┘è┘ä'}
                      </button>
                      <button type="button" className="btn btn--sm" onClick={() => setRevOpen(false)}>
                        ╪Ñ┘ä╪║╪º╪í
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {data.revisions && data.revisions.length > 0 ? (
                data.revisions.map(r => (
                  <div key={r.id} className="revision-item">
                    <div className="revision-item__head">
                      {REVISION_ICONS[r.status as keyof typeof REVISION_ICONS] ?? <Clock size={16} />}
                      <strong>{r.title}</strong>
                      <span className="muted">{formatDate(r.created_at)}</span>
                    </div>
                    {r.description && <p className="muted" style={{ marginTop: 4 }}>{r.description}</p>}
                  </div>
                ))
              ) : (
                <div className="empty" style={{ padding: '16px 0' }}>┘ä╪º ╪¬┘ê╪¼╪» ╪╖┘ä╪¿╪º╪¬ ╪¬╪╣╪»┘è┘ä ╪¡╪¬┘ë ╪º┘ä╪ó┘å. ┘è┘à┘â┘å┘â ╪Ñ╪╢╪º┘ü╪⌐ ╪ú┘è ┘à┘ä╪º╪¡╪╕╪⌐ ╪ú┘ê ╪¬╪╣╪»┘è┘ä ╪╣┘å╪» ╪¬┘ê┘ü╪▒ ┘å┘à╪º╪░╪¼ ╪º┘ä╪╣┘à┘ä.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
