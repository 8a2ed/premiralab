import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';

import crypto from 'node:crypto';

// ─── JWT_SECRET Configuration ────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️ [security] JWT_SECRET environment variable is not set. Generated a secure runtime secret. For session persistence across restarts, set JWT_SECRET in your Railway Variables.');
}

// ─── DB & Services (must come after dotenv, before routes) ────────────────────
import { db, UPLOAD_DIR } from './db.js';
import { seed } from './seed.js';
import { startBackupJob } from './services/backup.js';
import { initializeLogger } from './services/logger.js';
import { startDailyHealthReport } from './services/healthReport.js';

// Start background services
initializeLogger();
startBackupJob();
startDailyHealthReport();

// ─── Routes ───────────────────────────────────────────────────────────────────
import authRouter         from './routes/auth.js';
import publicRouter       from './routes/public.js';
import ordersRouter       from './routes/orders.js';
import trackerRouter      from './routes/tracker.js';
import crudRouter         from './routes/admin/crud.js';
import adminOrdersRouter  from './routes/admin/orders.js';
import adminClientsRouter from './routes/admin/clients.js';
import projectsRouter     from './routes/admin/projects.js';
import filesRouter        from './routes/admin/files.js';
import notifRouter        from './routes/admin/notifications.js';
import analyticsRouter    from './routes/admin/analytics.js';
import settingsRouter     from './routes/admin/settings.js';
import securityRouter     from './routes/admin/security.js';
import exportRouter       from './routes/admin/export.js';
import promoRouter        from './routes/admin/promo.js';
import { errorHandler }   from './middleware/errorHandler.js';

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

app.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", // For theme toggles in index.html & GA inline scripts
        "https://www.googletagmanager.com", // Google Analytics
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "http:", "https:"], // Allow images from external sources
      connectSrc: [
        "'self'", 
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://stats.g.doubleclick.net"
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  }
}));
app.use(compression());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Serve uploaded files (static assets — with security headers to prevent stored XSS via SVG/HTML)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true }));

// Global rate limiter (after static files)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

import clientAuthRouter   from './routes/client/auth.js';
import clientDashRouter   from './routes/client/dashboard.js';

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ─── Public routes ────────────────────────────────────────────────────────────
app.use('/api/auth',    authRouter);
app.use('/api/public',  publicRouter);
app.use('/api/orders',  ordersRouter);
app.use('/api/track',   trackerRouter);

// ─── Client routes ────────────────────────────────────────────────────────────
app.use('/api/client/auth',      clientAuthRouter);
app.use('/api/client/dashboard', clientDashRouter);

// ─── Admin routes ─────────────────────────────────────────────────────────────
app.use('/api/admin/analytics',    analyticsRouter);
app.use('/api/admin/orders',       adminOrdersRouter);
app.use('/api/admin/clients',      adminClientsRouter);
app.use('/api/admin/projects',     projectsRouter);
app.use('/api/admin/notifications', notifRouter);
app.use('/api/admin/settings',     settingsRouter);
app.use('/api/admin/security',     securityRouter);
app.use('/api/admin/export',       exportRouter);
app.use('/api/admin/promo',        promoRouter);
app.use('/api/admin/activity',     exportRouter);  // activity is also in the export router

// File uploads (scoped to project)
app.use('/api/admin/projects', filesRouter);

// Generic CRUD last (so more specific routes above take precedence)
app.use('/api/admin', crudRouter);

// ─── Serve Frontend in Production ─────────────────────────────────────────────
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
];
const CLIENT_DIST = candidatePaths.find(p => fs.existsSync(p));

if (CLIENT_DIST) {
  console.log(`[static] Serving frontend from: ${CLIENT_DIST}`);
  app.use(express.static(CLIENT_DIST, { maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    }
    next();
  });
} else {
  console.warn('[static] Frontend client/dist folder not found. API is running, but no static files will be served.');
}

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await seed();
  } catch (err) {
    console.error('[startup] Seed failed:', err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`\n✅ Studio API running on http://localhost:${PORT}`);
    console.log(`   Client origin: ${CLIENT_ORIGIN}`);
  });

  // ─── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }
    server.close(() => {
      try { db.close(); } catch { /* already closed */ }
      console.log('[shutdown] Database closed. Goodbye.');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('[fatal]', err);
  process.exit(1);
});
