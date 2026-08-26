import { Router } from 'express';
import { db } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';

const router = Router();

router.get('/', auth, admin, (_req, res, next) => {
  try {
    const total    = (db.prepare('SELECT COUNT(*) n FROM orders').get() as { n: number }).n;
    const clients  = (db.prepare('SELECT COUNT(*) n FROM clients').get() as { n: number }).n;
    const active   = (db.prepare("SELECT COUNT(*) n FROM orders WHERE status NOT IN ('completed','cancelled')").get() as { n: number }).n;
    const revenue  = (db.prepare("SELECT COALESCE(SUM(budget),0) total FROM orders WHERE status='completed'").get() as { total: number }).total;
    const totalCollected = (db.prepare("SELECT COALESCE(SUM(paid_amount),0) total FROM orders WHERE payment_status='paid'").get() as { total: number }).total;
    const byStatus = db.prepare('SELECT status, COUNT(*) count FROM orders GROUP BY status ORDER BY count DESC').all();
    const recent   = db.prepare(`
      SELECT o.order_no, o.status, o.created_at, c.name client_name
      FROM orders o
      JOIN clients c ON c.id=o.client_id
      ORDER BY o.id DESC LIMIT 5
    `).all();

    res.json({ total, clients, active, revenue, totalCollected, byStatus, recent });
  } catch (err) { next(err); }
});

export default router;
