import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';
import type { ActivityLogEntry, Paginated } from '../../types.js';
import { TableSkeleton } from '../ui/Skeleton.js';

interface ActivityLogProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'إنشاء', update: 'تعديل', delete: 'حذف',
  upload: 'رفع ملف', change_password: 'تغيير كلمة المرور',
};

export function ActivityLog({ onToast }: ActivityLogProps) {
  const [data,    setData]    = useState<Paginated<ActivityLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await api.admin.activity({ page: p });
      setData(res);
    } catch (e) { onToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [page, onToast]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card">
      {loading ? <TableSkeleton rows={8} cols={5} /> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الإجراء</th>
                  <th>الكيان</th>
                  <th>المعرّف</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map(a => (
                  <tr key={a.id}>
                    <td>{a.username ?? 'عام'}</td>
                    <td><span className="action-badge">{ACTION_LABELS[a.action] ?? a.action}</span></td>
                    <td className="muted">{a.entity}</td>
                    <td className="muted">{a.entity_id ?? '—'}</td>
                    <td className="muted">{formatDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data?.rows.length && <div className="empty">لا يوجد نشاط مسجل.</div>}
          {data && data.total > 50 && (
            <div className="pagination">
              <button className="btn" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }}>السابق</button>
              <span className="muted">صفحة {page} من {Math.ceil(data.total / 50)}</span>
              <button className="btn" disabled={page >= Math.ceil(data.total / 50)} onClick={() => { const p = page + 1; setPage(p); load(p); }}>التالي</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
