import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../../db.js';
import { auth, admin } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import type { AuthRequest, User } from '../../types.js';

const router = Router();

router.patch('/password', auth, admin, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(12).max(200),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 12 حرفًا على الأقل' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user!.id) as User | undefined;
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const match = await bcrypt.compare(parsed.data.currentPassword, user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(newHash, req.user!.id);
    audit(req, 'change_password', 'users', req.user!.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
