import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { db, now, UPLOAD_DIR } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import { optimizeImage } from '../../services/image.js';
import type { AuthRequest } from '../../types.js';

const router = Router();

/** Allowed MIME types AND their corresponding extensions */
const ALLOWED: Record<string, string[]> = {
  'image/jpeg':           ['.jpg', '.jpeg'],
  'image/png':            ['.png'],
  'image/gif':            ['.gif'],
  'image/webp':           ['.webp'],
  'image/svg+xml':        ['.svg'],
  'application/pdf':      ['.pdf'],
  'application/zip':      ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

const storage = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomUUID() + ext);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const allowedExts = ALLOWED[file.mimetype];
    const ext = path.extname(file.originalname).toLowerCase();
    // Validate BOTH MIME type AND file extension
    if (allowedExts && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مسموح به. الأنواع المقبولة: JPEG, PNG, GIF, WebP, SVG, PDF, ZIP'));
    }
  },
});

router.post('/:projectId/files', auth, admin, storage.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      return;
    }

    // Sanitize original filename (strip path traversal, truncate)
    const safeName = path.basename(req.file.originalname).slice(0, 255).replace(/[^\w.\-\u0600-\u06FF ]/g, '_');

    const projectId = Number(req.params.projectId);
    const project = db.prepare('SELECT id FROM projects WHERE id=?').get(projectId);
    if (!project) {
      // Clean up uploaded file if project doesn't exist
      try { await fs.unlink(path.join(UPLOAD_DIR, req.file.filename)); } catch { /* ignore */ }
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Optimize image (compress & convert to WebP) if applicable
    let finalFilename = req.file.filename;
    let finalSize = req.file.size;
    let finalMime = req.file.mimetype;

    const opt = await optimizeImage(req.file.path);
    if (opt) {
      finalFilename = opt.newFilename;
      finalSize = opt.size;
      finalMime = 'image/webp';
    }

    const r = db.prepare(
      'INSERT INTO files(project_id,original_name,stored_name,mime_type,size,created_at) VALUES(?,?,?,?,?,?)',
    ).run(projectId, safeName, finalFilename, finalMime, finalSize, now());

    audit(req, 'upload', 'files', Number(r.lastInsertRowid));

    res.status(201).json({
      id:           Number(r.lastInsertRowid),
      originalName: safeName,
      storedName:   finalFilename,
      mimeType:     finalMime,
      size:         finalSize,
      url:          `/uploads/${finalFilename}`,
    });
  } catch (err) { next(err); }
});

router.delete('/:projectId/files/:fileId', auth, admin, async (req: AuthRequest, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const fileId = Number(req.params.fileId);
    const file = db.prepare('SELECT stored_name FROM files WHERE id=? AND project_id=?').get(fileId, projectId) as { stored_name: string } | undefined;
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }

    db.prepare('DELETE FROM files WHERE id=? AND project_id=?').run(fileId, projectId);
    audit(req, 'delete', 'files', fileId);

    // Best-effort delete from disk
    try {
      await fs.unlink(path.join(UPLOAD_DIR, file.stored_name));
    } catch { /* file may already be gone */ }

    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
