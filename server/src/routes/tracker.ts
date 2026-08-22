import { Router } from 'express';
import { db } from '../db.js';
import type { Order, Package } from '../types.js';

const router = Router();

/**
 * GET /api/track/:orderNo
 * Public — no auth required. Returns order status, project progress, files,
 * and revisions for the given order number.
 * This powers the client-facing tracker page at /?track=ORD-XXXX.
 */
router.get('/:orderNo', (req, res, next) => {
  try {
    const { orderNo } = req.params;

    const order = db.prepare(`
      SELECT o.*,
             c.name  client_name,
             c.phone client_phone,
             p.title package_title,
             s.title service_title
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      LEFT JOIN packages p ON p.id = o.package_id
      LEFT JOIN services s ON s.id = o.service_id
      WHERE o.order_no = ?
    `).get(orderNo) as (Order & {
      client_name: string; client_phone: string;
      package_title: string | null; service_title: string | null;
    }) | undefined;

    if (!order) {
      res.status(404).json({ error: 'الطلب غير موجود. تحقق من رقم الطلب.' });
      return;
    }

    const project = db.prepare('SELECT * FROM projects WHERE order_id=?').get(order.id) as {
      id: number; title: string; progress: number; status: string; created_at: string;
    } | undefined;

    const files = project
      ? db.prepare('SELECT id,original_name,stored_name,mime_type,size,created_at FROM files WHERE project_id=?').all(project.id)
      : [];

    const revisions = project
      ? db.prepare('SELECT id,title,description,status,created_at FROM revisions WHERE project_id=? ORDER BY id DESC').all(project.id)
      : [];

    // Never expose sensitive data
    res.json({
      orderNo: order.order_no,
      status: order.status,
      projectType: order.project_type,
      packageTitle: order.package_title,
      serviceTitle: order.service_title,
      budget: order.budget,
      deadline: order.deadline,
      createdAt: order.created_at,
      project: project ?? null,
      files: (files as Array<{ stored_name: string; original_name: string; id: number; mime_type: string; size: number; created_at: string }>).map(f => ({
        id: f.id,
        name: f.original_name,
        url: `/uploads/${f.stored_name}`,
        mime: f.mime_type,
        size: f.size,
        createdAt: f.created_at,
      })),
      revisions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
