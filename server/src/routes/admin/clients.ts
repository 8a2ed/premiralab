import { Router } from 'express';
import { db } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';

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

    const baseQuery = `FROM clients c LEFT JOIN orders o ON o.client_id=c.id ${where} GROUP BY c.id`;
    const total = (db.prepare(`SELECT COUNT(*) n FROM (SELECT c.id ${baseQuery})`).get(...params) as { n: number }).n;
    const rows  = db.prepare(`SELECT c.*,COUNT(o.id) orders_count ${baseQuery} ORDER BY c.id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);

    res.json({ rows, total, page, limit });
  } catch (err) { next(err); }
});

export default router;
