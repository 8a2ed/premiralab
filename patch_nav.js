const fs = require('fs');

let sidebar = fs.readFileSync('client/src/components/admin/Sidebar.tsx', 'utf8');
const lines = sidebar.split('\n');
const tIndex = lines.findIndex(l => l.includes("['testimonials'"));
if (tIndex !== -1 && !sidebar.includes("'faqs'")) {
  lines.splice(tIndex + 1, 0, "  ['faqs', '\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629', HelpCircle],");
  fs.writeFileSync('client/src/components/admin/Sidebar.tsx', lines.join('\n'), 'utf8');
}

let admin = fs.readFileSync('client/src/pages/Admin.tsx', 'utf8');
const aLines = admin.split('\n');
const aIndex = aLines.findIndex(l => l.includes("resource=\"testimonials\""));
if (aIndex !== -1 && !admin.includes("resource=\"faqs\"")) {
  aLines.splice(aIndex + 1, 0, "            {tab === 'faqs'         && <Crud resource=\"faqs\"         title=\"\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629\" onToast={onToast} />}");
  fs.writeFileSync('client/src/pages/Admin.tsx', aLines.join('\n'), 'utf8');
}
