import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Download, FileText, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money, formatDate, debounce, downloadUrl } from '../../lib/utils.js';
import { ORDER_STATUS_LABELS, type Order, type OrderStatus, type Paginated } from '../../types.js';
import { TableSkeleton } from '../ui/Skeleton.js';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'جميع الحالات' },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

interface OrdersProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function Orders({ onToast }: OrdersProps) {
  const [data,    setData]    = useState<Paginated<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('all');
  const [page,    setPage]    = useState(1);

  const load = useCallback(async (s = search, st = status, p = page) => {
    setLoading(true);
    try {
      const res = await api.admin.orders({ page: p, limit: 25, search: s || undefined, status: st });
      setData(res);
    } catch (e) {
      onToast((e as Error).message, 'error');
    } finally { setLoading(false); }
  }, [search, status, page, onToast]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((val: string, st: string) => { setPage(1); loadRef.current(val, st, 1); }, 400),
    [],
  );

  const handleSearch = (val: string) => { setSearch(val); debouncedSearch(val, status); };
  const handleStatus = (val: string) => { setStatus(val); setPage(1); load(search, val, 1); };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await api.admin.updateOrder(id, { status: newStatus });
      await load();
      onToast('تم تحديث الحالة', 'success');
    } catch (e) { onToast((e as Error).message, 'error'); }
  };

  const exportCSV = () => downloadUrl(api.admin.exportOrdersUrl(), `orders-${new Date().toISOString().slice(0,10)}.csv`);
  const openInvoice = (id: number) => window.open(api.admin.invoiceUrl(id), '_blank', 'noopener');

  return (
    <div className="card">
      {/* Toolbar */}
      <div className="toolbar">
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
        <div className="toolbar__filters">
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

      {/* Table */}
      {loading ? <TableSkeleton rows={5} cols={6} /> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>الباقة / الخدمة</th>
                  <th>الحالة</th>
                  <th>الميزانية</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map(o => (
                  <tr key={o.id}>
                    <td><code className="order-no">{o.order_no}</code></td>
                    <td>
                      <div>{o.client_name}</div>
                      <div className="muted">{o.client_phone}</div>
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
                    <td>{o.budget ? money(o.budget) : '—'}</td>
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

          {/* Empty state */}
          {!data?.rows.length && !loading && (
            <div className="empty">لا توجد طلبات تطابق البحث.</div>
          )}

          {/* Pagination */}
          {data && data.total > 25 && (
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
    </div>
  );
}
