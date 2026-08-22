import { useState, useEffect, useCallback } from 'react';
import { Search, Download, FileText, LayoutGrid, List, MessageSquare, Phone, DollarSign, Paperclip } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money, formatDate, debounce, downloadUrl, waLink } from '../../lib/utils.js';
import { ORDER_STATUS_LABELS, type Order, type OrderStatus, type Paginated } from '../../types.js';
import { TableSkeleton } from '../ui/Skeleton.js';
import { Modal } from '../ui/Modal.js';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'جميع الحالات' },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const KANBAN_COLUMNS: Array<{ id: string; title: string; color: string; statuses: string[] }> = [
  { id: 'new',         title: 'طلبات جديدة',            color: '#888',     statuses: ['new'] },
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
      await api.admin.updateOrder(id, { status: newStatus });
      onToast('تم تحديث الحالة', 'success');
    } catch (e) {
      onToast((e as Error).message, 'error');
      await load();
    }
  };

  const exportCSV = () => downloadUrl(api.admin.exportOrdersUrl(), `orders-${new Date().toISOString().slice(0,10)}.csv`);
  const openInvoice = (id: number) => window.open(api.admin.invoiceUrl(id), '_blank', 'noopener');

  const getClientWhatsAppUrl = (order: Order) => {
    const cleanPhone = (order.client_phone || '').replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    const msg = `مرحباً ${order.client_name}، بخصوص طلبك (${order.order_no}) لدى استوديو PREMIRALAB: حالة طلبك الآن هي: ${ORDER_STATUS_LABELS[order.status] || order.status}.`;
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
                    <th>الحالة</th>
                    <th>الميزانية والسداد</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows.map(o => (
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
                        {o.paid_amount != null && o.paid_amount > 0 && (
                          <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                            مسدد: {money(o.paid_amount)}
                          </div>
                        )}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn btn--icon"
                          title="فتح الفاتورة"
                          onClick={() => openInvoice(o.id)}
                          aria-label={`فاتورة الطلب ${o.order_no}`}
                        >
                          <FileText size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Kanban Board View */
            <div className="kanban-board">
              {KANBAN_COLUMNS.map(col => {
                const colOrders = (data?.rows ?? []).filter(o => col.statuses.includes(o.status));
                return (
                  <div className="kanban-column" key={col.id}>
                    <div className="kanban-column__head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                        <span>{col.title}</span>
                      </div>
                      <span className="kanban-column__count">{colOrders.length}</span>
                    </div>

                    <div className="kanban-cards">
                      {colOrders.map(o => (
                        <div className="kanban-card" key={o.id}>
                          <div className="kanban-card__top">
                            <code className="order-no" style={{ fontSize: 11 }}>{o.order_no}</code>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn btn--icon btn--sm"
                                title="تعديل الميزانية والدفعة المسددة"
                                onClick={() => setPaymentOrder(o)}
                              >
                                <DollarSign size={13} />
                              </button>
                              <button
                                className="btn btn--icon btn--sm"
                                title="فاتورة"
                                onClick={() => openInvoice(o.id)}
                              >
                                <FileText size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="kanban-card__title">{o.client_name}</div>

                          <div className="muted" style={{ fontSize: 12 }}>
                            {o.package_title ?? o.service_title ?? o.project_type ?? 'طلب مخصص'}
                          </div>

                          <div className="kanban-card__meta">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                {o.budget ? money(o.budget) : '—'}
                              </span>
                              {o.payment_receipt && (
                                <a
                                  href={`/uploads/${o.payment_receipt}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn--icon btn--sm"
                                  style={{ color: '#22c55e', padding: 2 }}
                                  title="إيصال التحويل المرفوع"
                                >
                                  <Paperclip size={12} />
                                </a>
                              )}
                            </div>
                            <span style={{ fontSize: 11 }}>{formatDate(o.created_at)}</span>
                          </div>

                          {o.paid_amount != null && o.paid_amount > 0 && (
                            <div style={{ fontSize: 11, color: '#10b981', display: 'flex', justifyContent: 'space-between' }}>
                              <span>المسدد: {money(o.paid_amount)}</span>
                              <span>المتبقي: {money(Math.max(0, (o.budget || 0) - o.paid_amount))}</span>
                            </div>
                          )}

                          <div className="kanban-card__actions">
                            <div style={{ display: 'flex', gap: 6 }}>
                              <a
                                href={getClientWhatsAppUrl(o)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn--icon btn--sm"
                                style={{ color: '#25D366' }}
                                title="واتساب"
                              >
                                <MessageSquare size={13} />
                              </a>
                              <a
                                href={`tel:${o.client_phone}`}
                                className="btn btn--icon btn--sm"
                                style={{ color: 'var(--text-muted)' }}
                                title="اتصال"
                              >
                                <Phone size={13} />
                              </a>
                            </div>

                            <select
                              className="select select--compact"
                              style={{ fontSize: 11, padding: '3px 8px', width: 'auto' }}
                              value={o.status}
                              onChange={e => updateStatus(o.id, e.target.value)}
                            >
                              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}

                      {colOrders.length === 0 && (
                        <div className="empty" style={{ padding: 14, fontSize: 12 }}>
                          لا توجد طلبات
                        </div>
                      )}
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
    </div>
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const b = Number(budget) || 0;
      const p = Number(paid) || 0;
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

        <div style={{ background: 'var(--bg-3)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span className="muted">المتبقي للسداد:</span>
          <strong style={{ color: 'var(--accent)' }}>
            {money(Math.max(0, (Number(budget) || 0) - (Number(paid) || 0)))}
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
            onClick={() => setPaid(budget)}
            title="تعيين كامل المبلغ كمدفوع"
          >
            مسدد بالكامل
          </button>
        </div>
      </form>
    </Modal>
  );
}
