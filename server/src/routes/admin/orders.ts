import { Router } from 'express';
import { z } from 'zod';
import { db, now } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import type { AuthRequest, OrderRow, SiteSettings } from '../../types.js';

const router = Router();

// GET /api/admin/orders?page=1&limit=50&status=new&search=...
router.get('/', auth, admin, (req, res, next) => {
  try {
    const page   = Math.max(1, Number(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    let where = '';
    const params: unknown[] = [];

    const conditions: string[] = [];
    if (status && status !== 'all') {
      conditions.push('o.status=?');
      params.push(status);
    }
    if (search) {
      conditions.push('(c.name LIKE ? OR c.phone LIKE ? OR o.order_no LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (conditions.length) where = `WHERE ${conditions.join(' AND ')}`;

    const baseQuery = `
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      LEFT JOIN packages p ON p.id = o.package_id
      LEFT JOIN services s ON s.id = o.service_id
      ${where}
    `;

    const total = (db.prepare(`SELECT COUNT(*) n ${baseQuery}`).get(...params) as { n: number }).n;
    const rows  = db.prepare(`SELECT o.*,c.name client_name,c.phone client_phone,c.email client_email,p.title package_title,s.title service_title ${baseQuery} ORDER BY o.id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as OrderRow[];

    res.json({ rows, total, page, limit });
  } catch (err) { next(err); }
});

// PATCH /api/admin/orders/:id — update status (and optionally project progress)
router.patch('/:id', auth, admin, async (req: AuthRequest, res, next) => {
  try {
    const patchSchema = z.object({
      status:   z.string().min(2).max(50).optional(),
      progress: z.number().int().min(0).max(100).optional(),
    });
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid update data' });
      return;
    }
    const id = Number(req.params.id);
    const d  = parsed.data;

    if (d.status) {
      db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(d.status, now(), id);
    }
    if (d.progress !== undefined) {
      db.prepare('UPDATE projects SET progress=?,updated_at=? WHERE order_id=?').run(d.progress, now(), id);
    }

    // Return fresh data (FIX: was returning stale record fetched before update)
    const updated = db.prepare(`
      SELECT o.*,c.name client_name,c.phone client_phone,c.email client_email,p.title package_title,s.title service_title
      FROM orders o
      JOIN clients c ON c.id=o.client_id
      LEFT JOIN packages p ON p.id=o.package_id
      LEFT JOIN services s ON s.id=o.service_id
      WHERE o.id=?
    `).get(id) as OrderRow;
    if (!updated) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    audit(req, 'update', 'orders', id, d as Record<string, unknown>);
    res.json(updated);
  } catch (err) { next(err); }
});

function escapeHtml(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// GET /api/admin/orders/:id/invoice — HTML invoice for printing/saving as PDF
router.get('/:id/invoice', auth, admin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const order = db.prepare(`
      SELECT o.*,c.name client_name,c.phone client_phone,c.email client_email,p.title package_title,s.title service_title
      FROM orders o
      JOIN clients c ON c.id=o.client_id
      LEFT JOIN packages p ON p.id=o.package_id
      LEFT JOIN services s ON s.id=o.service_id
      WHERE o.id=?
    `).get(id) as OrderRow | undefined;

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const siteRow = db.prepare("SELECT value FROM settings WHERE key='site'").get() as { value: string } | undefined;
    let site: SiteSettings = {};
    if (siteRow?.value) {
      try { site = JSON.parse(siteRow.value); } catch { /* ignore */ }
    }

    const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const formatMoney = (n: number | null) => n != null
      ? new Intl.NumberFormat('ar-EG', { style: 'currency', currency: site.currency || 'EGP', maximumFractionDigits: 0 }).format(n)
      : '—';

    const statusLabels: Record<string, string> = {
      new: 'جديد', contacted: 'تم التواصل', approved: 'معتمد', payment_pending: 'بانتظار الدفع',
      paid: 'مدفوع', in_progress: 'قيد التنفيذ', review: 'مراجعة', revisions: 'تعديلات',
      completed: 'مكتمل', cancelled: 'ملغى',
    };

    const safeOrderNo = escapeHtml(order.order_no);
    const safeBrand = escapeHtml(site.brand || 'Design Studio');
    const safeEmail = escapeHtml(site.email || '');
    const safePhone = escapeHtml(site.phone || '');
    const safeStatus = escapeHtml(statusLabels[order.status] || order.status);
    const safeClientName = escapeHtml(order.client_name);
    const safeClientPhone = escapeHtml(order.client_phone);
    const safeClientEmail = escapeHtml(order.client_email || '—');
    const safeItemTitle = escapeHtml(order.package_title || order.service_title || order.project_type || 'خدمة تصميم');
    const safeDeadline = order.deadline ? escapeHtml(formatDate(order.deadline)) : '—';
    const safeNotes = order.notes ? escapeHtml(order.notes).replace(/\n/g, '<br/>') : '';

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>فاتورة ${safeOrderNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { font-family: Cairo, Arial, sans-serif; color: #111; background: #fff; padding: 40px }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #cd45cd; padding-bottom: 20px }
    .brand { font-size: 26px; font-weight: 800; color: #cd45cd }
    .brand p { font-size: 13px; color: #666; font-weight: 400; margin-top: 4px }
    h2 { font-size: 20px; margin-bottom: 16px; color: #333 }
    .badge { display: inline-block; background: #cd45cd18; color: #cd45cd; border: 1px solid #cd45cd44; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 700 }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px }
    .section { background: #f9f9fb; border-radius: 12px; padding: 20px }
    .section label { font-size: 11px; color: #999; display: block; margin-top: 10px }
    .section span { font-weight: 600; display: block }
    table { width: 100%; border-collapse: collapse; margin-top: 20px }
    th { text-align: right; padding: 10px 14px; background: #f0f0f5; font-size: 13px }
    td { padding: 10px 14px; border-bottom: 1px solid #eee }
    .total { font-size: 22px; font-weight: 800; color: #cd45cd; text-align: left }
    .footer { margin-top: 40px; text-align: center; color: #aaa; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px }
    @media print { body { padding: 0 } }
    .print-btn { position: fixed; top: 20px; left: 20px; background: #cd45cd; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: Cairo, sans-serif; font-size: 14px; font-weight: 700 }
    @media print { .print-btn { display: none } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <div class="header">
    <div class="brand">${safeBrand}<p>${safeEmail} · ${safePhone}</p></div>
    <div style="text-align:left">
      <div style="font-size:28px;font-weight:800;color:#111">${safeOrderNo}</div>
      <div class="badge">${safeStatus}</div>
      <div style="font-size:13px;color:#888;margin-top:6px">${formatDate(order.created_at)}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="section">
      <h2>بيانات العميل</h2>
      <label>الاسم</label><span>${safeClientName}</span>
      <label>الهاتف</label><span>${safeClientPhone}</span>
      <label>البريد</label><span>${safeClientEmail}</span>
    </div>
    <div class="section">
      <h2>تفاصيل الطلب</h2>
      <label>الخدمة / الباقة</label><span>${safeItemTitle}</span>
      <label>الموعد النهائي</label><span>${safeDeadline}</span>
      <label>الحالة</label><span>${safeStatus}</span>
    </div>
  </div>

  ${safeNotes ? `<div class="section" style="margin-bottom:30px"><h2>ملاحظات</h2><p style="margin-top:10px;line-height:1.8">${safeNotes}</p></div>` : ''}

  <table>
    <thead><tr><th>البند</th><th>المبلغ</th></tr></thead>
    <tbody>
      <tr>
        <td>${safeItemTitle}</td>
        <td class="total">${formatMoney(order.budget)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">تم إنشاء هذه الفاتورة تلقائياً عبر منصة ${safeBrand}.</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) { next(err); }
});

export default router;
