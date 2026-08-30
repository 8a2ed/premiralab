import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, CheckCircle2, Clock, FileText, RefreshCw, XCircle, Plus, Send,
  CreditCard, Upload, Copy, Check, ShieldAlert, ShieldCheck, Sparkles, Smartphone, QrCode,
  Tag, Receipt, Printer, Share2
} from 'lucide-react';
import { api } from '../lib/api.js';
import { money, formatDate, formatBytes } from '../lib/utils.js';
import { ORDER_STATUS_LABELS } from '../types.js';
import type { TrackerData } from '../types.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { Modal } from '../components/ui/Modal.js';
import { InvoiceModal } from '../components/ui/InvoiceModal.js';

interface TrackerProps {
  orderNo: string;
  onHome:  () => void;
}

const STATUS_COLOR: Record<string, string> = {
  new: '#888', contacted: '#7c7cf0', approved: '#22c55e',
  payment_pending: '#f59e0b', paid: '#10b981', in_progress: '#cd45cd',
  review: '#7c7cf0', revisions: '#f97316', completed: '#22c55e', cancelled: '#ef4444',
};

const REVISION_ICONS: Record<string, React.ReactNode> = {
  approved: <CheckCircle2 size={16} className="icon--success" />,
  rejected: <XCircle      size={16} className="icon--danger" />,
  pending:  <Clock        size={16} className="icon--muted" />,
};

