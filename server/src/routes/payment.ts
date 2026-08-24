import { Router } from 'express';
import { z } from 'zod';
import { db, now } from '../db.js';
import { createPaymobPayment, verifyPaymobHMAC } from '../services/paymob.js';
import { sendEmail } from '../services/email.js';
import { sendTelegramAlert } from '../services/telegram.js';
import type { OrderRow } from '../types.js';

const router = Router();

// POST /api/payment/apply-promo — Apply a promo code dynamically to an order
router.post('/apply-promo', async (req, res, next) => {
  try {
    const schema = z.object({
      orderNo:   z.string().trim().min(3),
      promoCode: z.string().trim().min(2),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'بيانات غير صالحة' });
      return;
    }
    const { orderNo, promoCode } = parsed.data;

    const order = db.prepare(`
      SELECT o.*, p.price package_price 
      FROM orders o 
      LEFT JOIN packages p ON p.id = o.package_id 
      WHERE o.order_no = ?
    `).get(orderNo) as (OrderRow & { package_price?: number }) | undefined;

    if (!order) {
      res.status(404).json({ error: 'الطلب غير موجود' });
      return;
    }

    if (order.payment_status === 'paid') {
      res.status(400).json({ error: 'تم سداد هذا الطلب مسبقاً ولا يمكن تعديل الخصم' });
      return;
    }

    // Validate promo code
    const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND active = 1').get(promoCode) as any;
    if (!promo) {
      res.status(400).json({ error: 'كوبون الخصم غير صحيح أو غير مفعل' });
      return;
    }

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      res.status(400).json({ error: 'عذرًا، انتهت صلاحية هذا الكوبون' });
      return;
    }

    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      res.status(400).json({ error: 'عذرًا، تم الوصول للحد الأقصى لاستخدام هذا الكوبون' });
      return;
    }

    // Base price calculation
    const basePrice = Number(order.package_price) || Number(order.budget) || Number(order.payment_amount) || 0;
    if (basePrice <= 0) {
      res.status(400).json({ error: 'لا يوجد مبلغ أساسي محدد للطلب لتطبيق الخصم عليه' });
      return;
    }

    let discountAmount = 0;
    let discountInfo = '';

    if (promo.discount_type === 'percentage') {
      discountAmount = (basePrice * promo.discount_value) / 100;
      discountInfo = `${promo.discount_value}%`;
    } else {
      discountAmount = promo.discount_value;
      discountInfo = `${promo.discount_value} ج.م`;
    }

    const newTotal = Math.max(0, basePrice - discountAmount);

    // Update order in database
    const t = now();
    db.prepare(`
      UPDATE orders 
      SET promo_code = ?, promo_discount = ?, budget = ?, payment_amount = ?, updated_at = ?
      WHERE id = ?
    `).run(promo.code, discountInfo, newTotal, newTotal, t, order.id);

    res.json({
      ok: true,
      promoCode: promo.code,
      discountInfo,
      originalPrice: basePrice,
      discountAmount,
      newTotal,
      message: `تم تطبيق كود الخصم بنجاح! تم خصم ${discountInfo}`,
    });
  } catch (err: any) {
    console.error('[apply-promo] Error:', err);
    res.status(500).json({ error: err.message || 'فشل تطبيق الكوبون' });
  }
});

// POST /api/payment/paymob/initiate — Initiate payment for an approved order
router.post('/paymob/initiate', async (req, res, next) => {
  try {
    const schema = z.object({
      orderNo:     z.string().trim().min(3),
      method:      z.enum(['card', 'wallet', 'fawry']).default('card'),
      walletPhone: z.string().trim().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'بيانات الدفع غير مكتملة' });
      return;
    }

    const { orderNo, method, walletPhone } = parsed.data;

    // Fetch order with client and package details
    const order = db.prepare(`
      SELECT o.*, c.name client_name, c.phone client_phone, c.email client_email, p.price package_price, p.title package_title
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      LEFT JOIN packages p ON p.id = o.package_id
      WHERE o.order_no = ?
    `).get(orderNo) as (OrderRow & { package_price?: number; package_title?: string }) | undefined;

    if (!order) {
      res.status(404).json({ error: 'الطلب غير موجود' });
      return;
    }

    // Strict Business Rule Check: Must be approved by admin before payment is unlocked
    if (order.payment_status !== 'approved_for_payment' && order.payment_status !== 'paid') {
      res.status(403).json({
        error: 'طلبك قيد مراجعة المواعيد وجدول العمل من قبل الإدارة. سيتم إشعارك وفتح الدفع فور اعتماد الطلب.',
        payment_status: order.payment_status,
      });
      return;
    }

    if (order.payment_status === 'paid') {
      res.status(400).json({ error: 'تم سداد قيمة هذا الطلب مسبقًا بنجاح.' });
      return;
    }

    // Determine amount to charge (discounted budget or payment_amount has precedence)
    let amount = Number(order.payment_amount) || Number(order.budget) || Number(order.package_price) || 0;
    if (amount <= 0) {
      res.status(400).json({ error: 'لم يتم تحديد المبلغ المطلوب سداده لهذا الطلب بعد' });
      return;
    }

    // Initiate Paymob transaction
    const paymentData = await createPaymobPayment({
      orderNo: order.order_no,
      amount,
      clientName: order.client_name,
      clientEmail: order.client_email,
      clientPhone: walletPhone || order.client_phone,
      method,
    });

    res.json({
      ok: true,
      amount,
      currency: 'EGP',
      method,
      ...paymentData,
    });
  } catch (err: any) {
    console.error('[payment-initiate] Error:', err);
    res.status(500).json({ error: err.message || 'حدث خطأ أثناء معالجة بوابة الدفع' });
  }
});

