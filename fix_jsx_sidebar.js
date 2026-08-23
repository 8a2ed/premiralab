const fs = require('fs');

// 1. Fix Home.tsx literals
let home = fs.readFileSync('client/src/pages/Home.tsx', 'utf8');
home = home.replace(/>\\u0622\\u0631\\u0627\\u0621 \\u0627\\u0644\\u0639\\u0645\\u0644\\u0627\\u0621</g, '>{"\\u0622\\u0631\\u0627\\u0621 \\u0627\\u0644\\u0639\\u0645\\u0644\\u0627\\u0621"}<');
home = home.replace(/>\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629</g, '>{"\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629"}<');
home = home.replace(/>\\u0625\\u062C\\u0627\\u0628\\u0627\\u062A \\u0633\\u0631\\u064A\\u0639\\u0629 \\u0644\\u0623\\u0643\\u062B\\u0631 \\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0634\\u064A\\u0648\\u0639\\u0627\\u064B.</g, '>{"\\u0625\\u062C\\u0627\\u0628\\u0627\\u062A \\u0633\\u0631\\u064A\\u0639\\u0629 \\u0644\\u0623\\u0643\\u062B\\u0631 \\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0634\\u064A\\u0648\\u0639\\u0627\\u064B."}<');
fs.writeFileSync('client/src/pages/Home.tsx', home, 'utf8');

// 2. Fix Sidebar.tsx NAV_ITEMS
let sidebar = fs.readFileSync('client/src/components/admin/Sidebar.tsx', 'utf8');
if (!sidebar.includes("['faqs'")) {
  sidebar = sidebar.replace(
    "['testimonials', 'O U,OU,USUSU.O O',     Star],",
    "['testimonials', 'O U,OU,USUSU.O O',     Star],\n  ['faqs',         '\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629', HelpCircle],"
  );
  // Also try with unicode matching in case it's literal
  sidebar = sidebar.replace(
    /\[\'testimonials\',\s*.*?,\s*Star\],/,
    match => match + "\n  ['faqs',         '\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629', HelpCircle],"
  );
  // De-duplicate if it got added twice
  const faqMatches = sidebar.match(/\['faqs'/g);
  if (faqMatches && faqMatches.length > 1) {
    sidebar = sidebar.replace("\n  ['faqs',         '\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629', HelpCircle],", "");
  }
  fs.writeFileSync('client/src/components/admin/Sidebar.tsx', sidebar, 'utf8');
}

console.log('Fixed JSX unicode strings and Sidebar NAV_ITEMS');
