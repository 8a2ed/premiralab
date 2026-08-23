const fs = require('fs');
let code = fs.readFileSync('server/src/db.ts', 'utf8');
code = code.replace(
  "export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');",
  "export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(DATA_DIR, 'uploads');"
);
fs.writeFileSync('server/src/db.ts', code, 'utf8');
