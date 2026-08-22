import { Router } from 'express';
import { db, UPLOAD_DIR } from '../db.js';
import type { Order, Package } from '../types.js';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';

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
    const { orderNo } = req.params;

    const order = db.prepare(`
      SELECT o.*,
             c.name  client_name,
             c.phone client_phone,
             p.title package_title,
             s.title service_title
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      LEFT JOIN packages p ON p.id = o.package_id
      LEFT JOIN services s ON s.id = o.service_id
      WHERE o.order_no = ?
    `).get(orderNo) as (Order & {
      client_name: string; client_phone: string;
      package_title: string | null; service_title: string | null;
      paid_amount?: number; payment_receipt?: string; payment_method?: string;
    }) | undefined;

    if (!order) {
      res.status(404).json({ error: 'الطلب غير موجود. تحقق من رقم الطلب.' });
      return;
    }

    const project = db.prepare('SELECT * FROM projects WHERE order_id=?').get(order.id) as any | undefined;
    const files = project ? db.prepare('SELECT * FROM files WHERE project_id=?').all(project.id) : [];
    const revisions = project ? db.prepare('SELECT * FROM revisions WHERE project_id=? ORDER BY id DESC').all(project.id) : [];

    // Fetch Payment Settings
    const settings = db.prepare('SELECT key, value FROM settings WHERE key IN ("instapay_username", "vodafone_cash", "bank_details", "payment_instructions")').all() as {key: string, value: string}[];
    const sMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    res.json({
      orderNo: order.order_no,
      status: order.status,
      projectType: order.project_type,
      packageTitle: order.package_title,
      serviceTitle: order.service_title,
      budget: order.budget,
      paidAmount: order.paid_amount || 0,
      paymentReceipt: order.payment_receipt,
      paymentMethod: order.payment_method,
      deadline: order.deadline,
      createdAt: order.created_at,
      project: project ?? null,
      files: (files as any[]).map(f => ({
        id: f.id,
        name: f.original_name,
        url: `/uploads/${f.stored_name}`,
        mime: f.mime_type,
        size: f.size,
        createdAt: f.created_at,
      })),
      revisions,
      paymentInfo: {
        instapayUsername: sMap.instapay_username,
        vodafoneCash: sMap.vodafone_cash,
        bankDetails: sMap.bank_details,
        paymentInstructions: sMap.payment_instructions
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:orderNo/receipt', upload.single('receipt'), (req, res, next) => {
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

    db.prepare('UPDATE orders SET payment_receipt = ? WHERE id = ?').run(req.file.filename, order.id);

    res.json({ message: 'تم رفع إيصال الدفع بنجاح', receiptUrl: `/uploads/${req.file.filename}` });
  } catch (err) {
    next(err);
  }
});

export default router;