// POST /api/payment/paymob/webhook — Paymob Transaction Webhook Callback
router.post('/paymob/webhook', async (req, res, next) => {
  try {
    const data = req.body?.obj || req.body;
    if (!data) {
      res.status(400).json({ error: 'No payload' });
      return;
    }

    // Verify HMAC Signature (support query, body, or nested obj)
    const receivedHmac = String(req.query?.hmac || req.body?.hmac || data?.hmac || '');
    const isValid = verifyPaymobHMAC({ obj: data, hmac: receivedHmac });
    if (!isValid) {
      console.warn('[paymob-webhook] Invalid HMAC signature received!');
      // Respond 200 to prevent Paymob infinite retry storm, but do not process
      res.status(200).json({ error: 'HMAC verification failed' });
      return;
    }

    const isSuccess = data.success === true || data.success === 'true';
    const merchantOrderId = String(data.order?.merchant_order_id || data.merchant_order_id || '');
    const orderNo = merchantOrderId.split('-').slice(0, 3).join('-'); // Reconstruct ORD-YYYY-HEX
    const transactionId = String(data.id || data.transaction_id || '');
    const amountCents = Number(data.amount_cents || 0);
    const amountPaid = amountCents > 0 ? amountCents / 100 : 0;
    const paySubtype = String(data.source_data?.sub_type || data.source_data?.type || 'Online');

    console.log(`[paymob-webhook] Transaction ${transactionId} for order ${orderNo} — Success: ${isSuccess}`);

    if (isSuccess && orderNo) {
      const t = now();
      const order = db.prepare('SELECT o.*, c.name client_name, c.phone client_phone, c.email client_email FROM orders o JOIN clients c ON c.id=o.client_id WHERE o.order_no=?').get(orderNo) as any;

      if (order && order.payment_status !== 'paid') {
        db.transaction(() => {
          // 1. Update order to paid and in_progress
          db.prepare(`
            UPDATE orders 
            SET payment_status = 'paid', 
                status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END,
                paid_amount = ?,
                payment_method = ?,
                payment_transaction_id = ?,
                updated_at = ?
            WHERE id = ?
          `).run(amountPaid, `Paymob (${paySubtype})`, transactionId, t, order.id);

          // 2. Ensure project record exists so client can view progress
          const existingProj = db.prepare('SELECT id FROM projects WHERE order_id = ?').get(order.id);
          if (!existingProj) {
            db.prepare(`
              INSERT INTO projects(order_id, title, progress, status, created_at, updated_at)
              VALUES(?, ?, 5, 'in_progress', ?, ?)
            `).run(order.id, `مشروع ${order.order_no} — ${order.project_type || 'تصميم وتطوير'}`, t, t);
          }

          // 3. Create notification
          db.prepare('INSERT INTO notifications(title,body,type,created_at) VALUES(?,?,?,?)').run(
            `💰 دفعة إلكترونية ناجحة — ${order.order_no}`,
            `تم سداد مبلغ ${amountPaid} ج.م بنجاح عبر Paymob (${paySubtype}) للعميل ${order.client_name}`,
            'payment',
            t,
          );
        })();

        // 4. Send Telegram Alert to Admin
        const adminUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/admin`;
        sendTelegramAlert(`💸 <b>تم استلام دفعة إلكترونية بنجاح!</b>
<b>رقم الطلب:</b> #${order.order_no}
<b>العميل:</b> ${order.client_name} (${order.client_phone})
<b>المبلغ المدفوع:</b> ${amountPaid} ج.م
<b>طريقة الدفع:</b> Paymob (${paySubtype})
<b>رقم المعاملة:</b> <code>${transactionId}</code>`, {
          buttons: [{ text: '💻 فتح الطلب في لوحة التحكم', url: adminUrl }]
        }).catch(console.error);

        // 5. Send Payment Receipt Email to Client
        if (order.client_email) {
          const trackerUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/?track=${order.order_no}`;
          sendEmail({
            to: order.client_email,
            subject: `إيصال سداد وتأكيد بدء مشروعك #${order.order_no} ✨`,
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
                <h2 style="color: #7c3aed; margin-top: 0;">تم استلام دفعتك بنجاح! 🎉</h2>
                <p>مرحبًا <strong>${order.client_name}</strong>،</p>
                <p>تم تأكيد سداد مبلغ <strong>${amountPaid} ج.م</strong> لمشروعك رقم <strong>${order.order_no}</strong>.</p>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 4px 0;"><strong>رقم المعاملة:</strong> ${transactionId}</p>
                  <p style="margin: 4px 0;"><strong>طريقة الدفع:</strong> Paymob الإلكترونية</p>
                  <p style="margin: 4px 0;"><strong>الحالة:</strong> بدأ العمل على مشروعك رسميًا 🚀</p>
                </div>
                <p>يمكنك متابعة مراحل التنفيذ، مسودات التصميم، ورفع الملاحظات من خلال رابط التتبع:</p>
                <a href="${trackerUrl}" style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 12px 0;">
                  متابعة مشروعك الآن
                </a>
              </div>
            `
          }).catch(console.error);
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[paymob-webhook] Error:', err);
    res.status(200).json({ error: 'Internal handling error' });
  }
});

// GET /api/payment/paymob/callback — Browser Redirection after Payment
router.get('/paymob/callback', (req, res) => {
  console.log('[paymob-callback] Received Query:', req.query);
  const isSuccess = req.query.success === 'true' || req.query.txn_response_code === 'APPROVED';
  const merchantOrderId = String(req.query.merchant_order_id || req.query.order || '');
  const orderNo = merchantOrderId.split('-').slice(0, 3).join('-');
  const transactionId = String(req.query.id || '');
  const failReason = String(req.query['data.message'] || req.query.data_message || req.query.txn_response_code || req.query.message || '');
  const host = req.get('host') || 'localhost:5173';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const fallbackOrigin = `${protocol}://${host}`;
  const clientOrigin = (process.env.CLIENT_ORIGIN && !process.env.CLIENT_ORIGIN.includes('localhost')) ? process.env.CLIENT_ORIGIN : fallbackOrigin;

  if (isSuccess && orderNo) {
    try {
      const t = now();
      const order = db.prepare('SELECT o.*, c.name client_name, c.phone client_phone FROM orders o JOIN clients c ON c.id=o.client_id WHERE o.order_no=?').get(orderNo) as any;
      if (order && order.payment_status !== 'paid') {
        const amountPaid = Number(order.payment_amount) || Number(order.budget) || 0;
        db.transaction(() => {
          db.prepare(`
            UPDATE orders 
            SET payment_status = 'paid', 
                status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END,
                paid_amount = ?,
                payment_method = 'Paymob',
                payment_transaction_id = ?,
                updated_at = ?
            WHERE id = ?
          `).run(amountPaid, transactionId, t, order.id);

          const existingProj = db.prepare('SELECT id FROM projects WHERE order_id = ?').get(order.id);
          if (!existingProj) {
            db.prepare(`
              INSERT INTO projects(order_id, title, progress, status, created_at, updated_at)
              VALUES(?, ?, 5, 'in_progress', ?, ?)
            `).run(order.id, `مشروع ${order.order_no} — ${order.project_type || 'تصميم وتطوير'}`, t, t);
          }
        })();
      }
    } catch (dbErr) {
      console.error('[paymob-callback] Database update error:', dbErr);
    }
  }

  const reasonParam = failReason ? `&reason=${encodeURIComponent(failReason)}` : '';
  const targetUrl = isSuccess && orderNo
    ? `${clientOrigin}/?track=${orderNo}&payment=success`
    : `${clientOrigin}/?track=${orderNo || ''}&payment=failed${reasonParam}`;

  // Return HTML to safely break out of any nested iFrame
  res.send(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>تأكيد الدفع الإلكتروني</title>
      <style>
        body { background: #09090b; color: #fff; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .box { text-align: center; padding: 24px; }
      </style>
    </head>
    <body>
      <div class="box">
        <h3 style="color: ${isSuccess ? '#22c55e' : '#ef4444'}; margin-bottom: 8px;">
          ${isSuccess ? '🎉 تم تأكيد سداد دفعتك الإلكترونية بنجاح!' : '⚠️ لم تكتمل عملية الدفع الإلكتروني.'}
        </h3>
        <p style="color: #888; font-size: 14px;">جارٍ تحويلك إلى صفحة تتبع المشروع...</p>
      </div>
      <script>
        const dest = "${targetUrl}";
        if (window.top && window.top !== window.self) {
          window.top.location.href = dest;
        } else {
          window.location.href = dest;
        }
      </script>
    </body>
    </html>
  `);
});

export default router;
