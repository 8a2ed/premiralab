import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate, debounce, downloadUrl } from '../../lib/utils.js';
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

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedSearch = useMemo(
    () => debounce((val: string) => { setPage(1); loadRef.current(val, 1); }, 400),
    [],
  );

  const handleSearch = (val: string) => { setSearch(val); debouncedSearch(val); };
  const exportCSV = () => downloadUrl(api.admin.exportClientsUrl(), `clients-${new Date().toISOString().slice(0,10)}.csv`);

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
                    <td><a href={`tel:${c.phone}`} className="link">{c.phone}</a></td>
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
