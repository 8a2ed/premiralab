const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Home.tsx', 'utf-8');
content = content.replace(
  /{[\s\S]*?\/\* Stepper Footer Actions \*\/[\s\S]*?<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var\(--border\)' }}>/,
  `      {/* Stepper Footer Actions */}
      <div className="stepper-footer-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', gap: 16 }}>`
);
fs.writeFileSync('client/src/pages/Home.tsx', content, 'utf-8');