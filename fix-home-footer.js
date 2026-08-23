const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Home.tsx', 'utf-8');

// Replace footer div
content = content.replace(
  /<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var\(--border\)' }}>/,
  "<div className=\"stepper-footer-actions\" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', gap: 16 }}>"
);

// Replace button text
content = content.replace(
  "{loading ? 'جاري الإرسال...' : 'تأكيد وإرسال الطلب'}",
  "{loading ? 'جاري الإرسال...' : 'تأكيد الطلب'}"
);

fs.writeFileSync('client/src/pages/Home.tsx', content, 'utf-8');
