import { Router } from 'express';
import { db, now } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';

const router = Router();

// GET /api/admin/notifications?unread=true
router.get('/', auth, admin, (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const where = unreadOnly ? 'WHERE read=0' : '';
    const rows = db.prepare(`SELECT * FROM notifications ${where} ORDER BY id DESC LIMIT 100`).all();
    const unreadCount = (db.prepare('SELECT COUNT(*) n FROM notifications WHERE read=0').get() as { n: number }).n;
    res.json({ rows, unreadCount });
  } catch (err) { next(err); }
});

// PATCH /api/admin/notifications/:id/read
router.patch('/:id/read', auth, admin, (req, res, next) => {
  try {
    db.prepare('UPDATE notifications SET read=1 WHERE id=?').run(Number(req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

// POST /api/admin/notifications/read-all
router.post('/read-all', auth, admin, (_req, res, next) => {
  try {
    db.prepare('UPDATE notifications SET read=1 WHERE read=0').run();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
