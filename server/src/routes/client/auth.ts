import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db, now } from '../../db.js';
import { clientAuth } from '../../middleware/auth.js';

const router = Router();
const IS_PROD = process.env.NODE_ENV === 'production';
const getSecret = () => process.env.JWT_SECRET!;

router.post('/register', (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    // Ensure email is lowercased
    const emailLower = String(email).toLowerCase();

    // Check if client exists
    const existing = db.prepare('SELECT id, password_hash FROM clients WHERE email = ?').get(emailLower) as { id: number, password_hash: string | null } | undefined;

    if (existing) {
      if (existing.password_hash) {
        return res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً.' });
      }
      // Merge account
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE clients SET name=?, phone=?, password_hash=?, updated_at=? WHERE id=?')
        .run(name, phone, hash, now(), existing.id);
      
      const token = jwt.sign({ id: existing.id, email: emailLower }, getSecret(), { expiresIn: '30d' });
      res.cookie('client_session', token, { httpOnly: true, secure: IS_PROD, sameSite: 'strict', maxAge: 30*24*60*60*1000, path: '/' });
      return res.json({ id: existing.id, name, email: emailLower });
    }

    // Create new client
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO clients(name, phone, email, password_hash, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)')
      .run(name, phone, emailLower, hash, now(), now());
    
    const newId = Number(result.lastInsertRowid);
    const token = jwt.sign({ id: newId, email: emailLower }, getSecret(), { expiresIn: '30d' });
    res.cookie('client_session', token, { httpOnly: true, secure: IS_PROD, sameSite: 'strict', maxAge: 30*24*60*60*1000, path: '/' });
    
    res.json({ id: newId, name, email: emailLower });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const client = db.prepare('SELECT id, name, email, password_hash FROM clients WHERE email = ?').get(String(email).toLowerCase()) as any;
    
    if (!client || !client.password_hash) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    if (!bcrypt.compareSync(password, client.password_hash)) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign({ id: client.id, email: client.email }, getSecret(), { expiresIn: '30d' });
    res.cookie('client_session', token, { httpOnly: true, secure: IS_PROD, sameSite: 'strict', maxAge: 30*24*60*60*1000, path: '/' });
    
    res.json({ id: client.id, name: client.name, email: client.email });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', clientAuth, (_req, res) => {
  res.clearCookie('client_session', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/' });
  res.json({ ok: true });
});

router.get('/me', clientAuth, (req: any, res) => {
  try {
    const client = db.prepare('SELECT id, name, phone, email FROM clients WHERE id = ?').get(req.client.id);
    if (!client) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ client });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase();
    const client = db.prepare('SELECT id, name FROM clients WHERE email = ?').get(email) as any;
    if (!client) return res.json({ ok: true }); // Silent success for security

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare('UPDATE clients SET reset_token=?, reset_expires=? WHERE id=?')
      .run(hash, expires, client.id);

    const { sendEmail } = await import('../../services/email.js');
    const resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/client/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    await sendEmail({
      to: email,
      subject: 'إعادة تعيين كلمة المرور',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>مرحباً ${client.name}</h2>
          <p>لقد طلبت إعادة تعيين كلمة المرور الخاصة بحسابك.</p>
          <p>اضغط على الزر أدناه لإنشاء كلمة مرور جديدة:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #cd45cd; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">إعادة تعيين كلمة المرور</a>
          <p style="margin-top: 20px; font-size: 13px; color: #666;">إذا لم تطلب هذا الإجراء، يمكنك تجاهل هذه الرسالة بأمان. الرابط صالح لمدة ساعة واحدة فقط.</p>
        </div>
      `
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', (req, res) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const hashToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const client = db.prepare('SELECT id, reset_expires FROM clients WHERE email = ? AND reset_token = ?').get(String(email).toLowerCase(), hashToken) as any;
    
    if (!client) return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    if (new Date(client.reset_expires).getTime() < Date.now()) {
      return res.status(400).json({ error: 'الرابط منتهي الصلاحية' });
    }

    const newHash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE clients SET password_hash=?, reset_token=NULL, reset_expires=NULL WHERE id=?')
      .run(newHash, client.id);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
