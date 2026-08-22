import { Router } from 'express';
import { db } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';

const router = Router();

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'جديد', contacted: 'تم التواصل', approved: 'معتمد',
  payment_pending: 'بانتظار الدفع', paid: 'مدفوع', in_progress: 'قيد التنفيذ',
  review: 'مراجعة', revisions: 'تعديلات', completed: 'مكتمل', cancelled: 'ملغى',
};

function escapeCsvCell(val: unknown): string {
  if (val == null) return '""';
  let str = String(val);
  // Prevent CSV Formula Injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

// GET /api/admin/export/orders  → CSV
router.get('/orders', auth, admin, (_req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT o.order_no, o.status, o.budget, o.project_type, o.deadline, o.notes, o.created_at,
             c.name client_name, c.phone client_phone, c.email client_email,
             p.title package_title, s.title service_title
      FROM orders o
      JOIN clients c ON c.id=o.client_id
      LEFT JOIN packages p ON p.id=o.package_id
      LEFT JOIN services s ON s.id=o.service_id
      ORDER BY o.id DESC
    `).all() as Record<string, unknown>[];

    const headers = ['رقم الطلب', 'العميل', 'الهاتف', 'البريد', 'الباقة/الخدمة', 'نوع المشروع', 'الحالة', 'الميزانية', 'الموعد', 'تاريخ الطلب', 'ملاحظات'];
    const csvRows = rows.map(r => [
      r.order_no, r.client_name, r.client_phone, r.client_email,
      r.package_title || r.service_title || '',
      r.project_type,
      ORDER_STATUS_LABELS[r.status as string] || r.status,
      r.budget ?? '',
      r.deadline ?? '',
      r.created_at,
      String(r.notes || '').replace(/\n/g, ' '),
    ].map(escapeCsvCell).join(','));

    const csv = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n'); // BOM for Excel Arabic support
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
    res.send(csv);
  } catch (err) { next(err); }
});

// GET /api/admin/export/clients → CSV
router.get('/clients', auth, admin, (_req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT c.name, c.phone, c.email, c.created_at, COUNT(o.id) orders_count
      FROM clients c LEFT JOIN orders o ON o.client_id=c.id
      GROUP BY c.id ORDER BY c.id DESC
    `).all() as Record<string, unknown>[];

    const headers = ['الاسم', 'الهاتف', 'البريد', 'عدد الطلبات', 'تاريخ الإنشاء'];
    const csvRows = rows.map(r => [r.name, r.phone, r.email, r.orders_count, r.created_at]
      .map(escapeCsvCell).join(','));

    const csv = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
    res.send(csv);
  } catch (err) { next(err); }
});

// GET /api/admin/activity?page=1&limit=50
const handleActivity = (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  try {
    const page   = Math.max(1, Number(req.query.page)  || 1);
    const limit  = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const total  = (db.prepare('SELECT COUNT(*) n FROM activity_log').get() as { n: number }).n;
    const rows   = db.prepare(`
      SELECT a.*,u.username FROM activity_log a
      LEFT JOIN users u ON u.id=a.user_id
      ORDER BY a.id DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    res.json({ rows, total, page, limit });
  } catch (err) { next(err); }
};

router.get('/', auth, admin, handleActivity);
router.get('/activity', auth, admin, handleActivity);

export default router;
