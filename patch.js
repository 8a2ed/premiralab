const fs = require('fs');
let code = fs.readFileSync('fix-home2.js', 'utf8');
code = code.replace("let parts = content.split('function OrderModal({');", "let start = content.indexOf('function OrderModal');");
code = code.replace("let rest = parts[1].split('interface CaseStudyModalProps {');", "let end = content.indexOf('interface CaseStudyModalProps {');");
code = code.replace("let newContent = parts[0] + newOrderModal + '\\n\\ninterface CaseStudyModalProps {' + rest[1];", "let newContent = content.substring(0, start) + newOrderModal + '\\n\\n' + content.substring(end);");
fs.writeFileSync('fix-home2.js', code, 'utf8');
