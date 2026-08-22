import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';
import type { Notification } from '../../types.js';

const POLL_INTERVAL = 60_000; // 60 seconds

interface NotificationBellProps {
  onUnreadChange: (count: number) => void;
}

export function NotificationBell({ onUnreadChange }: NotificationBellProps) {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState<Notification[]>([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef              = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const data = await api.admin.notifications();
      setNotifs(data.rows);
      setUnread(data.unreadCount);
      onUnreadChange(data.unreadCount);
    } catch { /* silent — bell should never break the UI */ }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await api.admin.markAllRead();
      await fetchNotifs();
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const markOne = async (id: number) => {
    try {
      await api.admin.markRead(id);
      setNotifs(n => n.map(x => x.id === id ? { ...x, read: 1 } : x));
      setUnread(u => Math.max(0, u - 1));
      onUnreadChange(Math.max(0, unread - 1));
    } catch { /* silent */ }
  };

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        className="btn btn--icon"
        onClick={() => setOpen(o => !o)}
        aria-label={`الإشعارات${unread ? ` — ${unread} غير مقروء` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel" role="region" aria-label="الإشعارات">
          <div className="notification-panel__header">
            <strong>الإشعارات</strong>
            {unread > 0 && (
              <button className="link" onClick={markAllRead} disabled={loading}>
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          <div className="notification-panel__list">
            {notifs.length === 0 && (
              <div className="empty">لا توجد إشعارات</div>
            )}
            {notifs.map(n => (
              <div
                key={n.id}
                className={`notification-item ${!n.read ? 'notification-item--unread' : ''}`}
                onClick={() => !n.read && markOne(n.id)}
                role={!n.read ? 'button' : undefined}
                tabIndex={!n.read ? 0 : undefined}
              >
                <div className="notification-item__title">{n.title}</div>
                <div className="notification-item__body">{n.body}</div>
                <div className="notification-item__time">{formatDate(n.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
