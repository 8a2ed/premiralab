import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db, now } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import type { AuthRequest } from '../../types.js';

const router = Router();

// GET /api/admin/clients?search=&page=1&limit=50
router.get('/', auth, admin, (req, res, next) => {
  try {
    const page   = Math.max(1, Number(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    const conditions = search ? ['(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)'] : [];
    const params: unknown[] = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `FROM clients c LEFT JOIN orders o ON o.client_id = c.id ${where} GROUP BY c.id`;
    const total = (db.prepare(`SELECT COUNT(*) n FROM (SELECT c.id ${baseQuery})`).get(...params) as { n: number }).n;
    
    const rows = db.prepare(`
      SELECT 
        c.id, 
        c.name, 
        c.phone, 
        c.email, 
        c.created_at, 
        c.updated_at,
        CASE WHEN c.password_hash IS NOT NULL AND c.password_hash != '' THEN 1 ELSE 0 END AS has_password,
        COUNT(o.id) AS orders_count,
        COALESCE(SUM(o.paid_amount), 0) AS total_spent,
        SUM(CASE WHEN o.status IN ('new', 'approved', 'in_progress', 'review', 'revisions') THEN 1 ELSE 0 END) AS active_orders
      ${baseQuery} 
      ORDER BY c.id DESC 
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ rows, total, page, limit });
  } catch (err) { next(err); }
});

// GET /api/admin/clients/:id — Single client full details and order history
router.get('/:id', auth, admin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const client = db.prepare(`
      SELECT 
        c.id, 
        c.name, 
        c.phone, 
        c.email, 
        c.created_at, 
        c.updated_at,
        CASE WHEN c.password_hash IS NOT NULL AND c.password_hash != '' THEN 1 ELSE 0 END AS has_password
      FROM clients c 
      WHERE c.id = ?
    `).get(id) as any;

    if (!client) {
      res.status(404).json({ error: 'العميل غير موجود' });
      return;
    }

    // Orders for this client
    const orders = db.prepare(`
      SELECT o.*, p.title AS package_title, s.title AS service_title
      FROM orders o
      LEFT JOIN packages p ON p.id = o.package_id
      LEFT JOIN services s ON s.id = o.service_id
      WHERE o.client_id = ?
      ORDER BY o.id DESC
    `).all(id);

    // Financial totals
    let totalBudget = 0;
    let totalPaid = 0;
    for (const o of orders as any[]) {
      totalBudget += Number(o.budget) || 0;
      totalPaid += Number(o.paid_amount) || 0;
    }

    res.json({
      client,
      orders,
      stats: {
        totalOrders: orders.length,
        totalBudget,
        totalPaid,
        outstanding: Math.max(0, totalBudget - totalPaid),
      }
    });
  } catch (err) { next(err); }
});

// PATCH /api/admin/clients/:id — Update client details
router.patch('/:id', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      name:  z.string().trim().min(2).max(100).optional(),
      phone: z.string().trim().min(5).max(30).optional(),
      email: z.string().trim().email().optional().or(z.literal('')),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() });
      return;
    }

    const { name, phone, email } = parsed.data;
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'العميل غير موجود' });
      return;
    }

    const t = now();
    const updatedName = name ?? existing.name;
    const updatedPhone = phone ?? existing.phone;
    const updatedEmail = email !== undefined ? email.toLowerCase() : existing.email;

    db.prepare(`
      UPDATE clients 
      SET name = ?, phone = ?, email = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedName, updatedPhone, updatedEmail, t, id);

    audit(req, 'update', 'clients', id, { name: updatedName, phone: updatedPhone, email: updatedEmail });

    res.json({
      ok: true,
      message: 'تم تحديث بيانات العميل بنجاح',
      client: { id, name: updatedName, phone: updatedPhone, email: updatedEmail }
    });
  } catch (err) { next(err); }
});

// POST /api/admin/clients/:id/password — Set new custom password for client
router.patch('/:id/wallet', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const { balance, points } = req.body;
    
    if (typeof balance !== 'number' || balance < 0) return res.status(400).json({ error: 'الرصيد غير صالح' });
    if (typeof points !== 'number' || points < 0) return res.status(400).json({ error: 'النقاط غير صالحة' });
    
    const client = db.prepare('SELECT wallet_balance, points FROM clients WHERE id = ?').get(id) as any;
    if (!client) return res.status(404).json({ error: 'العميل غير موجود' });
    
    const diff = balance - (client.wallet_balance || 0);
    
    const tx = db.transaction(() => {
      db.prepare('UPDATE clients SET wallet_balance = ?, points = ?, updated_at = ? WHERE id = ?').run(balance, points, now(), id);
      
      if (diff !== 0) {
        const type = diff > 0 ? 'deposit' : 'withdrawal';
        const amount = Math.abs(diff);
        db.prepare('INSERT INTO wallet_transactions (client_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)').run(id, amount, type, 'تعديل إداري للرصيد', now());
      }
    });
    tx();
    
    audit(req, 'update_wallet', 'clients', id, { balance, points, diff });
    res.json({ ok: true, balance, points });
  } catch (err) { next(err); }
});

