import fs from 'node:fs';
import path from 'node:path';
import { ZipArchive } from 'archiver';
import { db, DATA_DIR, UPLOAD_DIR } from '../db.js';

export function startBackupJob() {
  // Backup immediately on startup (just in case), then every 12 hours
  setTimeout(runBackup, 10000);
  setInterval(runBackup, 12 * 60 * 60 * 1000);
}

export async function runBackup() {
  const BACKUP_DIR = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  return new Promise<void>((resolve, reject) => {
    try {
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const dbBackupPath = path.join(BACKUP_DIR, `studio-${date}.db`);
      const zipBackupPath = path.join(BACKUP_DIR, `studio-full-${date}.zip`);
      
      console.log(`[Backup] Starting hot database backup...`);
      
      db.backup(dbBackupPath)
        .then(() => {
          console.log(`[Backup] Database backed up to: ${dbBackupPath}`);
          console.log(`[Backup] Zipping database and uploads directory...`);
          
          const output = fs.createWriteStream(zipBackupPath);
          const archive = new ZipArchive({ zlib: { level: 9 } });

          output.on('close', async () => {
            console.log(`[Backup] Zip archive created: ${archive.pointer()} bytes`);
            cleanOldBackups(BACKUP_DIR);
            
            const { sendTelegramDocument } = await import('./telegram.js');
            await sendTelegramDocument(
              zipBackupPath, 
              `📦 <b>نسخة احتياطية شاملة (قاعدة بيانات + ملفات)</b>\n<b>التاريخ:</b> ${new Date().toLocaleString('ar-EG')}\n<b>الحجم:</b> ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`
            ).catch(console.error);

            // Cleanup the temporary .db file as it's inside the zip now
            try { fs.unlinkSync(dbBackupPath); } catch (e) {}
            resolve();
          });

          archive.on('error', (err: any) => {
            console.error('[Backup] Archive Error:', err);
            reject(err);
          });
          
          archive.pipe(output);
          
          // Append the DB file
          archive.file(dbBackupPath, { name: 'studio.db' });
          
          // Append the Uploads folder
          if (fs.existsSync(UPLOAD_DIR)) {
            archive.directory(UPLOAD_DIR, 'uploads');
          }

          archive.finalize();
        })
        .catch((err: any) => {
          console.error('[Backup] Failed to create database backup:', err);
          reject(err);
        });
    } catch (error) {
      console.error('[Backup] Critical error during backup routine:', error);
      reject(error);
    }
  });
}

function cleanOldBackups(backupDir: string) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('studio-') && (f.endsWith('.db') || f.endsWith('.zip')))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 14) {
      const toDelete = files.slice(14);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(backupDir, file.name));
        console.log(`[Backup] Deleted old backup: ${file.name}`);
      }
    }
  } catch (err) {
    console.error('[Backup] Failed to clean old backups:', err);
  }
}
