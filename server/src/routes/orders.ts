import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { db, now } from '../db.js';
import { sendEmail, orderConfirmationEmail } from '../services/email.js';
import type { Client } from '../types.js';

const router = Router();

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15, // Max 15 orders per IP per 15 minutes
  message: { error: 'تم تجاوز الحد الأقصى لإنشاء الطلبات، يرجى المحاولة لاحقاً.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const orderSchema = z.object({
  name:        z.string().trim().min(2).max(100),
  phone:       z.string().trim().regex(/^(?:\+?20)?01[0125]\d{8}$/, 'رقم هاتف مصري غير صالح'),
  email:       z.string().trim().email().max(200).optional().or(z.literal('')),
  packageId:   z.number().int().positive().optional(),
  serviceId:   z.number().int().positive().optional(),
  projectType: z.string().trim().max(120).default(''),
  notes:       z.string().trim().max(2000).default(''),
  budget:      z.number().nonnegative().optional(),
  deadline:    z.string().max(30).optional(),
});

router.post('/', orderLimiter, async (req, res, next) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'تحقق من البيانات المدخلة', details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const t = now();

    const { id: orderId, orderNo } = db.transaction(() => {
      // Upsert client by phone without clobbering existing email
      let client = db.prepare('SELECT id, email FROM clients WHERE phone=?').get(d.phone) as { id: number; email: string } | undefined;
      if (client) {
        const emailToSave = d.email ? d.email : (client.email || '');
        db.prepare('UPDATE clients SET name=?,email=?,updated_at=? WHERE id=?')
          .run(d.name, emailToSave, t, client.id);
      } else {
        const r = db.prepare('INSERT INTO clients(name,phone,email,created_at,updated_at) VALUES(?,?,?,?,?)')
          .run(d.name, d.phone, d.email || '', t, t);
        client = { id: Number(r.lastInsertRowid), email: d.email || '' };
      }

      const orderNo = `ORD-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const r = db.prepare(
        'INSERT INTO orders(order_no,client_id,package_id,service_id,project_type,notes,status,budget,deadline,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      ).run(
        orderNo, client.id,
        d.packageId ?? null, d.serviceId ?? null,
        d.projectType, d.notes, 'new',
        d.budget ?? null, d.deadline ?? null,
        t, t,
      );

      // Notification with wa.me deep link for admin
      const siteRow = db.prepare("SELECT value FROM settings WHERE key='site'").get() as { value: string } | undefined;
      const site = siteRow ? JSON.parse(siteRow.value) : {};
      const waNumber = (site.whatsapp || '').replace(/\D/g, '');
      const trackerUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/?track=${orderNo}`;
      const waLink = waNumber
        ? `\nhttps://wa.me/${waNumber}?text=${encodeURIComponent(`مرحبًا ${d.name}، طلبك ${orderNo} تم استلامه. تابع مشروعك: ${trackerUrl}`)}`
        : '';

      db.prepare('INSERT INTO notifications(title,body,type,created_at) VALUES(?,?,?,?)')
        .run(
          `طلب جديد — ${orderNo}`,
          `من: ${d.name} (${d.phone})${waLink}`,
          'order',
          t,
        );

      return { id: Number(r.lastInsertRowid), orderNo };
    })();

    // Non-blocking email (stub)
    if (d.email) {
      const trackerUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/?track=${orderNo}`;
      const emailOpts = orderConfirmationEmail({ clientName: d.name, orderNo, trackerUrl });
      emailOpts.to = d.email;
      sendEmail(emailOpts).catch(console.error);
    }

    res.status(201).json({ ok: true, id: orderId, orderNo });
  } catch (err) {
    next(err);
  }
});

export default router;
