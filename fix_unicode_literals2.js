const fs = require('fs');

function unescapeUnicode(str) {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
}

let admin = fs.readFileSync('client/src/pages/Admin.tsx', 'utf8');
admin = unescapeUnicode(admin);
fs.writeFileSync('client/src/pages/Admin.tsx', admin, 'utf8');

let sidebar = fs.readFileSync('client/src/components/admin/Sidebar.tsx', 'utf8');
sidebar = unescapeUnicode(sidebar);
fs.writeFileSync('client/src/components/admin/Sidebar.tsx', sidebar, 'utf8');

let crud = fs.readFileSync('client/src/components/admin/Crud.tsx', 'utf8');
crud = unescapeUnicode(crud);
fs.writeFileSync('client/src/components/admin/Crud.tsx', crud, 'utf8');

console.log('Fixed ALL literal unicodes properly!');
