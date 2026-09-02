import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

// ─── Paths ───────────────────────────────────────────────────────────────────
export const DATA_DIR   = process.env.DATA_DIR   || path.resolve(process.cwd(), 'data');
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(DATA_DIR, 'uploads');

try {
  fs.mkdirSync(DATA_DIR,   { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (err) {
  console.error('[db] Notice creating data/uploads dir:', err);
}

// ─── Connection ──────────────────────────────────────────────────────────────
const dbPath = path.join(DATA_DIR, 'studio.db');
console.log(`[db] Initializing database at: ${dbPath}`);
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// ─── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'admin',
    created_at    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  
  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id   INTEGER NOT NULL,
    amount      REAL    NOT NULL,
    type        TEXT    NOT NULL,
    description TEXT,
    created_at  TEXT    NOT NULL,
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS packages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    price       REAL    NOT NULL DEFAULT 0,
    description TEXT    NOT NULL DEFAULT '',
    features    TEXT    NOT NULL DEFAULT '[]',
    popular     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS services (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT 'sparkles',
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS portfolio (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    category    TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    image_url   TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT '',
    content     TEXT    NOT NULL,
    rating      INTEGER NOT NULL DEFAULT 5,
    avatar_url  TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS faqs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question    TEXT    NOT NULL,
    answer      TEXT    NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS promo_codes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    code           TEXT    NOT NULL UNIQUE,
    discount_type  TEXT    NOT NULL,
    discount_value REAL    NOT NULL,
    max_uses       INTEGER DEFAULT NULL,
    current_uses   INTEGER NOT NULL DEFAULT 0,
    expires_at     TEXT    DEFAULT NULL,
    active         INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clients (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    phone          TEXT    NOT NULL,
    email          TEXT    NOT NULL DEFAULT '',
    password_hash  TEXT,
    reset_token    TEXT,
    reset_expires  TEXT,
    wallet_balance REAL    NOT NULL DEFAULT 0,
    points         INTEGER NOT NULL DEFAULT 0,
    referral_code  TEXT    UNIQUE,
    referred_by    INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no               TEXT    UNIQUE NOT NULL,
    client_id              INTEGER NOT NULL,
    package_id             INTEGER,
    service_id             INTEGER,
    project_type           TEXT    NOT NULL DEFAULT '',
    notes                  TEXT    NOT NULL DEFAULT '',
    status                 TEXT    NOT NULL DEFAULT 'new',
    payment_status         TEXT    NOT NULL DEFAULT 'pending_approval',
    payment_method         TEXT,
    payment_receipt        TEXT,
    payment_amount         REAL    DEFAULT 0,
    paid_amount            REAL    DEFAULT 0,
    payment_transaction_id TEXT,
    payment_approved_at    TEXT,
    review_notes           TEXT,
    budget                 REAL,
    deadline               TEXT,
    promo_code             TEXT,
    promo_discount         TEXT,
    created_at             TEXT    NOT NULL,
    updated_at             TEXT    NOT NULL,
    FOREIGN KEY(client_id)  REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE SET NULL,
    FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER UNIQUE NOT NULL,
    title      TEXT    NOT NULL,
    progress   INTEGER NOT NULL DEFAULT 0,
    status     TEXT    NOT NULL DEFAULT 'new',
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS revisions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'pending',
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS files (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id    INTEGER NOT NULL,
    original_name TEXT    NOT NULL,
    stored_name   TEXT    NOT NULL,
    mime_type     TEXT    NOT NULL,
    size          INTEGER NOT NULL,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER,
    action    TEXT    NOT NULL,
    entity    TEXT    NOT NULL,
    entity_id INTEGER,
    metadata  TEXT    NOT NULL DEFAULT '{}',
    created_at TEXT   NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    type       TEXT    NOT NULL DEFAULT 'info',
    read       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
  );
`);

// ─── Indexes (idempotent) ────────────────────────────────────────────────────
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_orders_client_id   ON orders(client_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_package_id   ON orders(package_id);
  CREATE INDEX IF NOT EXISTS idx_orders_service_id   ON orders(service_id);
  CREATE INDEX IF NOT EXISTS idx_projects_order_id   ON projects(order_id);
  CREATE INDEX IF NOT EXISTS idx_revisions_proj      ON revisions(project_id);
  CREATE INDEX IF NOT EXISTS idx_files_project_id    ON files(project_id);
  CREATE INDEX IF NOT EXISTS idx_activity_user_id    ON activity_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_entity     ON activity_log(entity, entity_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_read  ON notifications(read);
`);

// ─── Safe Idempotent Column Additions for Existing Databases ───────────────────
  try { db.exec('ALTER TABLE files ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE portfolio ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE testimonials ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE faqs ADD COLUMN created_at TEXT NOT NULL DEFAULT ""'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE faqs ADD COLUMN updated_at TEXT NOT NULL DEFAULT ""'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE clients ADD COLUMN password_hash TEXT'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE clients ADD COLUMN reset_token TEXT'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE clients ADD COLUMN reset_expires TEXT'); } catch (e) { /* ignore */ }

// Clients: wallet, points, referral (existing DBs)
try { db.exec('ALTER TABLE clients ADD COLUMN wallet_balance REAL NOT NULL DEFAULT 0'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE clients ADD COLUMN points INTEGER NOT NULL DEFAULT 0'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE clients ADD COLUMN referral_code TEXT'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE clients ADD COLUMN referred_by INTEGER'); } catch (e) { /* ignore */ }

try { db.exec('ALTER TABLE orders ADD COLUMN paid_amount REAL DEFAULT 0;'); } catch (e) { /* ignore */ }
  try { db.exec('ALTER TABLE orders ADD COLUMN wallet_used REAL DEFAULT 0'); } catch (e) { /* ignore */ }
  try { db.exec('ALTER TABLE orders ADD COLUMN points_granted INTEGER DEFAULT 0'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE orders ADD COLUMN payment_receipt TEXT;'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE orders ADD COLUMN payment_method TEXT;'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE orders ADD COLUMN promo_code TEXT;'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE orders ADD COLUMN promo_discount TEXT;'); } catch (e) { /* ignore */ }
try { db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending_approval';"); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE orders ADD COLUMN payment_approved_at TEXT;'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE orders ADD COLUMN payment_amount REAL DEFAULT 0;'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE orders ADD COLUMN payment_transaction_id TEXT;'); } catch (e) { /* ignore */ }
try { db.exec('ALTER TABLE orders ADD COLUMN review_notes TEXT;'); } catch (e) { /* ignore */ }

export { db };
export const now = () => new Date().toISOString();
