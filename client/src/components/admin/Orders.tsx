import { useState, useEffect, useCallback } from 'react';
import { Search, Download, FileText, LayoutGrid, List, MessageSquare, Phone, DollarSign, Paperclip, Trash2, CheckCircle2, Clock, AlertCircle, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money, formatDate, debounce, downloadUrl, waLink } from '../../lib/utils.js';
import { ORDER_STATUS_LABELS, type Order, type OrderStatus, type Paginated } from '../../types.js';
import { TableSkeleton } from '../ui/Skeleton.js';
import { Modal } from '../ui/Modal.js';
import { InvoiceModal } from '../ui/InvoiceModal.js';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'جميع الحالات' },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const KANBAN_COLUMNS: Array<{ id: string; title: string; color: string; statuses: string[] }> = [
  { id: 'new',         title: 'طلبات جديدة ومراجعة',    color: '#888',     statuses: ['new'] },
  { id: 'approved',    title: 'معتمد / بانتظار الدفع',  color: '#7c7cf0',  statuses: ['contacted', 'approved', 'payment_pending', 'paid'] },
  { id: 'in_progress', title: 'قيد التنفيذ والعمل',     color: '#cd45cd',  statuses: ['in_progress'] },
  { id: 'review',      title: 'المراجعة والتعديلات',    color: '#f59e0b',  statuses: ['review', 'revisions'] },
  { id: 'completed',   title: 'مكتمل ومسلّم',           color: '#22c55e',  statuses: ['completed'] },
];

interface OrdersProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function Orders({ onToast }: OrdersProps) {
  const [data,         setData]         = useState<Paginated<Order> | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [status,       setStatus]       = useState('all');
  const [page,         setPage]         = useState(1);
  const [viewMode,     setViewMode]     = useState<'table' | 'kanban'>('table');
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [reviewOrder,  setReviewOrder]  = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const load = useCallback(async (s = search, st = status, p = page, mode = viewMode) => {
    setLoading(true);
    try {
      const limit = mode === 'kanban' ? 100 : 25;
      const res = await api.admin.orders({ page: p, limit, search: s || undefined, status: st });
      setData(res);
    } catch (e) {
      onToast((e as Error).message, 'error');
    } finally { setLoading(false); }
  }, [search, status, page, viewMode, onToast]);

