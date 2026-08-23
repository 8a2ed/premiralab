import { Router } from 'express';
import { db } from '../db.js';
import type { Package } from '../types.js';

const router = Router();

router.get('/', (_req, res, next) => {
  try {
    const settingsRow = db.prepare('SELECT value FROM settings WHERE key=?').get('site') as { value: string } | undefined;
    let site = {};
    if (settingsRow?.value) {
      try { site = JSON.parse(settingsRow.value); } catch { /* default fallback */ }
    }

    const packages = (db.prepare('SELECT * FROM packages ORDER BY price ASC').all() as Package[]).map(p => {
      let features: string[] = [];
      try {
        features = typeof p.features === 'string' ? JSON.parse(p.features) : (Array.isArray(p.features) ? p.features : []);
      } catch {
        features = [];
      }
      return {
        ...p,
        features,
        popular: Boolean(p.popular),
      };
    });

    const services     = db.prepare('SELECT * FROM services     ORDER BY id ASC').all();
    const portfolio    = db.prepare('SELECT * FROM portfolio    ORDER BY sort_order ASC, id DESC').all();
    const testimonials = db.prepare('SELECT * FROM testimonials ORDER BY sort_order ASC, id DESC').all();

    // Cache for 60 s, allow serving stale for 5 min while revalidating
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ site, packages, services, portfolio, testimonials });
  } catch (err) {
    next(err);
  }
});

router.get('/promo/:code', (req, res, next) => {
  try {
    const code = req.params.code;
    const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND active = 1').get(code) as any;
    
    if (!promo) {
      res.status(404).json({ error: 'كود الخصم غير صحيح أو منتهي الصلاحية' });
      return;
    }

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      res.status(400).json({ error: 'كود الخصم منتهي الصلاحية' });
      return;
    }

    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      res.status(400).json({ error: 'تم تجاوز الحد الأقصى لاستخدام الكود' });
      return;
    }

    res.json({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value
    });
  } catch (err) { next(err); }
});

export default router;
