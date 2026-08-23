const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Home.tsx', 'utf-8');
content = content.replace('import { ExternalLink, MessageCircle, X, CheckCircle2, Copy, Check } from', 'import { ExternalLink, MessageCircle, X, CheckCircle2, Copy, Check, AlertCircle } from');
fs.writeFileSync('client/src/pages/Home.tsx', content, 'utf-8');