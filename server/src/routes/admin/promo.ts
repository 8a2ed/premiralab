import { Router } from 'express';
import { z } from 'zod';
import { db, now } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';

const router = Router();

// Zod schema for Promo Code validation
const promoSchema = z.object({
  code:           z.string().min(2).max(20).toUpperCase(),
  discount_type:  z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  max_uses:       z.number().int().nonnegative().nullable().optional(),
  expires_at:     z.string().nullable().optional(),
  active:         z.number().int().min(0).max(1).default(1),
});

// GET all promo codes
router.get('/', auth, admin, (req, res, next) => {
  try {
    const codes = db.prepare('SELECT * FROM promo_codes ORDER BY id DESC').all();
    res.json(codes);
  } catch (err) { next(err); }
});

// POST a new promo code
router.post('/', auth, admin, (req, res, next) => {
  try {
    const parsed = promoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'بيانات الكوبون غير صالحة' });
      return;
    }
    const d = parsed.data;

    // Check if exists
    const existing = db.prepare('SELECT id FROM promo_codes WHERE code = ?').get(d.code);
    if (existing) {
      res.status(400).json({ error: 'كود الخصم موجود مسبقًا' });
      return;
    }

    const r = db.prepare(`
      INSERT INTO promo_codes(code, discount_type, discount_value, max_uses, expires_at, active, created_at, updated_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      d.code, d.discount_type, d.discount_value,
      d.max_uses || null, d.expires_at || null, d.active,
      now(), now()
    );

    audit(req, 'create', 'promo_codes', Number(r.lastInsertRowid));
    res.status(201).json({ id: r.lastInsertRowid, ...d });
  } catch (err) { next(err); }
});

// PATCH a promo code
router.patch('/:id', auth, admin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = promoSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'بيانات غير صالحة' });
      return;
    }

    const current = db.prepare('SELECT * FROM promo_codes WHERE id = ?').get(id) as any;
    if (!current) {
      res.status(404).json({ error: 'الكوبون غير موجود' });
      return;
    }

    const d = { ...current, ...parsed.data };
    
    // Check if new code conflicts
    if (parsed.data.code && parsed.data.code !== current.code) {
      const existing = db.prepare('SELECT id FROM promo_codes WHERE code = ? AND id != ?').get(d.code, id);
      if (existing) {
        res.status(400).json({ error: 'كود الخصم موجود مسبقًا' });
        return;
      }
    }

    db.prepare(`
      UPDATE promo_codes SET
        code = ?, discount_type = ?, discount_value = ?, max_uses = ?, expires_at = ?, active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      d.code, d.discount_type, d.discount_value,
      d.max_uses || null, d.expires_at || null, d.active, now(), id
    );

    audit(req, 'update', 'promo_codes', id, parsed.data);
    res.json({ id, ...d });
  } catch (err) { next(err); }
});

// DELETE a promo code
router.delete('/:id', auth, admin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const code = db.prepare('SELECT * FROM promo_codes WHERE id = ?').get(id);
    if (!code) {
      res.status(404).json({ error: 'الكوبون غير موجود' });
      return;
    }
    db.prepare('DELETE FROM promo_codes WHERE id = ?').run(id);
    audit(req, 'delete', 'promo_codes', id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;