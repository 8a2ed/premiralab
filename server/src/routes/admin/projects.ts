import { Router } from 'express';
import { z } from 'zod';
import { db, now } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import type { AuthRequest } from '../../types.js';

const router = Router();

// ── Projects ──────────────────────────────────────────────────────────────────

router.get('/', auth, admin, (_req, res, next) => {
  try {
    res.json(
      db.prepare(`
        SELECT p.*,o.order_no,c.name client_name
        FROM projects p
        JOIN orders o ON o.id=p.order_id
        JOIN clients c ON c.id=o.client_id
        ORDER BY p.id DESC
      `).all(),
    );
  } catch (err) { next(err); }
});

router.post('/', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      orderId: z.number().int().positive(),
      title:   z.string().min(2).max(160),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'بيانات المشروع غير صالحة' }); return; }

    const r = db.prepare('INSERT INTO projects(order_id,title,created_at,updated_at) VALUES(?,?,?,?)')
      .run(parsed.data.orderId, parsed.data.title, now(), now());
    audit(req, 'create', 'projects', Number(r.lastInsertRowid));
    res.status(201).json(db.prepare('SELECT * FROM projects WHERE id=?').get(r.lastInsertRowid));
  } catch (err) { next(err); }
});

router.patch('/:id', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      progress: z.number().int().min(0).max(100).optional(),
      status:   z.string().min(2).max(50).optional(),
      title:    z.string().min(2).max(160).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid update' }); return; }
    const id = Number(req.params.id);
    const d  = parsed.data;
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (d.progress !== undefined) { sets.push('progress=?'); vals.push(d.progress); }
    if (d.status   !== undefined) { sets.push('status=?');   vals.push(d.status); }
    if (d.title    !== undefined) { sets.push('title=?');    vals.push(d.title); }
    if (!sets.length) { res.status(400).json({ error: 'Nothing to update' }); return; }
    db.prepare(`UPDATE projects SET ${sets.join(',')},updated_at=? WHERE id=?`).run(...vals, now(), id);
    audit(req, 'update', 'projects', id, d as Record<string, unknown>);
    res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(id));
  } catch (err) { next(err); }
});

// ── Revisions ─────────────────────────────────────────────────────────────────

router.get('/:projectId/revisions', auth, admin, (req, res, next) => {
  try {
    res.json(
      db.prepare('SELECT * FROM revisions WHERE project_id=? ORDER BY id DESC')
        .all(Number(req.params.projectId)),
    );
  } catch (err) { next(err); }
});

router.post('/revisions', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      projectId:   z.number().int().positive(),
      title:       z.string().min(2).max(160),
      description: z.string().max(2000).default(''),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'بيانات التعديل غير صالحة' }); return; }
    const r = db.prepare('INSERT INTO revisions(project_id,title,description,created_at,updated_at) VALUES(?,?,?,?,?)')
      .run(parsed.data.projectId, parsed.data.title, parsed.data.description, now(), now());
    audit(req, 'create', 'revisions', Number(r.lastInsertRowid));
    res.status(201).json(db.prepare('SELECT * FROM revisions WHERE id=?').get(r.lastInsertRowid));
  } catch (err) { next(err); }
});

// PATCH /api/admin/projects/revisions/:id — approve or reject
router.patch('/revisions/:id', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['pending', 'approved', 'rejected']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'الحالة يجب أن تكون: pending | approved | rejected' }); return; }
    const id = Number(req.params.id);
    db.prepare('UPDATE revisions SET status=?,updated_at=? WHERE id=?').run(parsed.data.status, now(), id);
    audit(req, 'update', 'revisions', id, parsed.data as Record<string, unknown>);
    res.json(db.prepare('SELECT * FROM revisions WHERE id=?').get(id));
  } catch (err) { next(err); }
});

export default router;
