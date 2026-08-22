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
    const portfolio    = db.prepare('SELECT * FROM portfolio    ORDER BY id DESC').all();
    const testimonials = db.prepare('SELECT * FROM testimonials ORDER BY id ASC').all();

    // Cache for 60 s, allow serving stale for 5 min while revalidating
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ site, packages, services, portfolio, testimonials });
  } catch (err) {
    next(err);
  }
});

export default router;
