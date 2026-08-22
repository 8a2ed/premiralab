import fs from 'node:fs';
import path from 'node:path';
import { db, DATA_DIR } from '../db.js';
import { sendTelegramAlert } from './telegram.js';

export function startDailyHealthReport() {
  // Track the last report date to avoid duplicates
  let lastReportDate = new Date().toISOString().split('T')[0];

  // Send a boot alert when the server spins up
  sendTelegramAlert(`🟢 <b>System Booted</b>\nPremiraLab Studio platform just came online! (Uptime clock reset)`).catch(() => {});

  // Check every hour if it is time to send the daily report
  setInterval(async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0];

    // Fire the report at 8:00 AM local server time
    if (currentHour === 8 && lastReportDate !== today) {
      lastReportDate = today;
      await generateAndSendReport();
    }
  }, 60 * 60 * 1000);
}

function getDatabaseSize(): string {
  try {
    const stat = fs.statSync(path.join(DATA_DIR, 'studio.db'));
    return (stat.size / (1024 * 1024)).toFixed(2) + ' MB';
  } catch {
    return 'Unknown';
  }
}

async function generateAndSendReport() {
  try {
    // 1. Gather Analytics from SQLite
    const usersCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
    const ordersCount = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
    const activeProjects = (db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'active'").get() as any).c;
    const unreadNotifs = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE is_read = 0').get() as any).c;

    const dbSize = getDatabaseSize();
    const uptimeDays = (process.uptime() / (60 * 60 * 24)).toFixed(1);

    const report = `
📊 <b>Daily Health & Analytics Report</b>

🟢 <b>System Status</b>
• Uptime: ${uptimeDays} Days
• Database Size: ${dbSize}

📈 <b>Platform Stats</b>
• Total Orders: ${ordersCount}
• Active Projects: ${activeProjects}
• Registered Users: ${usersCount}
• Unread Alerts: ${unreadNotifs > 0 ? `🚨 ${unreadNotifs}` : '0'}

<i>All systems operating nominally.</i>
`.trim();

    await sendTelegramAlert(report);
  } catch (err) {
    console.error('[Health Report] Failed to generate daily report:', err);
  }
}
