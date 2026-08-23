const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Home.tsx', 'utf-8');
content = content.replace("'تأكيد وإرسال الطلب'", "'تأكيد الطلب'");
fs.writeFileSync('client/src/pages/Home.tsx', content, 'utf-8');