router.post('/:id/password', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      password: z.string().min(6, 'يجب ألا تقل كلمة المرور عن 6 أحرف'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'كلمة المرور غير صالحة' });
      return;
    }

    const client = db.prepare('SELECT id, name, email FROM clients WHERE id = ?').get(id) as any;
    if (!client) {
      res.status(404).json({ error: 'العميل غير موجود' });
      return;
    }

    const hash = bcrypt.hashSync(parsed.data.password, 10);
    const t = now();

    db.prepare(`
      UPDATE clients 
      SET password_hash = ?, reset_token = NULL, reset_expires = NULL, updated_at = ?
      WHERE id = ?
    `).run(hash, t, id);

    audit(req, 'change_password', 'clients', id);

    res.json({
      ok: true,
      message: `تم تعيين كلمة المرور الجديدة للعميل "${client.name}" بنجاح 🔒`,
    });
  } catch (err) { next(err); }
});

// POST /api/admin/clients/:id/reset-password — Generate a random temporary password
router.post('/:id/reset-password', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const client = db.prepare('SELECT id, name, phone, email FROM clients WHERE id = ?').get(id) as any;
    if (!client) {
      res.status(404).json({ error: 'العميل غير موجود' });
      return;
    }

    // Generate easy-to-read, secure temporary password (e.g. Premira#8249)
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `Premira#${randomDigits}`;
    const hash = bcrypt.hashSync(tempPassword, 10);
    const t = now();

    db.prepare(`
      UPDATE clients 
      SET password_hash = ?, reset_token = NULL, reset_expires = NULL, updated_at = ?
      WHERE id = ?
    `).run(hash, t, id);

    audit(req, 'reset_password', 'clients', id);

    res.json({
      ok: true,
      tempPassword,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email,
      message: `تم توليد كلمة مرور مؤقتة جديدة للعميل بنجاح!`,
    });
  } catch (err) { next(err); }
});

// DELETE /api/admin/clients/:id — Delete client and cascade
router.delete('/:id', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const client = db.prepare('SELECT id, name FROM clients WHERE id = ?').get(id) as any;
    if (!client) {
      res.status(404).json({ error: 'العميل غير موجود' });
      return;
    }

    // Check if client has orders
    const ordersCount = (db.prepare('SELECT COUNT(*) as n FROM orders WHERE client_id = ?').get(id) as any).n;
    if (ordersCount > 0) {
      res.status(400).json({ error: `لا يمكن حذف العميل لوجود (${ordersCount}) طلبات مسجلة باسمه. يمكنك حذف الطلبات أولاً إن أردت.` });
      return;
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    audit(req, 'delete', 'clients', id);

    res.json({ ok: true, message: 'تم حذف العميل بنجاح' });
  } catch (err) { next(err); }
});

export default router;
