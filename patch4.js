const fs = require('fs');
let code = fs.readFileSync('fix-home3.js', 'utf8');
code = code.replace("fs.readFileSync('clean_home.tsx'", "fs.readFileSync('client/src/pages/Home.tsx'");
code = code.replace("newOrderModal + '\\\\n\\\\n' + content.substring(end)", "newOrderModal + '\\n\\n' + content.substring(end)");
fs.writeFileSync('fix-home4.js', code, 'utf8');
