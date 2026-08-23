const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Home.tsx', 'utf-8');

// Safely split at Stepper Footer Actions
let parts = content.split('{/* Stepper Footer Actions */}');
if (parts.length === 2) {
  let footer = parts[1];
  footer = footer.replace(
    "<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>",
    "<div className=\"stepper-footer-actions\" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', gap: 16 }}>"
  );
  footer = footer.replace("'تأكيد وإرسال الطلب'", "'تأكيد الطلب'");
  content = parts[0] + '{/* Stepper Footer Actions */}' + footer;
  fs.writeFileSync('client/src/pages/Home.tsx', content, 'utf-8');
}
