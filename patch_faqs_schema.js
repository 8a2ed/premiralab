const fs = require('fs');

let dbCode = fs.readFileSync('server/src/db.ts', 'utf8');

dbCode = dbCode.replace(
  /CREATE TABLE IF NOT EXISTS faqs \([\s\S]*?sort_order\s+INTEGER DEFAULT 0\s*\);/,
  "CREATE TABLE IF NOT EXISTS faqs (\n    id          INTEGER PRIMARY KEY AUTOINCREMENT,\n    question    TEXT    NOT NULL,\n    answer      TEXT    NOT NULL,\n    sort_order  INTEGER DEFAULT 0,\n    created_at  TEXT    NOT NULL,\n    updated_at  TEXT    NOT NULL\n  );"
);

if (!dbCode.includes("ALTER TABLE faqs ADD COLUMN created_at")) {
  dbCode = dbCode.replace(
    /try \{ db\.exec\('ALTER TABLE testimonials ADD COLUMN sort_order .*? \/\* ignore if exists \*\/ \}/,
    match => match + "\ntry { db.exec('ALTER TABLE faqs ADD COLUMN created_at TEXT NOT NULL DEFAULT \"\"'); } catch (e) { /* ignore */ }\ntry { db.exec('ALTER TABLE faqs ADD COLUMN updated_at TEXT NOT NULL DEFAULT \"\"'); } catch (e) { /* ignore */ }"
  );
}

fs.writeFileSync('server/src/db.ts', dbCode, 'utf8');
console.log('db.ts patched with ALTER TABLE for faqs');
