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
            <ArrowLeft size={16} /> Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="PREMIRALAB" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
            <strong>Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹</strong>
          </div>
          <button className="btn btn--icon btn--sm" onClick={load} aria-label="ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      <div className="container tracker-body">
        {loading && <Skeleton height={120} count={3} />}

        {error && (
          <div className="card text-center" style={{ padding: 48 }}>
            <XCircle size={48} className="icon--danger" style={{ margin: '0 auto 16px' }} />
            <h3>ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ù„Ø¨</h3>
            <p className="muted">{error}</p>
            <button className="btn btn--primary" onClick={onHome} style={{ marginTop: 20 }}>
              Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
            </button>
          </div>
        )}

        {data && (
          <div className="tracker-grid">
            {/* Order status card */}
            <div className="card">
              <div className="tracker-card__header">
                <div>
                  <div className="muted">Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨</div>
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
                <div><div className="muted">Ø§Ù„Ø®Ø¯Ù…Ø©</div><strong>{data.packageTitle ?? data.serviceTitle ?? data.projectType ?? 'â€”'}</strong></div>
                {data.budget ? <div><div className="muted">Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠØ©</div><strong>{money(data.budget)}</strong></div> : null}
                <div><div className="muted">Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ</div><strong>{data.deadline ? formatDate(data.deadline) : 'Ø­Ø³Ø¨ Ø§Ù„Ø§ØªÙØ§Ù‚'}</strong></div>
                <div><div className="muted">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø·Ù„Ø¨</div><strong>{formatDate(data.createdAt)}</strong></div>
              </div>
            </div>

            {/* Payment & Invoice Card */}
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={20} style={{ color: 'var(--accent)' }} />
                  <h3 className="card-title" style={{ margin: 0 }}>Ø§Ù„Ù…Ø³ØªØ­Ù‚Ø§Øª ÙˆØ³Ø¯Ø§Ø¯ Ø§Ù„Ø¯ÙØ¹Ø§Øª</h3>
                </div>
                {data.budget != null && (
                  <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ: {money(Math.max(0, (data.budget || 0) - (data.paidAmount || 0)))}
                  </span>
                )}
              </div>

                            {/* Premium Invoice UI */}
              <div style={{ background: 'var(--bg-3)', borderRadius: '16px', marginBottom: 24, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                <div style={{ padding: '20px 20px 16px', background: 'linear-gradient(to right, rgba(205, 69, 205, 0.05), transparent)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>فاتورة الدفع</h3>
                      <p className="muted" style={{ margin: 0, fontSize: 13 }}>فاتورة إلكترونية لطلب #{data.orderNo}</p>
                    </div>
                    <CreditCard size={28} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: 'var(--bg-2)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>الإجمالي المطلوب</div>
                      <strong style={{ fontSize: 18, color: '#fff' }}>{data.budget ? money(data.budget) : 'حسب الاتفاق'}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-2)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>المدفوع حتى الآن</div>
                      <strong style={{ fontSize: 18, color: '#10b981' }}>{money(data.paidAmount || 0)}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-2)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>حالة الدفع</div>
                      <strong style={{ fontSize: 14, color: (data.paidAmount || 0) >= (data.budget || 0) && (data.budget || 0) > 0 ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 6, height: 27 }}>
                        {(data.paidAmount || 0) >= (data.budget || 0) && (data.budget || 0) > 0
                          ? <><CheckCircle2 size={16}/> مكتمل</>
                          : (data.paidAmount || 0) > 0
                          ? 'دفعة مقدمة'
                          : 'بانتظار الدفع'}
                      </strong>
                    </div>
                  </div>
                </div>
                
                {/* Dotted separator for invoice */}
                <div style={{ width: '100%', height: 0, borderBottom: '2px dashed var(--border)', position: 'relative' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-1)', position: 'absolute', left: -8, top: -8, borderRight: '1px solid var(--border)' }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-1)', position: 'absolute', right: -8, top: -8, borderLeft: '1px solid var(--border)' }} />
                </div>

                {/* Payment Methods */}
                {data.paymentInfo && (data.paymentInfo.instapayUsername || data.paymentInfo.vodafoneCash || data.paymentInfo.bankDetails) && (
                  <div style={{ padding: '20px' }}>
                    <h4 style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--text)' }}>طرق الدفع المتاحة لإنهاء الفاتورة:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      {data.paymentInfo.instapayUsername && (
                        <div style={{ background: 'var(--bg-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--primary-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}>
                          <div>
                            <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>إنستاباي (InstaPay)</div>
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
                            <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>فودافون كاش ومحافظ مصرية</div>
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
              {receiptSuccess && (
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  âœ… ØªÙ… Ø±ÙØ¹ Ø¥ÙŠØµØ§Ù„ Ø§Ù„Ø³Ø¯Ø§Ø¯ Ø¨Ù†Ø¬Ø§Ø­ ÙˆØ¥Ø´Ø¹Ø§Ø± ÙØ±ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ Ù„ØªØ£ÙƒÙŠØ¯Ù‡!
                </div>
              )}

              {data.paymentReceipt ? (
                <div style={{ background: 'var(--bg-3)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={20} className="icon--success" />
                    <div>
                      <strong style={{ fontSize: 13 }}>ØªÙ… Ø¥Ø±ÙØ§Ù‚ Ø¥ÙŠØµØ§Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„</strong>
                      <div className="muted" style={{ fontSize: 11 }}>Ø³ÙŠÙ‚ÙˆÙ… ÙØ±ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ Ø¨Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø¥ÙŠØµØ§Ù„ ÙˆØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¯ÙØ¹Ø©</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={data.paymentReceipt} target="_blank" rel="noopener noreferrer" className="btn btn--sm">
                      Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ø¥ÙŠØµØ§Ù„
                    </a>
                    <button className="btn btn--sm" onClick={() => receiptFileRef.current?.click()} disabled={uploadingReceipt}>
                      ØªØ¹Ø¯ÙŠÙ„ / Ø±ÙØ¹ Ø¬Ø¯ÙŠØ¯
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    className="btn btn--primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 8 }}
                    onClick={() => receiptFileRef.current?.click()}
                    disabled={uploadingReceipt}
                  >
                    <Upload size={16} /> {uploadingReceipt ? 'Ø¬Ø§Ø±Ù Ø±ÙØ¹ Ø§Ù„Ø¥ÙŠØµØ§Ù„...' : 'Ø¥Ø±ÙØ§Ù‚ Ø¥ÙŠØµØ§Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„ Ø£Ùˆ Ø§Ù„Ø³ÙƒØ±ÙŠÙ† Ø´ÙˆØª'}
                  </button>
                </div>
              )}

              <input
                ref={receiptFileRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadReceipt(f); e.target.value = ''; }}
              />
            </div>

            {/* Project progress */}
            {data.project ? (
              <div className="card">
                <h3 className="card-title">ØªÙ‚Ø¯Ù… Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ â€” {data.project.title}</h3>
                <div className="progress-display">
                  <progress max={100} value={data.project.progress} className="progress-bar progress-bar--lg" />
                  <span className="progress-pct">{data.project.progress}%</span>
                </div>
              </div>
            ) : (
              <div className="card">
                <h3 className="card-title">Ø§Ù„Ù…Ø´Ø±ÙˆØ¹</h3>
                <div className="empty">Ø³ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø³Ø§Ø­Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ Ù‚Ø±ÙŠØ¨Ø§Ù‹ Ø¨Ø¹Ø¯ Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹Ùƒ.</div>
              </div>
            )}

            {/* Files */}
            {data.files.length > 0 && (
              <div className="card">
                <h3 className="card-title">Ø§Ù„Ù…Ù„ÙØ§Øª ÙˆØ§Ù„ØªØ³Ù„ÙŠÙ…Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø©</h3>
                <div className="file-grid">
                  {data.files.map(f => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-tile"
                      aria-label={`ØªØ­Ù…ÙŠÙ„ ${f.name}`}
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
                <h3 className="card-title" style={{ margin: 0 }}>Ø·Ù„Ø¨Ø§Øª Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ ÙˆØ§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª</h3>
                {data.project && !revOpen && (
                  <button className="btn btn--sm btn--primary" onClick={() => setRevOpen(true)}>
                    <Plus size={14} /> Ø·Ù„Ø¨ ØªØ¹Ø¯ÙŠÙ„ Ø¬Ø¯ÙŠØ¯
                  </button>
                )}
              </div>

              {revSuccess && (
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  âœ… ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ ÙˆØ¥Ø´Ø¹Ø§Ø± ÙØ±ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ Ø¨Ù†Ø¬Ø§Ø­!
                </div>
              )}

              {revOpen && (
                <form onSubmit={handleSendRevision} style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 16, border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Ø¥Ø±Ø³Ø§Ù„ Ù…Ù„Ø§Ø­Ø¸Ø© Ø£Ùˆ Ø·Ù„Ø¨ ØªØ¹Ø¯ÙŠÙ„</h4>
                  <div className="form-stack">
                    <input
                      className="input"
                      required
                      placeholder="Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ (Ù…Ø«Ø§Ù„: ØªØ¹Ø¯ÙŠÙ„ Ø£Ù„ÙˆØ§Ù† Ø§Ù„Ø´Ø¹Ø§Ø± Ù„ØªÙƒÙˆÙ† Ø£ØºÙ…Ù‚)"
                      value={revTitle}
                      onChange={e => setRevTitle(e.target.value)}
                    />
                    <textarea
                      className="textarea"
                      rows={3}
                      placeholder="ØªÙØ§ØµÙŠÙ„ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ø¨Ø¯Ù‚Ø©..."
                      value={revDesc}
                      onChange={e => setRevDesc(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn btn--primary btn--sm" disabled={submittingRev}>
                        <Send size={13} /> {submittingRev ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø¥Ø±Ø³Ø§Ù„...' : 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„'}
                      </button>
                      <button type="button" className="btn btn--sm" onClick={() => setRevOpen(false)}>
                        Ø¥Ù„ØºØ§Ø¡
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
                <div className="empty" style={{ padding: '16px 0' }}>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ØªØ¹Ø¯ÙŠÙ„ Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†. ÙŠÙ…ÙƒÙ†Ùƒ Ø¥Ø¶Ø§ÙØ© Ø£ÙŠ Ù…Ù„Ø§Ø­Ø¸Ø© Ø£Ùˆ ØªØ¹Ø¯ÙŠÙ„ Ø¹Ù†Ø¯ ØªÙˆÙØ± Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ø¹Ù…Ù„.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
