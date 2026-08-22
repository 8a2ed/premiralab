import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { DATA_DIR } from '../db.js';

export function initializeLogger() {
  const LOGS_DIR = path.join(DATA_DIR, 'logs');
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  const getLogFilePath = () => {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(LOGS_DIR, `server-${date}.log`);
  };

  // Keep a stream open for maximum performance
  let currentLogDate = new Date().toISOString().split('T')[0];
  let logStream = fs.createWriteStream(getLogFilePath(), { flags: 'a' });

  // Rotate log file at midnight
  setInterval(() => {
    const today = new Date().toISOString().split('T')[0];
    if (today !== currentLogDate) {
      currentLogDate = today;
      logStream.end();
      logStream = fs.createWriteStream(getLogFilePath(), { flags: 'a' });
      cleanOldLogs(LOGS_DIR);
    }
  }, 60 * 60 * 1000); // Check every hour

  function cleanOldLogs(dir: string) {
    try {
      const files = fs.readdirSync(dir)
        .filter(f => f.startsWith('server-') && f.endsWith('.log'))
        .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      // Keep only the last 7 days of logs to save disk space
      if (files.length > 7) {
        files.slice(7).forEach(file => fs.unlinkSync(path.join(dir, file.name)));
      }
    } catch (e) {
      // Silently ignore cleanup errors
    }
  }

  // Intercept standard console outputs to pipe them to our persistent log file
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  function writeLog(level: string, args: any[]) {
    // Safely format objects/errors with util.inspect to avoid JSON.stringify circular errors
    const msg = args.map(a => typeof a === 'string' ? a : util.inspect(a, { depth: 3 })).join(' ');
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${msg}\n`;
    logStream.write(line);
  }

  console.log = function (...args) {
    writeLog('INFO', args);
    originalLog.apply(console, args);
  };

  console.error = function (...args) {
    writeLog('ERROR', args);
    originalError.apply(console, args);
  };

  console.warn = function (...args) {
    writeLog('WARN', args);
    originalWarn.apply(console, args);
  };

  // Run cleanup on boot
  cleanOldLogs(LOGS_DIR);
  
  console.log('"[System] Persistent logger initialized."');
}
