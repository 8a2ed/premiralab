import React, { useRef, useState } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Share2, 
  Check, 
  CreditCard, 
  Building2, 
  User, 
  Calendar, 
  Tag, 
  FileText 
} from 'lucide-react';
import { money, formatDate } from '../../lib/utils.js';
import type { TrackerData, OrderRow } from '../../types.js';

interface InvoiceModalProps {
  order: TrackerData | OrderRow;
  onClose: () => void;
}

export function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Normalize order properties across TrackerData and OrderRow
  const orderNo = ('orderNo' in order ? order.orderNo : (order as any).order_no) || '';
  const clientName = ('clientName' in order ? order.clientName : (order as any).client_name) || 'عميلنا العزيز';
  const clientPhone = ('clientPhone' in order ? order.clientPhone : (order as any).client_phone) || '';
  const clientEmail = ('clientEmail' in order ? order.clientEmail : (order as any).client_email) || '';
  const packageTitle = ('packageTitle' in order ? order.packageTitle : (order as any).package_title) || (order as any).project_type || 'خدمة تصميم وتطوير متكاملة';
  const packagePrice = ('packagePrice' in order ? order.packagePrice : (order as any).package_price) || 0;
  const budget = Number(('budget' in order ? order.budget : (order as any).budget) || 0);
  const paymentAmount = Number(('paymentAmount' in order ? order.paymentAmount : (order as any).payment_amount) || budget || 0);
  const paidAmount = Number(('paidAmount' in order ? order.paidAmount : (order as any).paid_amount) || 0);
  const paymentStatus = ('paymentStatus' in order ? order.paymentStatus : (order as any).payment_status) || 'pending_approval';
  const paymentMethod = ('paymentMethod' in order ? order.paymentMethod : (order as any).payment_method) || '';
  const promoCode = ('promoCode' in order ? order.promoCode : (order as any).promo_code) || null;
  const promoDiscount = ('promoDiscount' in order ? order.promoDiscount : (order as any).promo_discount) || null;
  const createdAt = ('createdAt' in order ? order.createdAt : (order as any).created_at) || new Date().toISOString();
  const paymentTransactionId = ('paymentTransactionId' in order ? order.paymentTransactionId : (order as any).payment_transaction_id) || '';
  const company = ('companyInfo' in order ? (order as TrackerData).companyInfo : null) || {
    brand: 'PREMIRALAB STUDIO',
    email: 'contact@premiralab.com',
    phone: '+20 106 957 2748',
    whatsapp: '+20 106 957 2748',
    address: 'القاهرة، جمهورية مصر العربية',
    currency: 'EGP',
  };

  // 1. Base / Original Price
  const originalPrice = Number(packagePrice) > 0 
    ? Number(packagePrice) 
    : (Number(budget) > 0 ? Number(budget) : (Number(paymentAmount) > 0 ? Number(paymentAmount) : 0));

  // 2. Discount Amount Calculation (From promo code and promo discount string)
  let discountAmount = 0;
  if (promoCode && promoDiscount) {
    const discountStr = String(promoDiscount).trim();
    if (discountStr.includes('%')) {
      const pct = parseFloat(discountStr.replace('%', '')) || 0;
      discountAmount = (originalPrice * pct) / 100;
    } else {
      discountAmount = parseFloat(discountStr.replace(/[^\d.]/g, '')) || 0;
    }
  } else if (budget > 0 && originalPrice > budget) {
    discountAmount = originalPrice - budget;
  }

  // 3. Final Net Agreed Total
  let finalAgreedTotal = originalPrice > 0 ? Math.max(0, originalPrice - discountAmount) : (Number(budget) || Number(paymentAmount) || 0);
  if (budget > 0 && !discountAmount) {
    finalAgreedTotal = budget;
  }

  // 4. Required Payment Amount & Remaining
  const currentRequiredPayment = Number(paymentAmount) > 0 ? Number(paymentAmount) : finalAgreedTotal;
  const remainingAmount = Math.max(0, finalAgreedTotal - Number(paidAmount));

  // Status mapping
  const isPaid = paymentStatus === 'paid' || paidAmount >= finalAgreedTotal;
  const isApproved = paymentStatus === 'approved_for_payment' || paymentStatus === 'paid';

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(16px)' }}>
      <div 
        className="modal modal--invoice" 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#0d0d12',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Action Header (Hidden during print) */}
        <div className="invoice-modal-header no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: '#13131a',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20} style={{ color: 'var(--accent)' }} />
            <strong style={{ fontSize: 16 }}>الفاتورة الإلكترونية الرسمية</strong>
            <span className="status-pill" style={{
              background: isPaid ? 'rgba(34, 197, 94, 0.2)' : (isApproved ? 'rgba(124, 58, 237, 0.2)' : 'rgba(234, 179, 8, 0.2)'),
              color: isPaid ? '#22c55e' : (isApproved ? '#a78bfa' : '#eab308'),
              border: `1px solid ${isPaid ? '#22c55e' : (isApproved ? '#a78bfa' : '#eab308')}`,
              fontSize: 12,
              padding: '2px 10px',
            }}>
              {isPaid ? '✔ مدفوعة بالكامل' : (isApproved ? '⏳ معتمدة وبانتظار السداد' : 'قيد مراجعة المواعيد')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn--sm btn--outline" onClick={handleShare} title="نسخ رابط الفاتورة">
              {copied ? <><Check size={14} color="#22c55e" /> تم النسخ</> : <><Share2 size={14} /> مشاركة</>}
            </button>
            <button className="btn btn--sm btn--primary" onClick={handlePrint} title="طباعة الفاتورة أو حفظ كـ PDF">
              <Printer size={14} /> طباعة الفاتورة / PDF
            </button>
            <button className="btn btn--sm btn--icon" onClick={onClose} aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div 
          ref={printRef} 
          className="printable-invoice-content"
          style={{
            padding: '32px 36px',
            overflowY: 'auto',
            flex: 1,
            color: 'var(--text)',
            background: '#0d0d12',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Invoice Top Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, borderBottom: '2px solid var(--border)', paddingBottom: 24, marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <img 
                  src="/logo.png" 
                  alt="PREMIRALAB" 
                  style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', background: '#000', padding: 2, border: '1px solid rgba(255,255,255,0.1)' }} 
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <div>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text)' }}>
                    {company.brand || 'PREMIRALAB'}
                  </h1>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Creative Design & Digital Engineering Studio</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>{company.address}</div>
                <div>البريد: {company.email} | هاتف: {company.phone}</div>
              </div>
            </div>

            <div style={{ textAlign: 'left', minWidth: 200 }} dir="ltr">
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', letterSpacing: 1 }}>INVOICE</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>#INV-{orderNo}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Date: {formatDate(createdAt)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Order Ref: #{orderNo}</div>
            </div>
          </div>

          {/* Billed To & Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
            {/* Client Info */}
            <div style={{ background: 'var(--bg-2)', padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                <User size={16} /> فاتورة إلى (العميل):
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{clientName}</div>
              {clientPhone && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>الهاتف: {clientPhone}</div>}
              {clientEmail && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>البريد: {clientEmail}</div>}
              <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, fontWeight: 600 }}>
                نوع المشروع: {packageTitle}
              </div>
            </div>

            {/* Payment & Audit Info */}
            <div style={{ background: 'var(--bg-2)', padding: 18, borderRadius: 12, border: '1px solid var(--border)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                <CreditCard size={16} /> حالة وسجل السداد:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="muted" style={{ fontSize: 13 }}>الحالة المالية:</span>
                <strong style={{ color: isPaid ? '#22c55e' : (isApproved ? 'var(--accent)' : '#eab308'), fontSize: 14 }}>
                  {isPaid ? 'مسددة بنجاح 🎉' : (isApproved ? 'معتمدة وجاهزة للسداد' : 'قيد الاعتماد والمراجعة')}
                </strong>
              </div>

              {paymentMethod && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                  طريقة السداد: <strong>{paymentMethod}</strong>
                </div>
              )}

              {paymentTransactionId && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  رقم المعاملة: {paymentTransactionId}
                </div>
              )}

              {/* Official Stamp for Paid Invoices */}
              {isPaid && (
                <div style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  transform: 'rotate(-12deg)',
                  border: '2px dashed #22c55e',
                  color: '#22c55e',
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontWeight: 900,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  background: 'rgba(34, 197, 94, 0.05)',
                  userSelect: 'none',
                }}>
                  ✔ OFFICIAL PAID
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} style={{ color: 'var(--accent)' }} /> تفاصيل بنود الخدمة والأسعار:
            </h3>

            <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>البند / تفاصيل الخدمة</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>الكمية</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>السعر الأساسي</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Main Package / Service Item */}
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px' }}>
                      <strong style={{ display: 'block', fontSize: 15, color: 'var(--text)' }}>{packageTitle}</strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        تنفيذ كامل ومخصص للمشروع وفقاً لمتطلبات وتفاصيل الحجز رقم #{orderNo}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '16px', textAlign: 'left', fontWeight: 700 }}>
                      {money(originalPrice)}
                    </td>
                  </tr>

                  {/* Promo Code Discount Row (If applied) */}
                  {promoCode && (
                    <tr style={{ background: 'rgba(34, 197, 94, 0.05)', borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Tag size={15} style={{ color: '#22c55e' }} />
                          <div>
                            <strong style={{ color: '#22c55e', fontSize: 14 }}>
                              خصم كوبون ترويجي ({promoCode})
                            </strong>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>
                              تم تطبيق كود الخصم بنجاح {promoDiscount ? `(خصم بقيمة ${promoDiscount})` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#22c55e' }}>—</td>
                      <td style={{ padding: '14px 16px', textAlign: 'left', color: '#22c55e', fontWeight: 700 }}>
                        -{discountAmount > 0 ? `${money(discountAmount)} (${promoDiscount})` : (promoDiscount || 'خصم خاص')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals Calculation Box */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 30 }}>
            <div style={{ width: '100%', maxWidth: '380px', background: '#13131a', padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span className="muted">المجموع الفرعي (السعر الأصلي):</span>
                <span>{money(originalPrice)}</span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#22c55e' }}>
                  <span>قيمة الخصم المطبق {promoDiscount ? `(${promoDiscount})` : ''}:</span>
                  <strong>-{money(discountAmount)}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 15, fontWeight: 700 }}>
                <span>إجمالي المشروع الصافي المتفق عليه:</span>
                <span style={{ color: 'var(--accent)' }}>{money(finalAgreedTotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span className="muted">المطلوب سداده للدفعة الحالية:</span>
                <strong>{money(currentRequiredPayment)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: isPaid ? '#22c55e' : 'var(--text)' }}>
                <span>المبلغ المسدد بالفعل:</span>
                <strong style={{ color: isPaid ? '#22c55e' : 'inherit' }}>{money(paidAmount)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px dashed var(--border)', fontSize: 14, fontWeight: 700 }}>
                <span className="muted">المبلغ المتبقي بعد هذه الدفعة:</span>
                <span style={{ color: remainingAmount > 0 ? '#ef4444' : '#22c55e' }}>
                  {remainingAmount > 0 ? money(remainingAmount) : '0 ج.م (خالص السداد)'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer & Terms */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            <div>
              <p style={{ margin: '0 0 4px' }}>شكراً لاختياركم <strong>{company.brand || 'PremiraLab'}</strong> لشراكة النجاح والتميز الإبداعي.</p>
              <p style={{ margin: 0 }}>تُعد هذه الفاتورة وثيقة إلكترونية رسمية معتمدة من استوديو بريميرالاب للحلول الرقمية.</p>
            </div>
            <div style={{ textAlign: 'left', fontWeight: 600 }} dir="ltr">
              Generated securely by PremiraLab Cloud
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Clean A4 Printing without UI junk */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .modal-backdrop, .modal--invoice, .printable-invoice-content, .printable-invoice-content * {
            visibility: visible !important;
          }
          .modal-backdrop {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .modal--invoice {
            max-width: 100% !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }
          .printable-invoice-content {
            background: #fff !important;
            color: #111 !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
