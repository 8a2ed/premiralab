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
    let site: Partial<SiteSettings> = {};
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
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${safeOrderNo}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 24px; font-weight: 900; color: #111; }
    .brand p { font-size: 13px; color: #666; font-weight: 400; margin: 4px 0 0; }
    .badge { display: inline-block; padding: 4px 10px; background: #f3f4f6; border-radius: 4px; font-size: 12px; font-weight: 600; margin-top: 8px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .section h2 { font-size: 14px; color: #888; text-transform: uppercase; margin: 0 0 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .section label { display: block; font-size: 11px; color: #888; margin-bottom: 2px; }
    .section span { display: block; font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: right; padding: 12px; background: #f9fafb; font-size: 13px; color: #666; border-bottom: 2px solid #eee; }
    td { padding: 15px 12px; border-bottom: 1px solid #eee; font-size: 14px; font-weight: 500; }
    .total { text-align: left; font-weight: 800; font-size: 18px; color: #111; }
    .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; }
    .print-btn { position: fixed; bottom: 30px; right: 30px; background: #111; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">\u0637\u0628\u0627\u0639\u0629 / \u062D\u0641\u0638 PDF</button>
  <div class="header">
    <div class="brand">${safeBrand}<p>${safeEmail} • ${safePhone}</p></div>
    <div style="text-align:left">
      <div style="font-size:28px;font-weight:800;color:#111">${safeOrderNo}</div>
      <div class="badge">${safeStatus}</div>
      <div style="font-size:13px;color:#888;margin-top:6px">${formatDate(order.created_at)}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="section">
      <h2>\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u064A\u0644</h2>
      <label>\u0627\u0644\u0627\u0633\u0645</label><span>${safeClientName}</span>
      <label>\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641</label><span>${safeClientPhone}</span>
      <label>\u0627\u0644\u0628\u0631\u064A\u062F</label><span>${safeClientEmail}</span>
    </div>
    <div class="section">
      <h2>\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0637\u0644\u0628</h2>
      <label>\u0627\u0644\u062E\u062F\u0645\u0629 / \u0627\u0644\u0628\u0627\u0642\u0629</label><span>${safeItemTitle}</span>
      <label>\u0645\u0648\u0639\u062F \u0627\u0644\u062A\u0633\u0644\u064A\u0645</label><span>${safeDeadline}</span>
      <label>\u0627\u0644\u062D\u0627\u0644\u0629</label><span>${safeStatus}</span>
    </div>
  </div>

  ${safeNotes ? `<div class="section" style="margin-bottom:30px"><h2>\u0645\u0644\u0627\u062D\u0638\u0627\u062A</h2><p style="margin-top:10px;line-height:1.8">${safeNotes}</p></div>` : ''}

  <table>
    <thead><tr><th>\u0627\u0644\u0628\u0646\u062F</th><th style="text-align:left">\u0627\u0644\u0645\u0628\u0644\u063A</th></tr></thead>
    <tbody>
      <tr>
        <td>${safeItemTitle}</td>
        <td class="total">${formatMoney(order.budget)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">\u062A\u0645 \u0625\u0635\u062F\u0627\u0631 \u0647\u0630\u0647 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627 ${safeBrand}.</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) { next(err); }
});

export default router;
