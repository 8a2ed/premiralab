const fs = require('fs');

// 1. Update Admin.tsx
let admin = fs.readFileSync('client/src/pages/Admin.tsx', 'utf8');
admin = admin.replace(
  "{tab === 'testimonials' && <Crud resource=\"testimonials\" title=\"\\u0627\\u0644\\u062A\\u0642\\u064A\\u064A\\u0645\\u0627\\u062A\"  onToast={onToast} />}",
  "{tab === 'testimonials' && <Crud resource=\"testimonials\" title=\"\\u0627\\u0644\\u062A\\u0642\\u064A\\u064A\\u0645\\u0627\\u062A\"  onToast={onToast} />}\n            {tab === 'faqs'         && <Crud resource=\"faqs\"         title=\"\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629\" onToast={onToast} />}"
);
fs.writeFileSync('client/src/pages/Admin.tsx', admin, 'utf8');

// 2. Update Sidebar.tsx
let sidebar = fs.readFileSync('client/src/components/admin/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  "| 'packages'  | 'services' | 'portfolio' | 'testimonials' | 'promo'",
  "| 'packages'  | 'services' | 'portfolio' | 'testimonials' | 'faqs' | 'promo'"
);
// Import HelpCircle if needed
if (!sidebar.includes('HelpCircle')) {
  sidebar = sidebar.replace(
    "import { LayoutDashboard,",
    "import { LayoutDashboard, HelpCircle,"
  );
}
sidebar = sidebar.replace(
  "['testimonials', '\\u0627\\u0644\\u062A\\u0642\\u064A\\u064A\\u0645\\u0627\\u062A',     Star],",
  "['testimonials', '\\u0627\\u0644\\u062A\\u0642\\u064A\\u064A\\u0645\\u0627\\u062A',     Star],\n  ['faqs',         '\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629', HelpCircle],"
);
fs.writeFileSync('client/src/components/admin/Sidebar.tsx', sidebar, 'utf8');

console.log('Sidebar and Admin updated');
