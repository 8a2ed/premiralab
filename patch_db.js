const fs = require('fs');

let dbCode = fs.readFileSync('server/src/db.ts', 'utf8');

if (!dbCode.includes('CREATE TABLE IF NOT EXISTS faqs')) {
  const insertQuery = `
  CREATE TABLE IF NOT EXISTS faqs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question    TEXT    NOT NULL,
    answer      TEXT    NOT NULL,
    sort_order  INTEGER DEFAULT 0
  );
  `;
  
  dbCode = dbCode.replace(
    /CREATE TABLE IF NOT EXISTS testimonials.*?\);/s,
    match => match + '\n' + insertQuery
  );
  fs.writeFileSync('server/src/db.ts', dbCode, 'utf8');
  console.log('db.ts patched with faqs table!');
} else {
  console.log('Already patched.');
}