  useEffect(() => { load(); }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((val: unknown) => { setPage(1); load(val as string, status, 1); }, 400),
    [status, viewMode], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleSearch = (val: string) => { setSearch(val); debouncedSearch(val); };
  const handleStatus = (val: string) => { setStatus(val); setPage(1); load(search, val, 1); };

  const updateStatus = async (id: number, newStatus: string) => {
    setData(prev => prev ? {
      ...prev,
      rows: prev.rows.map(o => o.id === id ? { ...o, status: newStatus as OrderStatus } : o),
    } : prev);
    try {
      await api.admin.updateOrder(id, { status: newStatus as OrderStatus });
      onToast('تم تحديث الحالة', 'success');
    } catch (e) {
      onToast((e as Error).message, 'error');
      await load();
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب بشكل نهائي؟ سيتم حذف جميع الملفات المرتبطة به أيضًا.')) return;
    try {
      await api.admin.deleteOrder(id);
      onToast('تم حذف الطلب بنجاح', 'success');
      load();
    } catch (e) {
      onToast((e as Error).message, 'error');
    }
  };

  const exportCSV = () => downloadUrl(api.admin.exportOrdersUrl(), `orders-${new Date().toISOString().slice(0,10)}.csv`);
  const openInvoice = (order: Order) => setInvoiceOrder(order);

  const getClientWhatsAppUrl = (order: Order) => {
    const cleanPhone = (order.client_phone || '').replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    const msg = `مرحبًا ${order.client_name}، بخصوص طلبك (${order.order_no}) لدى استوديو PREMIRALAB: حالة طلبك الآن هي: ${ORDER_STATUS_LABELS[order.status] || order.status}.`;
    return waLink(intlPhone, msg);
  };

  return (
    <div className="card">
      {/* Toolbar */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="toolbar__search">
          <Search size={16} className="toolbar__search-icon" aria-hidden />
          <input
            className="input toolbar__input"
            placeholder="بحث بالاسم، الهاتف، أو رقم الطلب..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            aria-label="بحث في الطلبات"
          />
        </div>
        <div className="toolbar__filters" style={{ flexWrap: 'wrap', gap: 8 }}>
          {/* View Mode Toggle */}
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="عرض الجدول"
            >
              <List size={14} /> جدول
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              title="عرض لوحة كانبان"
            >
              <LayoutGrid size={14} /> كانبان
            </button>
          </div>

          <select
            className="select"
            value={status}
            onChange={e => handleStatus(e.target.value)}
            aria-label="تصفية حسب الحالة"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="btn" onClick={exportCSV} title="تصدير إلى Excel">
            <Download size={15} /> تصدير CSV
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? <TableSkeleton rows={5} cols={6} /> : (
        <>
          {viewMode === 'table' ? (
            /* Table View */
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>الباقة / الخدمة</th>
                    <th>مراجعة المواعيد والدفع</th>
                    <th>الحالة</th>
                    <th>الميزانية والسداد</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows.map(o => {
                    const payStatus = o.payment_status || 'pending_approval';
                    return (
                      <tr key={o.id}>
                        <td><code className="order-no">{o.order_no}</code></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{o.client_name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span className="muted" style={{ fontSize: 12 }}>{o.client_phone}</span>
                            <a
                              href={getClientWhatsAppUrl(o)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn--icon btn--sm"
                              style={{ color: '#25D366', padding: 2 }}
                              title="مراسلة العميل عبر واتساب"
                            >
                              <MessageSquare size={13} />
                            </a>
                            <a
                              href={`tel:${o.client_phone}`}
                              className="btn btn--icon btn--sm"
                              style={{ color: 'var(--text-muted)', padding: 2 }}
                              title="اتصال هاتفي"
                            >
                              <Phone size={13} />
                            </a>
                          </div>
                        </td>
                        <td>{o.package_title ?? o.service_title ?? o.project_type ?? '—'}</td>
                        
                        {/* Queue & Payment Status Cell */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <PaymentStatusBadge status={payStatus} />
                            {o.payment_approved_at && (
                              <span style={{ fontSize: 11, color: '#888' }}>
                                اعتُمد: {new Date(o.payment_approved_at).toLocaleDateString('ar-EG')}
                              </span>
                            )}
                            <button
                              className="btn btn--sm btn--outline"
                              style={{ fontSize: 11, padding: '4px 8px', alignSelf: 'flex-start' }}
                              onClick={() => setReviewOrder(o)}
                            >
                              ⚙️ إدارة الطابور والدفع
                            </button>
                          </div>
                        </td>

                        <td>
                          <select
                            className="select select--compact"
                            value={o.status}
                            onChange={e => updateStatus(o.id, e.target.value)}
                            aria-label={`حالة الطلب ${o.order_no}`}
                          >
                            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600 }}>{o.budget ? money(o.budget) : '—'}</span>
                            <button
                              className="btn btn--icon btn--sm"
                              title="تعديل الميزانية والدفعة المسددة"
                              onClick={() => setPaymentOrder(o)}
                            >
                              <DollarSign size={13} style={{ color: (o.paid_amount || 0) >= (o.budget || 0) && (o.budget || 0) > 0 ? '#10b981' : 'var(--accent)' }} />
                            </button>
                            {o.payment_receipt && (
                              <a
                                href={`/uploads/${o.payment_receipt}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn--icon btn--sm"
                                style={{ color: '#22c55e' }}
                                title="معاينة إيصال التحويل المرفوع"
                              >
                                <Paperclip size={13} />
                              </a>
                            )}
                          </div>
                          {o.promo_code && (
                            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--primary)' }}>
                              🎁 كود: {o.promo_code} ({o.promo_discount})
                            </div>
                          )}
                          {o.paid_amount != null && o.paid_amount > 0 && (
                            <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                              مسدد: {money(o.paid_amount)} {o.payment_method ? `(${o.payment_method})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="actions-cell">
                          <button
                            className="btn btn--icon"
                            title="فتح واستعراض الفاتورة الرسمية"
                            onClick={() => openInvoice(o)}
                            aria-label={`فاتورة الطلب ${o.order_no}`}
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            className="btn btn--icon"
                            title="حذف الطلب"
                            onClick={() => handleDelete(o.id)}
                            style={{ color: 'var(--danger, #ef4444)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Kanban View */
            <div className="kanban-board">
              {KANBAN_COLUMNS.map(col => {
                const colOrders = data?.rows.filter(o => col.statuses.includes(o.status)) || [];
                return (
                  <div key={col.id} className="kanban-col">
                    <div className="kanban-col__header" style={{ borderTopColor: col.color }}>
                      <span className="kanban-col__title">{col.title}</span>
                      <span className="badge">{colOrders.length}</span>
                    </div>
                    <div className="kanban-col__cards">
                      {colOrders.map(o => (
                        <div key={o.id} className="kanban-card">
                          <div className="kanban-card__top">
                            <code className="order-no">{o.order_no}</code>
                            <PaymentStatusBadge status={o.payment_status || 'pending_approval'} />
                          </div>
                          <div className="kanban-card__client">{o.client_name}</div>
                          <div className="kanban-card__type muted" style={{ fontSize: 12 }}>
                            {o.package_title ?? o.service_title ?? o.project_type ?? '—'}
                          </div>
                          
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            <button
                              className="btn btn--sm btn--outline"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => setReviewOrder(o)}
                            >
                              ⚙️ مراجعة الطابور
                            </button>
                            <button
                              className="btn btn--sm"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => setPaymentOrder(o)}
                            >
                              💰 {o.paid_amount ? `${o.paid_amount} ج.م` : 'تعديل السداد'}
                            </button>
                            <button
                              className="btn btn--sm"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => openInvoice(o)}
                              title="عرض وطباعة الفاتورة"
                            >
                              📄 فاتورة
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!data?.rows.length && !loading && (
            <div className="empty">لا توجد طلبات تطابق البحث.</div>
          )}

          {/* Pagination (for table mode) */}
          {viewMode === 'table' && data && data.total > 25 && (
            <div className="pagination">
              <button className="btn" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(search, status, p); }}>
                السابق
              </button>
              <span className="muted">صفحة {page} من {Math.ceil(data.total / 25)}</span>
              <button className="btn" disabled={page >= Math.ceil(data.total / 25)} onClick={() => { const p = page + 1; setPage(p); load(search, status, p); }}>
                التالي
              </button>
            </div>
          )}
        </>
      )}

      {/* Queue & Payment Review Modal */}
      {reviewOrder && (
        <QueueReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onUpdated={() => {
            setReviewOrder(null);
            load();
            onToast('تم تحديث حالة الطابور والدفع للطلب بنجاح 🚀', 'success');
          }}
        />
      )}

      {/* Payment Edit Modal */}
      {paymentOrder && (
        <PaymentEditModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onSaved={(id, b, p) => {
            setData(prev => prev ? {
              ...prev,
              rows: prev.rows.map(x => x.id === id ? { ...x, budget: b, paid_amount: p } : x),
            } : prev);
            onToast('تم تحديث بيانات الميزانية والدفعة المسددة', 'success');
          }}
        />
      )}

      {/* Official Printable Invoice Modal */}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder as any}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved_for_payment':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
          <CheckCircle2 size={12} /> معتمد للدفع
        </span>
      );
    case 'paid':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
          <DollarSign size={12} /> تم الدفع بنجاح
        </span>
      );
    case 'waitlist':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
          <Clock size={12} /> قائمة انتظار
        </span>
      );
    case 'rejected':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
          <ShieldAlert size={12} /> معتذر عنه
        </span>
      );
    case 'pending_approval':
    default:
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
          <Clock size={12} /> قيد المراجعة
        </span>
      );
  }
}

// ─── Queue & Payment Review Modal ──────────────────────────────────────────────
interface QueueReviewModalProps {
  order:   Order;
  onClose: () => void;
  onUpdated: () => void;
}

function QueueReviewModal({ order, onClose, onUpdated }: QueueReviewModalProps) {
  const origPrice = Number(order.package_price) > 0 ? Number(order.package_price) : (Number(order.budget) > 0 ? Number(order.budget) : 0);
  let discAmount = 0;
  if (order.promo_code && order.promo_discount) {
    const discountStr = String(order.promo_discount).trim();
    if (discountStr.includes('%')) {
      const pct = parseFloat(discountStr.replace('%', '')) || 0;
      discAmount = (origPrice * pct) / 100;
    } else {
      discAmount = parseFloat(discountStr.replace(/[^\d.]/g, '')) || 0;
    }
  }
  const agreedBudget = origPrice > 0 ? Math.max(0, origPrice - discAmount) : (Number(order.budget) || 0);

  const [amount,  setAmount]  = useState(String(order.payment_amount || agreedBudget || ''));
  const [notes,   setNotes]   = useState(order.review_notes || '');
  const [action,  setAction]  = useState<'approve' | 'waitlist' | 'reject'>('approve');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (action === 'approve') {
        const val = Number(amount) || 0;
        if (val <= 0) throw new Error('يرجى تحديد المبلغ المطلوب سداده من العميل');
        await api.admin.approvePayment(order.id, { amount: val, notes });
      } else if (action === 'waitlist') {
        await api.admin.updateQueueStatus(order.id, { status: 'waitlist', notes });
      } else if (action === 'reject') {
        await api.admin.updateQueueStatus(order.id, { status: 'rejected', notes });
      }
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء معالجة الطلب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`مراجعة طابور الطلب #${order.order_no}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-stack">
        <div style={{ background: 'var(--bg-3)', padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 1.8 }}>
          <div><strong>العميل:</strong> {order.client_name} ({order.client_phone})</div>
          <div><strong>نوع الخدمة / الباقة:</strong> {order.package_title || order.service_title || order.project_type || 'طلب مخصص'}</div>
          {origPrice > 0 && <div><strong>السعر الأساسي:</strong> {money(origPrice)}</div>}
          {order.promo_code && (
            <div style={{ color: '#22c55e', fontWeight: 600 }}>
              🎁 <strong>كوبون الخصم المستخدم:</strong> {order.promo_code} ({order.promo_discount}) {discAmount > 0 ? `(-${money(discAmount)})` : ''}
            </div>
          )}
          {agreedBudget > 0 && <div><strong>إجمالي الميزانية الصافية المتفق عليها:</strong> <strong style={{ color: 'var(--accent)' }}>{money(agreedBudget)}</strong></div>}
          {order.paid_amount != null && order.paid_amount > 0 && (
            <div style={{ color: '#10b981' }}><strong>المدفوع مسبقاً:</strong> {money(order.paid_amount)}</div>
          )}
          {order.notes && <div style={{ marginTop: 6, color: 'var(--text-muted)' }}><strong>ملاحظات العميل:</strong> <em>{order.notes}</em></div>}
        </div>

        <div className="form-field">
          <label className="form-label">قرار الإدارة بخصوص الطلب والطابور</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              type="button"
              className={`btn ${action === 'approve' ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setAction('approve')}
              style={{ fontSize: 12, padding: '8px 4px' }}
            >
              🟢 الموافقة وفتح الدفع
            </button>
            <button
              type="button"
              className={`btn ${action === 'waitlist' ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setAction('waitlist')}
              style={{ fontSize: 12, padding: '8px 4px' }}
            >
              🟡 قائمة الانتظار
            </button>
            <button
              type="button"
              className={`btn ${action === 'reject' ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setAction('reject')}
              style={{ fontSize: 12, padding: '8px 4px' }}
            >
              🔴 اعتذار لعدم توافر موعد
            </button>
          </div>
        </div>

        {action === 'approve' && (
          <div className="form-field">
            <label className="form-label">المبلغ المطلوب سداده (جنيه مصري)</label>
            <input
              className="input"
              type="number"
              min="1"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="مثال: 5000"
            />
            <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              سيتمكن العميل من دفع هذا المبلغ فورًا عبر فودافون كاش، فيزا/ميزة، أو انستاباي.
            </span>
          </div>
        )}

        <div className="form-field">
          <label className="form-label">رسالة أو ملاحظات تظهر للعميل في صفحة التتبع والإيميل</label>
          <textarea
            className="textarea"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={
              action === 'approve'
                ? 'تمت مراجعة الطلب والموافقة على الموعد، يرجى إتمام الدفع لبدء العمل فورًا.'
                : action === 'waitlist'
                ? 'نعتذر عن الضغط الحالي، تم وضعك في قائمة الانتظار والموعد المتوقع للبدء هو...'
                : 'نعتذر لعدم توافر مواعيد شاغرة في الوقت الحالي...'
            }
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button type="submit" className="btn btn--primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? 'جارٍ الحفظ...' : 'تأكيد القرار وإشعار العميل فورًا'}
          </button>
          <button type="button" className="btn" onClick={onClose} disabled={loading}>
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Payment Edit Modal ────────────────────────────────────────────────────────
interface PaymentEditModalProps {
  order:   Order;
  onClose: () => void;
  onSaved: (id: number, budget: number, paid: number) => void;
}

function PaymentEditModal({ order, onClose, onSaved }: PaymentEditModalProps) {
  const [budget,  setBudget]  = useState(String(order.budget || 0));
  const [paid,    setPaid]    = useState(String(order.paid_amount || 0));
  const [loading, setLoading] = useState(false);

  const budgetNum  = Math.max(0, Number(budget) || 0);
  const paidNum    = Math.max(0, Number(paid) || 0);
  const remaining  = Math.max(0, budgetNum - paidNum);
  const isOverpaid = paidNum > budgetNum && budgetNum > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverpaid) { alert('المبلغ المسدد لا يمكن أن يتجاوز الميزانية الإجمالية'); return; }
    setLoading(true);
    try {
      const b = budgetNum;
      const p = paidNum;
      await api.admin.updateOrder(order.id, { budget: b, paid_amount: p });
      onSaved(order.id, b, p);
      onClose();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`سداد وميزانية الطلب ${order.order_no}`} onClose={onClose}>
      <form onSubmit={handleSave} className="form-stack">
        <div className="form-field">
          <label className="form-label">الميزانية الإجمالية المتفق عليها (جنيه)</label>
          <input
            className="input"
            type="number"
            min="0"
            required
            value={budget}
            onChange={e => setBudget(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label className="form-label">المبلغ المسدد حتى الآن (دفعة مقدمة / بالكامل)</label>
          <input
            className="input"
            type="number"
            min="0"
            required
            value={paid}
            onChange={e => setPaid(e.target.value)}
          />
        </div>

        <div style={{ background: 'var(--bg-3)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="muted">المتبقي للسداد:</span>
          <strong style={{ color: remaining > 0 ? 'var(--accent)' : '#22c55e', fontSize: 15 }}>
            {remaining > 0 ? money(remaining) : '0 ج.م ✔ مكتمل'}
          </strong>
        </div>

        {order.payment_receipt && (
          <div style={{ marginTop: 8 }}>
            <a
              href={`/uploads/${order.payment_receipt}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--sm"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 6 }}
            >
              <Paperclip size={14} /> معاينة إيصال التحويل المرفوع من العميل
            </a>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button type="submit" className="btn btn--primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? 'جارٍ الحفظ...' : 'حفظ بيانات السداد'}
          </button>
          <button
            type="button"
            className="btn btn--sm"
            style={{ color: '#10b981', borderColor: '#10b981' }}
            onClick={() => setPaid(String(budgetNum))}
            title="تعيين كامل المبلغ كمدفوع"
          >
            مسدد بالكامل
          </button>
        </div>
      </form>
    </Modal>
  );
}
