const fs = require('fs');
let code = fs.readFileSync('server/src/routes/public.ts', 'utf8');

code = code.replace(
  "const testimonials = db.prepare('SELECT * FROM testimonials ORDER BY sort_order ASC, id DESC').all();",
  "const testimonials = db.prepare('SELECT * FROM testimonials ORDER BY sort_order ASC, id DESC').all();\n    const faqs         = db.prepare('SELECT * FROM faqs         ORDER BY sort_order ASC, id DESC').all();"
);

code = code.replace(
  "res.json({ site, packages, services, portfolio, testimonials });",
  "res.json({ site, packages, services, portfolio, testimonials, faqs });"
);

fs.writeFileSync('server/src/routes/public.ts', code, 'utf8');
