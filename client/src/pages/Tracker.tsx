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
            <ArrowLeft size={16} /> العودة للرئيسية
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="PREMIRALAB" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
            <strong>متابعة المشروع</strong>
          </div>
          <button className="btn btn--icon btn--sm" onClick={load} aria-label="تحديث البيانات">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      <div className="container tracker-body">
        {loading && <Skeleton height={120} count={3} />}

        {error && (
          <div className="card text-center" style={{ padding: 48 }}>
            <XCircle size={48} className="icon--danger" style={{ margin: '0 auto 16px' }} />
            <h3>تعذر تحميل بيانات الطلب</h3>
            <p className="muted">{error}</p>
            <button className="btn btn--primary" onClick={onHome} style={{ marginTop: 20 }}>
              العودة للرئيسية
            </button>
          </div>
        )}

        {data && (
          <div className="tracker-grid">
            {/* Order status card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                <div>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>رقم الطلب</div>
                  <h2 style={{ fontSize: 24, margin: 0, letterSpacing: 1 }}>{data.orderNo}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    className="badge badge--lg"
                    style={{
                      backgroundColor: `${STATUS_COLOR[data.status] ?? '#888'}22`,
                      color: STATUS_COLOR[data.status] ?? '#888',
                      border: `1px solid ${STATUS_COLOR[data.status] ?? '#888'}44`,
                      fontSize: 14,
                      padding: '8px 16px'
                    }}
                  >
                    {ORDER_STATUS_LABELS[data.status] ?? data.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20, background: 'var(--bg-3)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>الخدمة / المشروع</div>
                  <strong style={{ fontSize: 15 }}>{data.packageTitle ?? data.serviceTitle ?? data.projectType ?? '—'}</strong>
                </div>
                {data.budget ? (
                  <div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>الميزانية الإجمالية</div>
                    <strong style={{ fontSize: 15 }}>{money(data.budget)}</strong>
                  </div>
                ) : null}
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>الموعد النهائي</div>
                  <strong style={{ fontSize: 15 }}>{data.deadline ? formatDate(data.deadline) : 'حسب الاتفاق'}</strong>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>تاريخ الطلب</div>
                  <strong style={{ fontSize: 15 }}>{formatDate(data.createdAt)}</strong>
                </div>
              </div>
            </div>

            {/* Payment & Invoice Card */}
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={20} style={{ color: 'var(--accent)' }} />
                  <h3 className="card-title" style={{ margin: 0 }}>المستحقات وسداد الدفعات</h3>
                </div>
                {data.budget != null && (
                  <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    المتبقي: {money(Math.max(0, (data.budget || 0) - (data.paidAmount || 0)))}
                  </span>
                )}
              </div>

              {/* Financial summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, background: 'var(--bg-3)', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid var(--border)' }}>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>المبلغ المطلوب</div>
                  <strong style={{ fontSize: 16 }}>{data.budget ? money(data.budget) : 'حسب الاتفاق'}</strong>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>المبلغ المسدد</div>
                  <strong style={{ fontSize: 16, color: '#10b981' }}>{money(data.paidAmount || 0)}</strong>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>حالة السداد</div>
                  <strong style={{ fontSize: 13, color: (data.paidAmount || 0) >= (data.budget || 0) && (data.budget || 0) > 0 ? '#10b981' : '#f59e0b' }}>
                    {(data.paidAmount || 0) >= (data.budget || 0) && (data.budget || 0) > 0
                      ? '✅ تم السداد بالكامل'
                      : (data.paidAmount || 0) > 0
                      ? '⚠️ تم سداد دفعة مقدمة'
                      : '⏳ بانتظار السداد'}
                  </strong>
                </div>
              </div>

              {/* Payment Methods */}
              {data.paymentInfo && (data.paymentInfo.instapayUsername || data.paymentInfo.vodafoneCash || data.paymentInfo.bankDetails) && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, margin: '0 0 10px', color: 'var(--text)' }}>طرق التحويل المتاحة:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    {data.paymentInfo.instapayUsername && (
                      <div style={{ background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div className="muted" style={{ fontSize: 11 }}>انستاباي (InstaPay)</div>
                          <strong style={{ fontSize: 13, direction: 'ltr', display: 'block' }}>{data.paymentInfo.instapayUsername}</strong>
                        </div>
                        <button className="btn btn--icon btn--sm" onClick={() => copyText(data.paymentInfo!.instapayUsername!, 'insta')} title="نسخ">
                          {copiedField === 'insta' ? <Check size={14} className="icon--success" /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}

                    {data.paymentInfo.vodafoneCash && (
                      <div style={{ background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div className="muted" style={{ fontSize: 11 }}>فودافون كاش ومحافظ كاش</div>
                          <strong style={{ fontSize: 13, direction: 'ltr', display: 'block' }}>{data.paymentInfo.vodafoneCash}</strong>
                        </div>
                        <button className="btn btn--icon btn--sm" onClick={() => copyText(data.paymentInfo!.vodafoneCash!, 'voda')} title="نسخ">
                          {copiedField === 'voda' ? <Check size={14} className="icon--success" /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {data.paymentInfo.bankDetails && (
                    <div style={{ background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', marginTop: 10 }}>
                      <div className="muted" style={{ fontSize: 11 }}>التحويل البنكي والآيبان</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{data.paymentInfo.bankDetails}</div>
                    </div>
                  )}

                  {data.paymentInfo.paymentInstructions && (
                    <p className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
                      💡 {data.paymentInfo.paymentInstructions}
                    </p>
                  )}
                </div>
              )}

              {/* Receipt Upload */}
              {receiptSuccess && (
                <div className="animation-fade-in" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  ✅ تم رفع إيصال الدفع بنجاح وسيتم مراجعته قريباً!
                </div>
              )}

              {data.paymentReceipt ? (
                <div style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed var(--border)', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CheckCircle2 size={24} className="icon--success" />
                    <div>
                      <strong style={{ fontSize: 14, display: 'block', marginBottom: 2 }}>تم رفع إيصال الدفع بنجاح</strong>
                      <div className="muted" style={{ fontSize: 12 }}>تم استلام إيصال الدفع المرفق ويجري المراجعة من قبل الإدارة</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <a href={data.paymentReceipt} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--outline">
                      عرض الإيصال
                    </a>
                    <button className="btn btn--sm" onClick={() => receiptFileRef.current?.click()} disabled={uploadingReceipt}>
                      تحديث الإيصال
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    className="btn btn--primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 10, padding: 14 }}
                    onClick={() => receiptFileRef.current?.click()}
                    disabled={uploadingReceipt}
                  >
                    <Upload size={18} /> {uploadingReceipt ? 'جاري الرفع...' : 'إرفاق إيصال التحويل أو صورة الدفع'}
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
                <h3 className="card-title">الملفات والتسليمات المتاحة</h3>
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

            {/* Revisions & Direct Feedback */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h3 className="card-title" style={{ margin: 0 }}>طلبات التعديل والملاحظات</h3>
                {data.project && !revOpen && (
                  <button className="btn btn--sm btn--primary" onClick={() => setRevOpen(true)}>
                    <Plus size={14} /> طلب تعديل جديد
                  </button>
                )}
              </div>

              {revSuccess && (
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  ✅ تم إرسال طلب التعديل وإشعار فريق العمل بنجاح!
                </div>
              )}

              {revOpen && (
                <form onSubmit={handleSendRevision} style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 16, border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>إرسال ملاحظة أو طلب تعديل</h4>
                  <div className="form-stack">
                    <input
                      className="input"
                      required
                      placeholder="عنوان التعديل (مثال: تعديل ألوان الشعار لتكون أغمق)"
                      value={revTitle}
                      onChange={e => setRevTitle(e.target.value)}
                    />
                    <textarea
                      className="textarea"
                      rows={3}
                      placeholder="تفاصيل التعديل المطلوب بدقة..."
                      value={revDesc}
                      onChange={e => setRevDesc(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn btn--primary btn--sm" disabled={submittingRev}>
                        <Send size={13} /> {submittingRev ? 'جارٍ الإرسال...' : 'إرسال التعديل'}
                      </button>
                      <button type="button" className="btn btn--sm" onClick={() => setRevOpen(false)}>
                        إلغاء
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
                <div className="empty" style={{ padding: '16px 0' }}>لا توجد طلبات تعديل حتى الآن. يمكنك إضافة أي ملاحظة أو تعديل عند توفر نماذج العمل.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
