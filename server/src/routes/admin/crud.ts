import { Router } from 'express';
import { db, now } from '../../db.js';
import { auth } from '../../middleware/auth.js';
import { admin } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import type { AuthRequest } from '../../types.js';

const router = Router();

/** Tables and their allowed field sets — prevents SQL injection */
const ALLOWED_CRUD: Record<string, string[]> = {
  packages:     ['title', 'price', 'description', 'features', 'popular'],
  services:     ['title', 'description', 'icon'],
  portfolio:    ['title', 'category', 'description', 'image_url'],
  testimonials: ['name', 'role', 'content', 'rating', 'avatar_url'],
};

function getTable(name: string): { table: string; fields: string[] } {
  const fields = ALLOWED_CRUD[name];
  if (!fields) throw Object.assign(new Error('Resource not found'), { status: 404 });
  return { table: name, fields };
}

router.get('/:resource', auth, admin, (req, res, next) => {
  try {
    const { table } = getTable(req.params.resource);
    res.json(db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all());
  } catch (err) { next(err); }
});

router.post('/:resource', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const { table, fields } = getTable(req.params.resource);
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    const values = fields.map(f => req.body[f] ?? null);
    const placeholders = fields.map(() => '?').join(',');
    const r = db.prepare(
      `INSERT INTO ${table}(${fields.join(',')},created_at,updated_at) VALUES(${placeholders},?,?)`,
    ).run(...values, now(), now());
    audit(req as AuthRequest, 'create', table, Number(r.lastInsertRowid), req.body as Record<string, unknown>);
    res.status(201).json(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(r.lastInsertRowid));
  } catch (err) { next(err); }
});

router.patch('/:resource/:id', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const { table, fields } = getTable(req.params.resource);
    const id = Number(req.params.id);
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    // FIX: use hasOwnProperty to allow falsy values (0, false, '')
    const sets = fields.filter(f => Object.prototype.hasOwnProperty.call(req.body, f));
    if (!sets.length) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }
    const vals = sets.map(f => req.body[f] as unknown);
    const result = db.prepare(`UPDATE ${table} SET ${sets.map(f => `${f}=?`).join(',')},updated_at=? WHERE id=?`)
      .run(...vals, now(), id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    audit(req as AuthRequest, 'update', table, id, req.body as Record<string, unknown>);
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id));
  } catch (err) { next(err); }
});

router.delete('/:resource/:id', auth, admin, (req: AuthRequest, res, next) => {
  try {
    const { table } = getTable(req.params.resource);
    const id = Number(req.params.id);
    const result = db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    audit(req as AuthRequest, 'delete', table, id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
