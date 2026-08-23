const fs = require('fs');

let crud = fs.readFileSync('server/src/routes/admin/crud.ts', 'utf8');

crud = crud.replace(
  "testimonials: ['name', 'role', 'content', 'rating', 'avatar_url', 'sort_order'],",
  "testimonials: ['name', 'role', 'content', 'rating', 'avatar_url', 'sort_order'],\n  faqs:         ['question', 'answer', 'sort_order'],"
);

crud = crud.replace(
  "(table === 'portfolio' || table === 'testimonials')",
  "(table === 'portfolio' || table === 'testimonials' || table === 'faqs')"
);

fs.writeFileSync('server/src/routes/admin/crud.ts', crud, 'utf8');
console.log('crud.ts updated');
