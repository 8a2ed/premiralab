import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db, now } from '../db.js';
import { auth } from '../middleware/auth.js';
import type { AuthRequest, User } from '../types.js';

const router = Router();
const IS_PROD = process.env.NODE_ENV === 'production';
const getSecret = () => process.env.JWT_SECRET!;

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  validate: { trustProxy: false },
  message: { error: 'تم تجاوز عدد محاولات الدخول، يرجى المحاولة بعد قليل.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'بيانات غير صالحة' });
      return;
    }
    const row = db.prepare('SELECT * FROM users WHERE username=?').get(parsed.data.username) as User | undefined;
    const passwordMatch = row ? await bcrypt.compare(parsed.data.password, row.password_hash) : false;
    if (!row || !passwordMatch) {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }
    const token = jwt.sign(
      { id: row.id, username: row.username, role: row.role },
      getSecret(),
      { expiresIn: '8h' },
    );
    res.cookie('studio_session', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ user: { id: row.id, username: row.username, role: row.role } });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', auth, (_req, res) => {
  res.clearCookie('studio_session', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/' });
  res.json({ ok: true });
});

router.get('/me', auth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;
