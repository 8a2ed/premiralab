import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import type { AuthRequest } from '../../types.js';

const router = Router();

const siteSettingsSchema = z.object({
  brand:     z.string().trim().max(100).default(''),
  phone:     z.string().trim().max(50).default(''),
  email:     z.string().trim().max(100).default(''),
  currency:  z.string().trim().max(10).default('EGP'),
  whatsapp:  z.string().trim().max(50).default(''),
  telegram:  z.string().trim().max(50).default(''),
}).passthrough();

router.get('/', auth, admin, (_req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all() as Array<{ key: string; value: string }>;
    const result: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value);
      } catch {
        result[r.key] = {};
      }
    }
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/test-email', auth, admin, async (req: AuthRequest, res, next) => {
  try {
    const { sendEmail } = await import('../../services/email.js');
    // Using user's logged in email or a fallback
    const testTo = req.user?.username === 'admin' ? 'premiralab@gmail.com' : (req.user?.username || 'premiralab@gmail.com');
    
    await sendEmail({
      to: testTo,
      subject: 'رسالة اختبار من النظام ✉️',
      throwOnError: true,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>مرحباً!</h2>
          <p>إذا كنت تقرأ هذه الرسالة، فهذا يعني أن <strong>إعدادات SMTP</strong> الخاصة بك تعمل بنجاح!</p>
          <p>يمكنك الآن إرسال إشعارات الطلبات والمراجعات للعملاء تلقائياً.</p>
        </div>
      `
    });
    res.json({ message: 'تم إرسال رسالة الاختبار بنجاح. يرجى مراجعة بريدك الإلكتروني.' });
  } catch (err) {
    next(err);
  }
});

router.put('/:key', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const { key } = req.params;
    if (key !== 'site') {
      res.status(400).json({ error: 'Unknown settings key' });
      return;
    }

    const parsed = siteSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'بيانات الإعدادات غير صالحة', details: parsed.error.flatten() });
      return;
    }

    db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
      .run(key, JSON.stringify(parsed.data));
    audit(req, 'update', 'settings', null, { key });
    res.json(parsed.data);
  } catch (err) { next(err); }
});

export default router;
