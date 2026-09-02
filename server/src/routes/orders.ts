import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db, now } from '../db.js';
import { sendEmail, orderConfirmationEmail } from '../services/email.js';
import { sendTelegramAlert } from '../services/telegram.js';
import type { Client } from '../types.js';

const router = Router();
const getSecret = () => process.env.JWT_SECRET!;

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15, // Max 15 orders per IP per 15 minutes
  message: { error: 'تم تجاوز الحد الأقصى لإنشاء الطلبات، يرجى المحاولة لاحقًا.' },
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
  promoCode:   z.string().trim().max(20).optional(),
  referralCode: z.string().trim().max(20).optional(),
  useWallet:    z.boolean().optional(),
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

    // Check logged in client token if available
    let loggedInClientId: number | null = null;
    if (req.cookies?.client_session) {
      try {
        const decoded = jwt.verify(req.cookies.client_session, getSecret()) as any;
        if (decoded?.id) loggedInClientId = decoded.id;
      } catch {}
    }

    const { id: orderId, orderNo, promoUsed, promoDiscountInfo } = db.transaction(() => {
      // Validate Promo Code inside transaction to prevent race conditions
      let validPromo = null;
      let discountInfo = null;
      if (d.promoCode) {
        const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND active = 1').get(d.promoCode) as any;
        if (promo && (!promo.expires_at || new Date(promo.expires_at) >= new Date()) && (!promo.max_uses || promo.current_uses < promo.max_uses)) {
          validPromo = promo;
          discountInfo = promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `${promo.discount_value}`;
          db.prepare('UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?').run(promo.id);
        }
      }

      // Identify or Upsert client
      let client: { id: number; email: string; referred_by?: number | null } | undefined;
      
      // 1. If client is logged in
      if (loggedInClientId) {
        const existing = db.prepare('SELECT id, email, phone FROM clients WHERE id=?').get(loggedInClientId) as any;
        if (existing) {
          const emailToSave = d.email ? d.email : (existing.email || '');
          db.prepare("UPDATE clients SET name=?, phone=COALESCE(NULLIF(phone, ''), ?), email=?, updated_at=? WHERE id=?")
            .run(d.name, d.phone, emailToSave, t, existing.id);
          client = { id: existing.id, email: emailToSave };
        }
      }

      // 2. Check by email if provided
      if (!client && d.email) {
        const byEmail = db.prepare('SELECT id, email, phone FROM clients WHERE LOWER(email)=LOWER(?)').get(d.email.trim()) as any;
        if (byEmail) {
          db.prepare("UPDATE clients SET name=?, phone=COALESCE(NULLIF(phone, ''), ?), updated_at=? WHERE id=?")
            .run(d.name, d.phone, t, byEmail.id);
          client = { id: byEmail.id, email: byEmail.email };
        }
      }

      // 3. Check by normalized phone
      if (!client && d.phone) {
        const rawPhone = d.phone.replace(/\D/g, '').slice(-10);
        const byPhone = db.prepare('SELECT id, email FROM clients WHERE phone LIKE ?').get(`%${rawPhone}%`) as any;
        if (byPhone) {
          const emailToSave = d.email ? d.email : (byPhone.email || '');
          db.prepare('UPDATE clients SET name=?, email=?, updated_at=? WHERE id=?')
            .run(d.name, emailToSave, t, byPhone.id);
          client = { id: byPhone.id, email: emailToSave };
        }
      }

      // 4. Create new client record if still not found
      if (!client) {
        let referred_by = null;
        if (d.referralCode) {
          const refClient = db.prepare('SELECT id FROM clients WHERE referral_code=?').get(d.referralCode) as any;
          if (refClient) referred_by = refClient.id;
        }
        const r = db.prepare('INSERT INTO clients(name,phone,email,referred_by,created_at,updated_at) VALUES(?,?,?,?,?,?)')
          .run(d.name, d.phone, d.email || '', referred_by, t, t);
        client = { id: Number(r.lastInsertRowid), email: d.email || '', referred_by };
      }

      // Determine base price and calculated budget with promo
      let basePrice = 0;
      if (d.packageId) {
        const pkg = db.prepare('SELECT price FROM packages WHERE id=?').get(d.packageId) as { price: number } | undefined;
        if (pkg && Number(pkg.price) > 0) basePrice = Number(pkg.price);
      } else if (d.budget && Number(d.budget) > 0) {
        basePrice = Number(d.budget);
      }

      let calculatedBudget = basePrice;
      if (validPromo && basePrice > 0) {
        if (validPromo.discount_type === 'percentage') {
          const disc = (basePrice * validPromo.discount_value) / 100;
          calculatedBudget = Math.max(0, basePrice - disc);
        } else {
          calculatedBudget = Math.max(0, basePrice - validPromo.discount_value);
        }
      }

      const orderNo = `ORD-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      
      let walletUsed = 0;
      let finalPaymentAmount = calculatedBudget;
      
      if (d.useWallet && client!.id) {
        const cRow = db.prepare('SELECT wallet_balance FROM clients WHERE id=?').get(client.id) as any;
        if (cRow && cRow.wallet_balance > 0) {
           walletUsed = Math.min(cRow.wallet_balance, finalPaymentAmount);
           finalPaymentAmount -= walletUsed;
           db.prepare('UPDATE clients SET wallet_balance = wallet_balance - ? WHERE id=?').run(walletUsed, client.id);
           db.prepare('INSERT INTO wallet_transactions (client_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)').run(client!.id, walletUsed, 'spend', `دفع جزء من طلب ${orderNo}`, t);
        }
      }

      const r = db.prepare(
        'INSERT INTO orders(order_no,client_id,package_id,service_id,project_type,notes,status,budget,payment_amount,wallet_used,deadline,promo_code,promo_discount,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      ).run(
        orderNo, client!.id,
        d.packageId ?? null, d.serviceId ?? null,
        d.projectType, d.notes, 'new',
        calculatedBudget > 0 ? calculatedBudget : (d.budget ?? null),
        calculatedBudget > 0 ? finalPaymentAmount : (d.budget ?? null),
        walletUsed,
        d.deadline ?? null,
        validPromo ? validPromo.code : null, discountInfo,
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

      return { id: Number(r.lastInsertRowid), orderNo, promoUsed: validPromo?.code, promoDiscountInfo: discountInfo };
    })();

    // Non-blocking email (stub)
    if (d.email) {
      const trackerUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/?track=${orderNo}`;
      const emailOpts = orderConfirmationEmail({ clientName: d.name, orderNo, trackerUrl });
      emailOpts.to = d.email;
      sendEmail(emailOpts).catch(console.error);
    }

    // Non-blocking Telegram alert
    const adminUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/admin`;
    const message = `🎉 <b>طلب جديد!</b>
<b>الرقم:</b> #${orderNo}
<b>العميل:</b> ${d.name}
<b>الهاتف:</b> <code>${d.phone}</code>
${d.email ? `<b>الإيميل:</b> ${d.email}\n` : ''}${d.projectType ? `<b>نوع المشروع:</b> ${d.projectType}\n` : ''}${d.budget ? `<b>الميزانية:</b> ${d.budget}\n` : ''}${promoUsed ? `🎁 <b>كود الخصم:</b> ${promoUsed} (خصم ${promoDiscountInfo})\n` : ''}${d.notes ? `\n<b>ملاحظات:</b>\n<i>${d.notes}</i>` : ''}`;

    sendTelegramAlert(message, {
      buttons: [{ text: '💻 فتح لوحة التحكم', url: adminUrl }]
    }).catch(console.error);

    res.status(201).json({ ok: true, id: orderId, orderNo });
  } catch (err) {
    next(err);
  }
});

export default router;
