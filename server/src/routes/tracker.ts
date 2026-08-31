import { v2 as cloudinary } from 'cloudinary';
import { Router } from 'express';
import { db, UPLOAD_DIR } from '../db.js';
import type { Order, Package } from '../types.js';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { sendTelegramAlert } from '../services/telegram.js';
import { optimizeImage } from '../services/image.js';

const router = Router();

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `receipt_${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

/**
 * GET /api/track/:orderNo
 * Public - no auth required. Returns order status, project progress, files,
 * and revisions for the given order number.
 */
router.get('/:orderNo', (req, res, next) => {
  try {
    const rawNo = String(req.params.orderNo || '').trim();
    const cleanNo = decodeURIComponent(rawNo).replace(/#/g, '').trim().toUpperCase();

    const order = db.prepare(`
      SELECT o.*,
             COALESCE(c.name, 'عميلنا العزيز')  client_name,
             COALESCE(c.phone, '') client_phone,
             COALESCE(c.email, '') client_email,
             p.title package_title,
             p.price package_price,
             s.title service_title
      FROM orders o
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN packages p ON p.id = o.package_id
      LEFT JOIN services s ON s.id = o.service_id
      WHERE UPPER(TRIM(REPLACE(o.order_no, '#', ''))) = ?
         OR UPPER(TRIM(o.order_no)) = ?
         OR o.order_no = ?
    `).get(cleanNo, cleanNo, rawNo) as (Order & {
      client_name: string; client_phone: string; client_email: string;
      package_title: string | null; package_price: number | null; service_title: string | null;
      paid_amount?: number; payment_receipt?: string; payment_method?: string;
    }) | undefined;

    if (!order) {
      res.status(404).json({ error: 'الطلب غير موجود. تحقق من رقم الطلب.' });
      return;
    }

    const project = db.prepare('SELECT * FROM projects WHERE order_id=?').get(order.id) as any | undefined;
    const files = project ? db.prepare('SELECT * FROM files WHERE project_id=?').all(project.id) : [];
    const revisions = project ? db.prepare('SELECT * FROM revisions WHERE project_id=? ORDER BY id DESC').all(project.id) : [];

    // Fetch Payment & Site Settings
    const siteRow = db.prepare("SELECT value FROM settings WHERE key='site'").get() as { value: string } | undefined;
    const site: any = siteRow?.value ? JSON.parse(siteRow.value) : {};

    res.json({
      orderNo: order.order_no,
      status: order.status,
      clientName: order.client_name,
      clientPhone: order.client_phone,
      clientEmail: order.client_email,
      notes: order.notes,
      paymentStatus: order.payment_status || 'pending_approval',
      paymentAmount: Number(order.payment_amount) || Number(order.budget) || 0,
      paymentApprovedAt: order.payment_approved_at,
      paymentTransactionId: order.payment_transaction_id,
      reviewNotes: order.review_notes,
      projectType: order.project_type,
      packageTitle: order.package_title,
      packagePrice: order.package_price,
      serviceTitle: order.service_title,
      budget: order.budget,
      paidAmount: order.paid_amount || 0,
      promoCode: order.promo_code,
      promoDiscount: order.promo_discount,
      paymentReceipt: order.payment_receipt,
      paymentMethod: order.payment_method,
      deadline: order.deadline,
      createdAt: order.created_at,
      project: project ?? null,
      files: (files as any[]).map(f => ({
        id: f.id,
        name: f.original_name,
        url: f.stored_name.startsWith('http') ? f.stored_name : `/uploads/${f.stored_name}`,
        mime: f.mime_type,
        size: f.size,
        createdAt: f.created_at,
      })),
      revisions,
      companyInfo: {
        brand: site.brand || 'PremiraLab',
        email: site.email || 'contact@premiralab.com',
        phone: site.phone || site.whatsapp || '',
        whatsapp: site.whatsapp || '',
        address: site.address || 'القاهرة، جمهورية مصر العربية',
        taxNumber: site.tax_number || '',
        currency: site.currency || 'EGP',
      },
      paymentInfo: {
        paymentsEnabled: site.payments_enabled !== false,
        paymobEnabled: site.paymob_enabled === true || site.paymob_enabled === 'true',
        instapayEnabled: site.instapay_enabled !== false,
        instapayUsername: site.instapay_username,
        vodafoneEnabled: site.vodafone_enabled !== false,
        vodafoneCash: site.vodafone_cash,
        bankEnabled: site.bank_enabled !== false,
        bankDetails: site.bank_details,
        paymentInstructions: site.payment_instructions,
        currency: site.currency || 'EGP',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:orderNo/receipt', upload.single('receipt'), async (req, res, next) => {
  try {
    const { orderNo } = req.params;
    if (!req.file) {
      res.status(400).json({ error: 'لم يتم إرسال ملف' });
      return;
    }

    const order = db.prepare('SELECT id FROM orders WHERE order_no = ?').get(orderNo) as { id: number } | undefined;
    if (!order) {
      res.status(404).json({ error: 'الطلب غير موجود' });
      return;
    }

    // Optimize image (compress & convert to WebP)
    let finalFilename = req.file.filename;
    let pathForCloudinary = req.file.path;
    const opt = await optimizeImage(req.file.path);
    if (opt) {
      finalFilename = opt.newFilename;
      pathForCloudinary = path.join(UPLOAD_DIR, finalFilename);
    }
    
    if (process.env.CLOUDINARY_URL) {
      try {
        const result = await cloudinary.uploader.upload(pathForCloudinary, { folder: 'premiralab_receipts' });
        finalFilename = result.secure_url;
        // cleanup local
        const fs = await import('node:fs/promises');
        try { await fs.unlink(pathForCloudinary); } catch {}
        if (opt) { try { await fs.unlink(req.file.path); } catch {} }
      } catch (err) {
        console.error('Cloudinary upload failed for receipt', err);
      }
    }

    db.prepare('UPDATE orders SET payment_receipt = ?, payment_method = COALESCE(NULLIF(payment_method, \'\'), \'تحويل بنكي / محفظة\') WHERE id = ?').run(finalFilename, order.id);

    const adminUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/admin`;
    const message = `🧾 <b>إيصال دفع جديد!</b>
<b>رقم الطلب:</b> #${orderNo}
العميل قام برفع إيصال دفع جديد. يُرجى مراجعته.`;

    sendTelegramAlert(message, {
      buttons: [{ text: '💻 مراجعة في لوحة التحكم', url: adminUrl }]
    }).catch(console.error);

    res.json({ ok: true, message: 'تم رفع إيصال الدفع بنجاح', receiptUrl: `/uploads/${finalFilename}`, status: (order as any).status });
  } catch (err) {
    next(err);
  }
});

export default router;