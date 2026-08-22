import { money, formatDate } from '../../lib/utils.js';
import { ORDER_STATUS_LABELS } from '../../types.js';
import type { Analytics } from '../../types.js';

interface DashboardProps { analytics: Analytics; }

export function Dashboard({ analytics: a }: DashboardProps) {
  return (
    <div className="dashboard">
      {/* Stat cards */}
      <div className="stats">
        <StatCard label="إجمالي الطلبات"     value={String(a.total    ?? 0)} />
        <StatCard label="العملاء"             value={String(a.clients  ?? 0)} />
        <StatCard label="المشاريع النشطة"    value={String(a.active   ?? 0)} />
        <StatCard label="إيرادات مكتملة"     value={money(a.revenue   ?? 0)} />
      </div>

      <div className="dashboard-grid">
        {/* Status breakdown */}
        <div className="card">
          <h3 className="card-title">توزيع الطلبات حسب الحالة</h3>
          {a.byStatus?.length ? (
            <div className="status-list">
              {a.byStatus.map(x => {
                const pct = a.total ? Math.round((x.count / a.total) * 100) : 0;
                return (
                  <div key={x.status} className="status-row">
                    <span className="status-row__label">{ORDER_STATUS_LABELS[x.status] ?? x.status}</span>
                    <div className="status-row__bar-wrap">
                      <div className="status-row__bar" style={{ width: `${pct}%` }} />
                    </div>
                    <b className="status-row__count">{x.count}</b>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">لا توجد طلبات بعد.</div>
          )}
        </div>

        {/* Recent orders */}
        <div className="card">
          <h3 className="card-title">آخر الطلبات</h3>
          {a.recent?.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {a.recent.map(r => (
                  <tr key={r.order_no}>
                    <td><code>{r.order_no}</code></td>
                    <td>{r.client_name}</td>
                    <td><span className="status-badge">{ORDER_STATUS_LABELS[r.status] ?? r.status}</span></td>
                    <td className="muted">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">لا توجد طلبات بعد.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <strong className="stat__value">{value}</strong>
    </div>
  );
}
