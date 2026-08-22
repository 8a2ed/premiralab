import fs from 'node:fs';
import path from 'node:path';
import { db, DATA_DIR } from '../db.js';

export function startBackupJob() {
  const BACKUP_DIR = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Backup immediately on startup (just in case), then every 12 hours
  setTimeout(runBackup, 10000);
  setInterval(runBackup, 12 * 60 * 60 * 1000);

  function runBackup() {
    try {
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `studio-${date}.db`);
      
      console.log(`[Backup] Starting hot database backup...`);
      
      // SQLite Backup API allows safe hot backups without locking the DB
      db.backup(backupPath)
        .then(() => {
          console.log(`[Backup] Successfully created backup: ${backupPath}`);
          cleanOldBackups(BACKUP_DIR);
        })
        .catch((err: any) => {
          console.error('[Backup] Failed to create backup:', err);
        });
    } catch (error) {
      console.error('[Backup] Critical error during backup routine:', error);
    }
  }
}

function cleanOldBackups(backupDir: string) {
  // Keep only the last 14 backups (7 days worth if running twice a day)
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('studio-') && f.endsWith('.db'))
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
