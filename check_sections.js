const fs = require('fs');
const lines = fs.readFileSync('client/src/pages/Home.tsx', 'utf8').split('\n');
lines.forEach((l, i) => { if(l.includes('<section className="section"')) console.log(i + ': ' + l.trim()); });
