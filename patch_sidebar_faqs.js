const fs = require('fs');
let sidebar = fs.readFileSync('client/src/components/admin/Sidebar.tsx', 'utf8');

if (!sidebar.includes('HelpCircle')) {
  sidebar = sidebar.replace("import { LayoutDashboard,", "import { LayoutDashboard, HelpCircle,");
  const sbLines = sidebar.split('\\n');
  const sbIdx = sbLines.findIndex(l => l.includes("['testimonials'"));
  if (sbIdx !== -1) {
    sbLines.splice(sbIdx + 1, 0, "    ['faqs', '\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629', HelpCircle],");
    fs.writeFileSync('client/src/components/admin/Sidebar.tsx', sbLines.join('\\n'), 'utf8');
    console.log("Sidebar.tsx fixed");
  }
}
