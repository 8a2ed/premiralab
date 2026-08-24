import { Router } from 'express';
import { db } from '../../db.js';
import { clientAuth } from '../../middleware/auth.js';

const router = Router();

router.use(clientAuth);

// Get all orders for the logged in client
router.get('/orders', (req: any, res) => {
  try {
    const client = db.prepare('SELECT id, email, phone FROM clients WHERE id = ?').get(req.client.id) as any;
    const clientEmail = client?.email?.toLowerCase() || '';
    const rawPhone = client?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

    const orders = db.prepare(`
      SELECT o.id, o.order_no, o.status, o.created_at, o.budget, o.payment_status, o.payment_amount, o.paid_amount,
             p.title as package_title, p.price as package_price,
             s.title as service_title,
             proj.id as project_id, proj.progress
      FROM orders o
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN packages p ON p.id = o.package_id
      LEFT JOIN services s ON s.id = o.service_id
      LEFT JOIN projects proj ON proj.order_id = o.id
      WHERE o.client_id = ?
         OR (c.email IS NOT NULL AND c.email != '' AND LOWER(c.email) = ?)
         OR (? != '' AND c.phone IS NOT NULL AND REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '+', '') LIKE ?)
      ORDER BY o.id DESC
    `).all(req.client.id, clientEmail, cleanPhone, `%${cleanPhone}%`);

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific project details
router.get('/projects/:id', (req: any, res) => {
  try {
    const projectId = Number(req.params.id);

    // Verify ownership
    const project = db.prepare(`
      SELECT p.*, o.order_no, o.client_id 
      FROM projects p
      JOIN orders o ON o.id = p.order_id
      WHERE p.id = ? AND o.client_id = ?
    `).get(projectId, req.client.id) as any;

    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Get files
    const files = db.prepare('SELECT id, original_name, stored_name, mime_type, size, created_at FROM files WHERE project_id = ? ORDER BY id DESC').all(projectId);
    
    // Get revisions
    const revisions = db.prepare('SELECT id, title, description, status, created_at FROM revisions WHERE project_id = ? ORDER BY id DESC').all(projectId);

    res.json({ project, files, revisions });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
