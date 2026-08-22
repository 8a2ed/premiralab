import { useState, useEffect, useCallback } from 'react';
import { Search, Download, MessageSquare, Phone } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate, debounce, downloadUrl, waLink } from '../../lib/utils.js';
import type { Client, Paginated } from '../../types.js';
import { TableSkeleton } from '../ui/Skeleton.js';

interface ClientsProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function Clients({ onToast }: ClientsProps) {
  const [data,    setData]    = useState<Paginated<Client> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);

  const load = useCallback(async (s = search, p = page) => {
    setLoading(true);
    try {
      const res = await api.admin.clients({ page: p, search: s || undefined });
      setData(res);
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [search, page, onToast]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedSearch = useCallback(
    debounce((val: unknown) => { setPage(1); load(val as string, 1); }, 400),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleSearch = (val: string) => { setSearch(val); debouncedSearch(val); };
  const exportCSV = () => downloadUrl(api.admin.exportClientsUrl(), `clients-${new Date().toISOString().slice(0,10)}.csv`);

  const getClientWa = (phone: string, name: string) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    const msg = `مرحباً ${name}، نتواصل معك من استوديو PREMIRALAB.`;
    return waLink(intlPhone, msg);
  };

  return (
    <div className="card">
      <div className="toolbar">
        <div className="toolbar__search">
          <Search size={16} className="toolbar__search-icon" aria-hidden />
          <input
            className="input toolbar__input"
            placeholder="بحث بالاسم، الهاتف، أو البريد..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            aria-label="بحث في العملاء"
          />
        </div>
        <button className="btn" onClick={exportCSV}>
          <Download size={15} /> تصدير CSV
        </button>
      </div>

      {loading ? <TableSkeleton rows={5} cols={5} /> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>البريد الإلكتروني</th>
                  <th>عدد الطلبات</th>
                  <th>تاريخ الإنضمام</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{c.phone}</span>
                        <a
                          href={getClientWa(c.phone, c.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--icon btn--sm"
                          style={{ color: '#25D366', padding: 2 }}
                          title="مراسلة عبر واتساب"
                        >
                          <MessageSquare size={13} />
                        </a>
                        <a
                          href={`tel:${c.phone}`}
                          className="btn btn--icon btn--sm"
                          style={{ color: 'var(--text-muted)', padding: 2 }}
                          title="اتصال هاتفي"
                        >
                          <Phone size={13} />
                        </a>
                      </div>
                    </td>
                    <td>{c.email ? <a href={`mailto:${c.email}`} className="link">{c.email}</a> : '—'}</td>
                    <td><span className="badge badge--count">{c.orders_count}</span></td>
                    <td className="muted">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!data?.rows.length && <div className="empty">لا يوجد عملاء مطابقون.</div>}

          {data && data.total > 50 && (
            <div className="pagination">
              <button className="btn" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(search, p); }}>السابق</button>
              <span className="muted">صفحة {page} من {Math.ceil(data.total / 50)}</span>
              <button className="btn" disabled={page >= Math.ceil(data.total / 50)} onClick={() => { const p = page + 1; setPage(p); load(search, p); }}>التالي</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
