const fs = require('fs');
let code = fs.readFileSync('server/src/routes/admin/orders.ts', 'utf8');
code = code.replace("const html = \\`<!DOCTYPE html>", "const html = `<!DOCTYPE html>");
code = code.replace("</html>\\`;", "</html>`;");
fs.writeFileSync('server/src/routes/admin/orders.ts', code, 'utf8');
