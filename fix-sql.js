const fs = require('fs');
let content = fs.readFileSync('server/src/routes/tracker.ts', 'utf-8');
content = content.replace(
  'WHERE key IN ("instapay_username", "vodafone_cash", "bank_details", "payment_instructions")',
  "WHERE key IN ('instapay_username', 'vodafone_cash', 'bank_details', 'payment_instructions')"
);
fs.writeFileSync('server/src/routes/tracker.ts', content, 'utf-8');
