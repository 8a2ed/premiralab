import bcrypt from 'bcryptjs';
import { db, now } from './db.js';

export async function seed(): Promise<void> {
  try {
    // ── Admin user (async bcrypt, must be outside transaction) ────────────────
    const userCount = (db.prepare('SELECT COUNT(*) n FROM users').get() as { n: number }).n;
    if (!userCount) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'ChangeMe_2026!';
      const hash = await bcrypt.hash(password, 12);
      db.prepare('INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)')
        .run(username, hash, now());
      console.log(`[seed] Admin user "${username}" created.`);
    }

    // ── Synchronous seeds in a transaction ────────────────────────────────────
    db.transaction(() => {
      const settingsCount = (db.prepare('SELECT COUNT(*) n FROM settings').get() as { n: number }).n;
      if (!settingsCount) {
        db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run(
          'site',
          JSON.stringify({
            brand: 'Design Studio',
            phone: '01000000000',
            email: 'premiralab@gmail.com',
            currency: 'EGP',
            whatsapp: '',
            telegram: '',
          }),
        );
      }

      const pkgCount = (db.prepare('SELECT COUNT(*) n FROM packages').get() as { n: number }).n;
      if (!pkgCount) {
        const stmt = db.prepare(
          'INSERT INTO packages(title,price,description,features,popular,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',
        );
        stmt.run('باقة انطلاقة الهوية البصرية', 4500,
          'هوية بصرية احترافية لبداية قوية',
          JSON.stringify(['Logo', 'Color Palette', 'Typography', 'Mini Brand Guide']),
          0, now(), now());
        stmt.run('الباقة الشاملة', 12500,
          'حل متكامل للهوية والتسويق',
          JSON.stringify(['Full Identity', 'Brand Guidelines', 'Social Templates', 'Packaging Concept']),
          1, now(), now());
      }

      const svcCount = (db.prepare('SELECT COUNT(*) n FROM services').get() as { n: number }).n;
      if (!svcCount) {
        const stmt = db.prepare(
          'INSERT INTO services(title,description,icon,created_at,updated_at) VALUES(?,?,?,?,?)',
        );
        [
          ['تصميم الهوية', 'بناء هوية بصرية متماسكة واحترافية تعكس روح علامتك.', 'palette'],
          ['تصميم السوشيال', 'قوالب ومنشورات عالية التحويل لمنصات التواصل الاجتماعي.', 'layout'],
          ['UI/UX', 'واجهات وتجارب رقمية احترافية تُسهّل رحلة المستخدم.', 'monitor'],
        ].forEach(([title, desc, icon]) => stmt.run(title, desc, icon, now(), now()));
      }
    })();

    console.log('[seed] Database ready.');
  } catch (err) {
    console.error('[seed] Failed:', err);
    throw err;
  }
}
