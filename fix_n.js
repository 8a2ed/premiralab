const fs = require('fs');

function fixFile(f) {
  let code = fs.readFileSync(f, 'utf8');
  code = code.split('\\\\n').join('\\n');
  fs.writeFileSync(f, code, 'utf8');
}

fixFile('client/src/pages/Admin.tsx');
fixFile('client/src/components/admin/Sidebar.tsx');
