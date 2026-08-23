const fs = require('fs');
let content = fs.readFileSync('clean_home.tsx', 'utf-8');
let start = content.indexOf('function OrderModal');
let end = content.indexOf('interface CaseStudyModalProps');
let newContent = content.substring(0, start) + newOrderModal + '\n\n' + content.substring(end);
fs.writeFileSync('client/src/pages/Home.tsx', newContent, 'utf-8');