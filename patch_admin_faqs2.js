const fs = require('fs');

let admin = fs.readFileSync('client/src/pages/Admin.tsx', 'utf8');
const searchAdmin = "{tab === 'testimonials' && <Crud resource=\"testimonials\"";
const lines = admin.split('\\n');
const insertIdx = lines.findIndex(l => l.includes("resource=\"testimonials\""));
if (insertIdx !== -1 && !admin.includes("resource=\"faqs\"")) {
  lines.splice(insertIdx + 1, 0, "            {tab === 'faqs'         && <Crud resource=\"faqs\"         title=\"\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629\" onToast={onToast} />}");
  fs.writeFileSync('client/src/pages/Admin.tsx', lines.join('\\n'), 'utf8');
  console.log("Admin.tsx updated");
}

let sidebar = fs.readFileSync('client/src/components/admin/Sidebar.tsx', 'utf8');
if (!sidebar.includes("'faqs'")) {
  sidebar = sidebar.replace(" | 'promo'", " | 'faqs' | 'promo'");
  sidebar = sidebar.replace("import { LayoutDashboard,", "import { LayoutDashboard, HelpCircle,");
  
  const sbLines = sidebar.split('\\n');
  const sbIdx = sbLines.findIndex(l => l.includes("['testimonials'"));
  if (sbIdx !== -1) {
    sbLines.splice(sbIdx + 1, 0, "    ['faqs', '\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629', HelpCircle],");
    fs.writeFileSync('client/src/components/admin/Sidebar.tsx', sbLines.join('\\n'), 'utf8');
    console.log("Sidebar.tsx updated");
  }
}