export function Tracker({ orderNo, onHome }: TrackerProps) {
  const [data,    setData]    = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Invoice Modal State
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // Client revision form state
  const [revOpen,       setRevOpen]       = useState(false);
  const [revTitle,      setRevTitle]      = useState('');
  const [revDesc,       setRevDesc]       = useState('');
  const [submittingRev, setSubmittingRev] = useState(false);
  const [revSuccess,    setRevSuccess]    = useState(false);

  // Payment UI state
  const [payModalOpen,     setPayModalOpen]     = useState(false);
  const [selectedMethod,   setSelectedMethod]   = useState<'card' | 'wallet' | 'fawry' | 'manual'>('card');
  const [walletPhone,      setWalletPhone]      = useState('');
  const [initiatingPay,    setInitiatingPay]    = useState(false);
  const [paymobIframeUrl,  setPaymobIframeUrl]  = useState<string | null>(null);
  const [fawryRefCode,     setFawryRefCode]     = useState<string | null>(null);
  const [fawryCopied,      setFawryCopied]      = useState(false);

  // Promo application inside checkout modal
  const [checkoutPromo,    setCheckoutPromo]    = useState('');
  const [applyingPromo,    setApplyingPromo]    = useState(false);
  const [promoSuccessMsg,  setPromoSuccessMsg]  = useState('');
  const [promoErrMsg,      setPromoErrMsg]      = useState('');

  // Robust financial and coupon calculations
  const pkgPrice = Number(data?.packagePrice) || 0;
  const rawBudget = Number(data?.budget) || 0;
  const rawPayment = Number(data?.paymentAmount) || 0;

  let origPrice = 0;
  let discAmount = 0;
  let agreedTotal = 0;

  let discountPct = 0;
  let discountFixed = 0;
  if (data?.promoCode && data?.promoDiscount) {
    const dStr = String(data.promoDiscount).trim();
    if (dStr.includes('%')) {
      discountPct = parseFloat(dStr.replace('%', '')) || 0;
    } else {
      discountFixed = parseFloat(dStr.replace(/[^\d.]/g, '')) || 0;
    }
  }

  if (pkgPrice > 0) {
    origPrice = pkgPrice;
    if (discountPct > 0) {
      discAmount = (origPrice * discountPct) / 100;
    } else if (discountFixed > 0) {
      discAmount = discountFixed;
    }
    agreedTotal = Math.max(0, origPrice - discAmount);
  } else if (rawBudget > 0) {
    if (discountPct > 0 && discountPct < 100) {
      origPrice = Math.round(rawBudget / (1 - discountPct / 100));
      discAmount = origPrice - rawBudget;
      agreedTotal = rawBudget;
    } else if (discountFixed > 0) {
      origPrice = rawBudget + discountFixed;
      discAmount = discountFixed;
      agreedTotal = rawBudget;
    } else {
      origPrice = rawBudget;
      discAmount = 0;
      agreedTotal = rawBudget;
    }
  } else if (rawPayment > 0) {
    origPrice = rawPayment;
    agreedTotal = rawPayment;
  }

  const reqPayment = rawPayment > 0 ? rawPayment : agreedTotal;
  const paid = Number(data?.paidAmount || 0);
  const remaining = Math.max(0, agreedTotal - paid);

  // Manual payment receipt state
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSuccess,   setReceiptSuccess]   = useState(false);
  const [copiedField,      setCopiedField]      = useState<string | null>(null);
  const [paymentNotice,    setPaymentNotice]    = useState<'success' | 'failed' | null>(null);
  const [paymentReason,    setPaymentReason]    = useState<string | null>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);

  // Check URL query parameters for payment return status and clean URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pStatus = urlParams.get('payment');
    const pReason = urlParams.get('reason');
    if (pStatus === 'success') {
      setPaymentNotice('success');
      // Clean query parameter from URL bar
      window.history.replaceState({}, document.title, window.location.pathname + `?track=${encodeURIComponent(orderNo)}`);
    } else if (pStatus === 'failed') {
      setPaymentNotice('failed');
      if (pReason) setPaymentReason(pReason);
      // Clean query parameter from URL bar
      window.history.replaceState({}, document.title, window.location.pathname + `?track=${encodeURIComponent(orderNo)}`);
    }
  }, [orderNo]);

  useEffect(() => {
    if (paymentNotice === 'success') {
      const timer = setTimeout(() => load(), 2000);
      return () => clearTimeout(timer);
    }
  }, [paymentNotice]);

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

  const copyFawryCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setFawryCopied(true);
      setTimeout(() => setFawryCopied(false), 2500);
    });
  };

  const handleUploadReceipt = async (file: File) => {
    setUploadingReceipt(true);
    try {
      const res = await api.uploadReceipt(orderNo, file);
      if (res.ok || res.receiptUrl) {
        setData(prev => prev ? {
          ...prev,
          paymentReceipt: res.receiptUrl,
          status: (res.status as any) || prev.status,
        } : prev);
        setReceiptSuccess(true);
        setTimeout(() => setReceiptSuccess(false), 6000);
        load();
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleInitiatePaymob = async (method: 'card' | 'wallet' | 'fawry') => {
    const phoneToUse = walletPhone.trim() || data?.clientPhone || '';
    if (method === 'wallet' && !phoneToUse) {
      alert('يرجى إدخال رقم محفظة فودافون كاش / المحفظة الإلكترونية');
      return;
    }
    setInitiatingPay(true);
    try {
      const res = await api.payment.initiate(orderNo, method, method === 'wallet' ? phoneToUse : undefined);
      if (method === 'fawry' && res.fawryCode) {
        setFawryRefCode(res.fawryCode);
      } else if (res.redirectionUrl) {
        window.location.href = res.redirectionUrl;
      } else if (res.paymentUrl) {
        setPaymobIframeUrl(res.paymentUrl);
      }
    } catch (err: any) {
      alert(err.message || 'فشل الاتصال ببوابة الدفع');
    } finally {
      setInitiatingPay(false);
    }
  };

  const handleApplyCheckoutPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPromo.trim()) return;
    setApplyingPromo(true);
    setPromoSuccessMsg('');
    setPromoErrMsg('');
    try {
      const res = await api.payment.applyPromo(orderNo, checkoutPromo.trim().toUpperCase());
      if (res.ok) {
        setPromoSuccessMsg(res.message);
        setCheckoutPromo('');
        load();
      }
    } catch (err: any) {
      setPromoErrMsg(err.message || 'كوبون الخصم غير صحيح أو منتهي');
    } finally {
      setApplyingPromo(false);
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

      <main className="tracker-body">
        <div className="container">
          {loading && (
            <div className="card">
              <Skeleton count={4} />
            </div>
          )}

          {error && (
            <div className="card">
              <div className="empty" style={{ color: 'var(--danger)' }}>{error}</div>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button className="btn btn--primary" onClick={onHome}>العودة للرئيسية</button>
              </div>
            </div>
          )}

          {data && (
            <div className="tracker-grid">
              {/* Receipt Uploaded Success Banner */}
              {receiptSuccess && (
                <div className="card animation-fade-in" style={{ border: '1px solid #22c55e', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircle2 size={24} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 14 }}>تم رفع إيصال التحويل بنجاح! 📸</strong>
                    <span style={{ fontSize: 12 }}>يقوم فريق الإدارة بمطابقة الإيصال وتأكيد بدء مشروعك فوراً.</span>
                  </div>
                </div>
              )}

              {/* Payment Success / Failure Notice Banners */}
              {paymentNotice === 'success' && (
                <div className="card animation-fade-in" style={{ border: '1px solid #22c55e', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircle2 size={24} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 14 }}>تم استلام وسداد دفعتك الإلكترونية بنجاح! 🎉</strong>
                    <span style={{ fontSize: 12 }}>تم تأكيد الحجز وبدأ العمل على مشروعك رسميًا.</span>
                  </div>
                </div>
              )}

              {paymentNotice === 'failed' && (
                <div className="card animation-fade-in" style={{ border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldAlert size={24} style={{ color: '#ef4444' }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: 14, color: '#ef4444' }}>لم تكتمل عملية الدفع الإلكتروني السابقة</strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {paymentReason ? `استجابة البوابة: ${paymentReason} — ` : ''}
                        يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع بديلة (مثل فيزا/ميزة، كود فوري، أو انستاباي).
                      </span>
                    </div>
                  </div>
                  <button className="btn btn--sm btn--primary" onClick={() => { setPaymentNotice(null); setPayModalOpen(true); }}>
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {/* Order Info Card */}
              <div className="card">
                <div className="tracker-card__header">
                  <div>
                    <span className="muted" style={{ fontSize: 12 }}>رقم الطلب</span>
                    <h2 className="tracker-card__no">#{data.orderNo}</h2>
                  </div>
                  <span
                    className="status-pill"
                    style={{ background: STATUS_COLOR[data.status] ?? '#888', color: '#fff' }}
                  >
                    {ORDER_STATUS_LABELS[data.status] ?? data.status}
                  </span>
                </div>

                <div className="tracker-meta">
                  <div className="tracker-meta__item">
                    <span className="muted">نوع الخدمة:</span>
                    <strong>{data.packageTitle ?? data.serviceTitle ?? data.projectType ?? 'طلب مخصص'}</strong>
                  </div>
                  {agreedTotal > 0 && (
                    <div className="tracker-meta__item">
                      <span className="muted">الميزانية المتفق عليها:</span>
                      <strong>{money(agreedTotal)}</strong>
                    </div>
                  )}
                  {data.deadline && (
                    <div className="tracker-meta__item">
                      <span className="muted">الموعد المستهدف:</span>
                      <strong>{formatDate(data.deadline)}</strong>
                    </div>
                  )}
                  <div className="tracker-meta__item">
                    <span className="muted">تاريخ الإنشاء:</span>
                    <span>{formatDate(data.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Financial & Invoicing Summary Card */}
              <div className="card" style={{ border: '1px solid rgba(124, 58, 237, 0.25)', background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Receipt size={22} style={{ color: 'var(--accent)' }} />
                    <h3 style={{ margin: 0, fontSize: 16 }}>ملخص الفوترة والأسعار والحسابات</h3>
                  </div>

                  <button
                    className="btn btn--sm btn--primary"
                    style={{ gap: 6 }}
                    onClick={() => setInvoiceOpen(true)}
                  >
                    <FileText size={15} /> عرض وطباعة الفاتورة الرسمية
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {/* Base Package / Service Price */}
                  <div style={{ background: 'var(--bg-3)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                    <span className="muted" style={{ fontSize: 12, display: 'block' }}>السعر الأساسي للخدمة</span>
                    <strong style={{ fontSize: 16, marginTop: 4, display: 'block' }}>
                      {money(origPrice)}
                    </strong>
                  </div>

                  {/* Promo Code Discount */}
                  <div style={{ background: data.promoCode ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-3)', padding: 14, borderRadius: 10, border: `1px solid ${data.promoCode ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)'}` }}>
                    <span className="muted" style={{ fontSize: 12, display: 'block' }}>كوبون الخصم</span>
                    {data.promoCode ? (
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Tag size={14} color="#22c55e" />
                        <strong style={{ fontSize: 14, color: '#22c55e' }}>{data.promoCode}</strong>
                        <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                          (-{discAmount > 0 ? money(discAmount) : (data.promoDiscount || '')})
                        </span>
                      </div>
                    ) : (
                      <span className="muted" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>لا يوجد كوبون مطبق</span>
                    )}
                  </div>

                  {/* Net Agreed Total */}
                  <div style={{ background: 'var(--bg-3)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                    <span className="muted" style={{ fontSize: 12, display: 'block' }}>الإجمالي الصافي المتفق عليه</span>
                    <strong style={{ fontSize: 16, color: 'var(--accent)', marginTop: 4, display: 'block' }}>
                      {money(agreedTotal)}
                    </strong>
                  </div>

                  {/* Paid vs Remaining */}
                  <div style={{ background: 'var(--bg-3)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                    <span className="muted" style={{ fontSize: 12, display: 'block' }}>المدفوع / المتبقي</span>
                    <div style={{ marginTop: 4, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: paid > 0 ? '#22c55e' : 'inherit' }}>
                        {money(paid)}
                      </strong>
                      <span className="muted" style={{ fontSize: 11 }}>
                        (متبقي: {money(remaining)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  Queue Review & Smart Payment Flow
              ───────────────────────────────────────────────────────────── */}

              {/* CASE 1: Pending Queue Review (قيد مراجعة المواعيد والطابور) */}
              {(!data.paymentStatus || data.paymentStatus === 'pending_approval') && (
                <div className="card" style={{ border: '1px solid rgba(148, 163, 184, 0.4)', background: 'linear-gradient(145deg, var(--bg-2), var(--bg-3))' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ background: 'rgba(148, 163, 184, 0.15)', padding: 10, borderRadius: 12, color: 'var(--accent)' }}>
                      <Clock size={28} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--text)' }}>
                        طلبك قيد مراجعة المواعيد وجدول العمل ⏳
                      </h3>
                      <p className="muted" style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                        تم استلام طلبك بنجاح. لضمان أعلى مستويات الجودة والتفرغ الكامل لمشروعك، يقوم فريق الإدارة حاليًا بمراجعة جدول المواعيد والمقاعد المتاحة.
                        <br />
                        <strong>سيتم إشعارك فور اعتماد طلبك وإتاحة إمكانية الدفع لبدء التنفيذ مباشرة.</strong>
                      </p>
                      {data.reviewNotes && (
                        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 12, border: '1px solid var(--border)' }}>
                          <strong>ملاحظة من الإدارة:</strong> {data.reviewNotes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CASE 2: Waitlist (في قائمة الانتظار) */}
              {data.paymentStatus === 'waitlist' && (
                <div className="card" style={{ border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: 10, borderRadius: 12, color: '#f59e0b' }}>
                      <Clock size={28} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#f59e0b' }}>
                        أنت الآن في قائمة الانتظار 📋
                      </h3>
                      <p className="muted" style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                        نظرًا لامتلاء جدول المواعيد في الوقت الحالي، تم إدراج طلبك في قائمة الانتظار ذات الأولوية.
                        <br />
                        {data.reviewNotes ? `📅 رسالة الإدارة: ${data.reviewNotes}` : 'سنقوم بالتواصل معك فور فتح مقعد جديد لبدء مشروعك.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CASE 3: Rejected / No Capacity (معتذر عنه) */}
              {data.paymentStatus === 'rejected' && (
                <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: 10, borderRadius: 12, color: '#ef4444' }}>
                      <ShieldAlert size={28} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#ef4444' }}>
                        نعتذر عن عدم إمكانية استلام طلبات جديدة حاليًا
                      </h3>
                      <p className="muted" style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                        {data.reviewNotes || 'نعتذر لعدم توافر مقاعد شاغرة للتنفيذ في الوقت الحالي. يمكنك التواصل معنا لاحقًا.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CASE 4: Approved For Payment (تمت الموافقة ومتاح للدفع) */}
              {data.paymentStatus === 'approved_for_payment' && (
                <div className="card" style={{ border: '2px solid var(--accent)', background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.08), rgba(168, 85, 247, 0.04))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ background: 'rgba(34, 197, 94, 0.15)', padding: 8, borderRadius: 10, color: '#22c55e' }}>
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16 }}>تمت الموافقة واعتماد موعد مشروعك! 🎉</h3>
                        <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>
                          يرجى إتمام عملية السداد لتثبيت الحجز وبدء التنفيذ الفوري
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <span className="muted" style={{ fontSize: 12, display: 'block' }}>المبلغ المطلوب سداده</span>
                      <strong style={{ fontSize: 20, color: 'var(--accent)' }}>
                        {money(reqPayment)}
                      </strong>
                    </div>
                  </div>

                  {data.reviewNotes && (
                    <div style={{ background: 'var(--bg-3)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, border: '1px solid var(--border)' }}>
                      <strong>💬 ملاحظات الإدارة:</strong> {data.reviewNotes}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn--primary btn--glow"
                      style={{
                        flex: 1,
                        padding: '14px 20px',
                        fontSize: 15,
                        fontWeight: 700,
                        justifyContent: 'center',
                        gap: 10,
                        width: '100%',
                        borderRadius: 12,
                        lineHeight: 1.3,
                        boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)',
                      }}
                      onClick={() => setPayModalOpen(true)}
                    >
                      <CreditCard size={18} /> سداد الدفعة وتأكيد الحجز ⚡
                    </button>
                  </div>
                </div>
              )}

              {/* CASE 5: Paid (مدفوع ومكتمل الدفع) */}
              {data.paymentStatus === 'paid' && (
                <div className="card" style={{ border: '1px solid rgba(34, 197, 94, 0.4)', background: 'rgba(34, 197, 94, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <CheckCircle2 size={28} style={{ color: '#22c55e' }} />
                      <div>
                        <strong style={{ fontSize: 15, display: 'block', color: '#22c55e' }}>تم سداد الدفعة بنجاح والعمل قيد التنفيذ 🚀</strong>
                        <span className="muted" style={{ fontSize: 12 }}>
                          المبلغ المسدد: {money(data.paidAmount || data.budget || 0)} {data.paymentMethod ? `(${data.paymentMethod})` : ''}
                        </span>
                      </div>
                    </div>
                    {data.paymentReceipt && (
                      <a href={data.paymentReceipt} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--outline">
                        عرض الإيصال
                      </a>
                    )}
                  </div>
                </div>
              )}

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
                  <div className="empty">سيتم إنشاء وتحديث مساحة العمل فور تأكيد الحجز وبدء التصميم.</div>
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
                        <button type="submit" className="btn btn--primary" disabled={submittingRev}>
                          <Send size={14} /> {submittingRev ? 'جارٍ الإرسال...' : 'إرسال التعديل للفريق'}
                        </button>
                        <button type="button" className="btn" onClick={() => setRevOpen(false)}>إلغاء</button>
                      </div>
                    </div>
                  </form>
                )}

                {data.revisions.length === 0 ? (
                  <div className="empty" style={{ padding: '16px 0' }}>لا توجد طلبات تعديل حتى الآن.</div>
                ) : (
                  <div className="revision-list">
                    {data.revisions.map(r => (
                      <div key={r.id} className="revision-item">
                        <div className="revision-item__icon">
                          {REVISION_ICONS[r.status] ?? <Clock size={16} />}
                        </div>
                        <div className="revision-item__body">
                          <div className="revision-item__title">{r.title}</div>
                          {r.description && <div className="revision-item__desc muted">{r.description}</div>}
                          <div className="revision-item__date muted">{formatDate(r.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          Interactive Payment Checkout Modal
      ───────────────────────────────────────────────────────────── */}
      {payModalOpen && data && (
        <Modal title={`سداد الفاتورة للطلب #${data.orderNo}`} onClose={() => setPayModalOpen(false)}>
          <div className="form-stack" style={{ gap: 14 }}>
            {/* Live Pricing Breakdown Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(168, 85, 247, 0.04))',
              border: '1px solid rgba(124, 58, 237, 0.25)',
              borderRadius: 14,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {data.packageTitle || data.projectType || 'خدمة تصميم وتطوير'}
                </span>
                {data.promoCode && (
                  <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: 11, gap: 4 }}>
                    <Tag size={12} /> كود {data.promoCode} ({data.promoDiscount})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>المبلغ المطلوب سداده:</span>
                <strong style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', letterSpacing: -0.5 }}>
                  {money(reqPayment)}
                </strong>
              </div>
            </div>

            {/* Promo Code Form */}
            <div style={{ background: 'var(--bg-2)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
              <form onSubmit={handleApplyCheckoutPromo} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="هل لديك كوبون خصم؟"
                  value={checkoutPromo}
                  onChange={e => setCheckoutPromo(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase', letterSpacing: 1, height: 38, fontSize: 12, borderRadius: 8, flex: 1 }}
                />
                <button 
                  type="submit" 
                  className="btn btn--sm btn--outline"
                  disabled={applyingPromo || !checkoutPromo.trim()}
                  style={{ height: 38, padding: '0 14px', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  {applyingPromo ? 'فحص...' : 'تطبيق 🎁'}
                </button>
              </form>

              {promoSuccessMsg && (
                <div style={{ color: '#22c55e', fontSize: 11, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={13} /> {promoSuccessMsg}
                </div>
              )}

              {promoErrMsg && (
                <div style={{ color: '#ef4444', fontSize: 11, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldAlert size={13} /> {promoErrMsg}
                </div>
              )}
            </div>


            {data.paymentInfo?.paymentsEnabled === false ? (
              <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-3)', borderRadius: 12, border: '1px solid var(--border)', marginTop: 16 }}>
                <ShieldCheck size={48} style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
                <h4 style={{ margin: '0 0 8px', fontSize: 18 }}>ترتيب الدفع</h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                  سيتم التواصل معك من قبل الإدارة لترتيب طريقة الدفع المناسبة لإتمام الطلب.
                </p>
              </div>
            ) : (
              <>

            {/* Payment Method 2x2 Modern Grid */}
            <div className="form-field" style={{ margin: 0 }}>
              <label className="form-label" style={{ marginBottom: 8, fontSize: 12 }}>اختر طريقة السداد:</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}>
                {/* Vodafone Cash */}
                {data.paymentInfo?.vodafoneEnabled !== false && (
                <button
                  type="button"
                  onClick={() => { setSelectedMethod('wallet'); setFawryRefCode(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: selectedMethod === 'wallet' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    background: selectedMethod === 'wallet' ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-2)',
                    color: selectedMethod === 'wallet' ? '#fff' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: selectedMethod === 'wallet' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedMethod === 'wallet' ? '0 0 12px rgba(124, 58, 237, 0.25)' : 'none',
                  }}
                >
                  <Smartphone size={16} color={selectedMethod === 'wallet' ? 'var(--accent)' : 'currentColor'} />
                  <span>فودافون كاش</span>
                </button>)}

                {/* InstaPay */}
                {data.paymentInfo?.instapayEnabled !== false && (
                <button
                  type="button"
                  onClick={() => { setSelectedMethod('manual'); setFawryRefCode(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: selectedMethod === 'manual' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    background: selectedMethod === 'manual' ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-2)',
                    color: selectedMethod === 'manual' ? '#fff' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: selectedMethod === 'manual' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedMethod === 'manual' ? '0 0 12px rgba(124, 58, 237, 0.25)' : 'none',
                  }}
                >
                  <Send size={16} color={selectedMethod === 'manual' ? 'var(--accent)' : 'currentColor'} />
                  <span>انستاباي</span>
                </button>)}

                {/* Cards */}
                {data.paymentInfo?.paymobEnabled !== false && (
                <button
                  type="button"
                  onClick={() => { setSelectedMethod('card'); setFawryRefCode(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: selectedMethod === 'card' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    background: selectedMethod === 'card' ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-2)',
                    color: selectedMethod === 'card' ? '#fff' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: selectedMethod === 'card' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedMethod === 'card' ? '0 0 12px rgba(124, 58, 237, 0.25)' : 'none',
                  }}
                >
                  <CreditCard size={16} color={selectedMethod === 'card' ? 'var(--accent)' : 'currentColor'} />
                  <span>بطاقة بنكية</span>
                </button>)}

                {/* Fawry */}
                {data.paymentInfo?.paymobEnabled !== false && (
                <button
                  type="button"
                  onClick={() => { setSelectedMethod('fawry'); setFawryRefCode(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: selectedMethod === 'fawry' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    background: selectedMethod === 'fawry' ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-2)',
                    color: selectedMethod === 'fawry' ? '#fff' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: selectedMethod === 'fawry' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedMethod === 'fawry' ? '0 0 12px rgba(124, 58, 237, 0.25)' : 'none',
                  }}
                >
                  <QrCode size={16} color={selectedMethod === 'fawry' ? 'var(--accent)' : 'currentColor'} />
                  <span>كود فوري</span>
                </button>)}
              </div>
            </div>

            {/* Vodafone Cash Panel */}
            {selectedMethod === 'wallet' && (
              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    تحويل مباشر بدون عمولة لمبلغ: <strong>{money(reqPayment)}</strong>
                  </span>
                  <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: 10 }}>
                    فوري ✔
                  </span>
                </div>

                {(() => {
                  const vodaNum = data.paymentInfo?.vodafoneCash || '01069572748';
                  const ussdCode = `*9*7*${vodaNum}*${reqPayment}#`;
                  return (
                    <>
                      {/* Big Account Copy Row */}
                      <div
                        onClick={() => copyText(vodaNum, 'voda')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-3)',
                          border: '1px solid rgba(124, 58, 237, 0.3)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>رقم محفظة فودافون كاش:</div>
                          <span style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 800, color: 'var(--accent)', letterSpacing: 1 }} dir="ltr">
                            {vodaNum}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{
                            background: copiedField === 'voda' ? '#22c55e' : 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            fontSize: 11,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {copiedField === 'voda' ? <><Check size={13} /> تم النسخ</> : <><Copy size={13} /> نسخ</>}
                        </button>
                      </div>

                      {/* USSD Quick Dial Helper */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 8,
                        background: 'rgba(124, 58, 237, 0.06)',
                        border: '1px dashed rgba(124, 58, 237, 0.25)',
                        borderRadius: 8,
                        padding: '8px 10px',
                      }}>
                        <div style={{ fontSize: 11 }}>
                          <span style={{ color: 'var(--text-muted)' }}>كود التحويل السريع: </span>
                          <code style={{ color: 'var(--accent)', fontWeight: 700 }} dir="ltr">{ussdCode}</code>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(ussdCode, 'ussd')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '2px 6px',
                          }}
                        >
                          {copiedField === 'ussd' ? '✔ منسوخ' : 'نسخ الكود'}
                        </button>
                      </div>

                      {/* Upload Receipt CTA Button */}
                      <button
                        className="btn btn--primary btn--glow"
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: 14,
                          fontWeight: 700,
                          borderRadius: 10,
                          justifyContent: 'center',
                          gap: 8,
                          marginTop: 12,
                        }}
                        onClick={() => receiptFileRef.current?.click()}
                        disabled={uploadingReceipt}
                      >
                        <Upload size={16} /> {uploadingReceipt ? 'جارٍ رفع الإيصال...' : 'رفع صورة إشعار التحويل 📸'}
                      </button>

                      {/* Paymob Gateway Fallback */}
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                        <details style={{ fontSize: 11 }}>
                          <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 500 }}>
                            أو ادفع عبر بوابة المحافظ الإلكترونية أونلاين ⚡
                          </summary>
                          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                            <input
                              className="input"
                              type="tel"
                              dir="ltr"
                              placeholder="أدخل رقم محفظتك"
                              value={walletPhone}
                              onChange={e => setWalletPhone(e.target.value)}
                              style={{ height: 34, fontSize: 12, flex: 1, borderRadius: 6 }}
                            />
                            <button
                              className="btn btn--outline btn--sm"
                              style={{ height: 34, fontSize: 11, padding: '0 10px', whiteSpace: 'nowrap', borderRadius: 6 }}
                              onClick={() => handleInitiatePaymob('wallet')}
                              disabled={initiatingPay}
                            >
                              {initiatingPay ? 'اتصال...' : 'متابعة'}
                            </button>
                          </div>
                        </details>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* InstaPay Panel */}
            {selectedMethod === 'manual' && (
              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    تحويل انستاباي فوري لمبلغ: <strong>{money(reqPayment)}</strong>
                  </span>
                  <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: 10 }}>
                    0% رسوم ✔
                  </span>
                </div>

                {/* Big InstaPay Copy Row */}
                <div
                  onClick={() => copyText(data.paymentInfo?.instapayUsername || 'a8a22ed@instapay', 'insta')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-3)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>عنوان انستاباي (IPA):</div>
                    <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: 'var(--accent)', letterSpacing: 0.5 }} dir="ltr">
                      {data.paymentInfo?.instapayUsername || 'a8a22ed@instapay'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn--sm"
                    style={{
                      background: copiedField === 'insta' ? '#22c55e' : 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      fontSize: 11,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {copiedField === 'insta' ? <><Check size={13} /> تم النسخ</> : <><Copy size={13} /> نسخ</>}
                  </button>
                </div>

                {/* Upload Receipt CTA Button */}
                <button
                  className="btn btn--primary btn--glow"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 700,
                    borderRadius: 10,
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 12,
                  }}
                  onClick={() => receiptFileRef.current?.click()}
                  disabled={uploadingReceipt}
                >
                  <Upload size={16} /> {uploadingReceipt ? 'جارٍ رفع الإيصال...' : 'رفع صورة إشعار التحويل 📸'}
                </button>
              </div>
            )}

            {/* Cards (Visa/Mastercard) Panel */}
            {selectedMethod === 'card' && (
              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 14,
              }}>
                <div style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '10px 12px', borderRadius: 8, marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                  <strong style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                    <ShieldCheck size={15} /> دفع إلكتروني مشفر وآمن 100%
                  </strong>
                  <span>معالجة بيانات البطاقة البنكية بأعلى معايير الأمان الدولية (PCI-DSS) عبر بوابة Paymob المعتمدة.</span>
                </div>

                <button
                  className="btn btn--primary btn--glow"
                  style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, borderRadius: 10, justifyContent: 'center', gap: 8 }}
                  onClick={() => handleInitiatePaymob('card')}
                  disabled={initiatingPay}
                >
                  <CreditCard size={17} /> {initiatingPay ? 'جارٍ الاتصال ببوابة الدفع...' : `سداد ${money(reqPayment)} بالبطاقة 💳`}
                </button>
              </div>
            )}

            {/* Fawry Panel */}
            {selectedMethod === 'fawry' && (
              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 14,
              }}>
                {fawryRefCode ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>كود الدفع المرجعي لفوري (صالح لـ 48 ساعة):</div>
                    <div
                      onClick={() => copyFawryCode(fawryRefCode)}
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        letterSpacing: 2,
                        background: 'var(--bg-3)',
                        border: '1.5px dashed var(--accent)',
                        padding: '10px 14px',
                        borderRadius: 8,
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                      }}
                    >
                      <span>{fawryRefCode}</span>
                      <button
                        type="button"
                        className="btn btn--sm"
                        style={{
                          background: fawryCopied ? '#22c55e' : 'var(--accent)',
                          color: '#fff',
                          border: 'none',
                          padding: '4px 10px',
                          fontSize: 11,
                          borderRadius: 6,
                        }}
                      >
                        {fawryCopied ? 'تم النسخ ✔' : 'نسخ'}
                      </button>
                    </div>
                    <p className="muted" style={{ fontSize: 11, marginTop: 8, marginBottom: 0 }}>
                      توجه لأي منفذ فوري أو استخدم تطبيق ماي فوري للدفع بهذا الكود.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
                      الحصول على كود سداد فوري لإتمام دفع مبلغ <strong>{money(reqPayment)}</strong> نقدًا من أي فرع أو كشك فوري.
                    </p>
                    <button
                      className="btn btn--primary btn--glow"
                      style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, borderRadius: 10, justifyContent: 'center', gap: 8 }}
                      onClick={() => handleInitiatePaymob('fawry')}
                      disabled={initiatingPay}
                    >
                      <QrCode size={17} /> {initiatingPay ? 'جارٍ إصدار الكود...' : 'إصدار كود الدفع من فوري 🏪'}
                    </button>
                  </div>
                )}
              </div>
            )}

            </>
          )}
            <input
              ref={receiptFileRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { handleUploadReceipt(f); setPayModalOpen(false); } e.target.value = ''; }}
            />
          </div>
        </Modal>
      )}
      {/* Paymob iFrame Overlay Modal */}
      {paymobIframeUrl && (
        <Modal title="بوابة الدفع الإلكتروني الآمنة — Paymob" onClose={() => setPaymobIframeUrl(null)}>
          <div style={{ width: '100%', height: '70vh', minHeight: '480px', maxHeight: '720px', position: 'relative' }}>
            <iframe
              src={paymobIframeUrl}
              title="Paymob Payment"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 10 }}
            />
          </div>
        </Modal>
      )}

      {/* Official Printable Invoice Modal */}
      {invoiceOpen && data && (
        <InvoiceModal order={data} onClose={() => setInvoiceOpen(false)} />
      )}
    </div>
  );
}
