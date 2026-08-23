const fs = require('fs');

let crud = fs.readFileSync('client/src/components/admin/Crud.tsx', 'utf8');

crud = crud.replace(
  "type ResourceName = 'packages' | 'services' | 'portfolio' | 'testimonials';",
  "type ResourceName = 'packages' | 'services' | 'portfolio' | 'testimonials' | 'faqs';"
);

crud = crud.replace(
  "testimonials: ['name', 'role', 'content', 'rating', 'avatar_url', 'sort_order'],",
  "testimonials: ['name', 'role', 'content', 'rating', 'avatar_url', 'sort_order'],\n    faqs:         ['question', 'answer', 'sort_order'],"
);

crud = crud.replace(
  "title: 'O U,O1U+U^O U+', name: 'O U,O O3U.', price: 'O U,O3O1O', description: 'O U,U^OU?',",
  "title: 'O U,O1U+U^O U+', name: 'O U,O O3U.', price: 'O U,O3O1O', description: 'O U,U^OU?', question: '\\u0627\\u0644\\u0633\\u0624\\u0627\\u0644', answer: '\\u0627\\u0644\\u0625\\u062C\\u0627\\u0628\\u0629',"
);

// Fallback replacement if unicode string fails to match:
if (!crud.includes("question: ")) {
  crud = crud.replace(
    /title: .*? description: .*?,/,
    match => match + " question: '\\u0627\\u0644\\u0633\\u0624\\u0627\\u0644', answer: '\\u0627\\u0644\\u0625\\u062C\\u0627\\u0628\\u0629',"
  );
}

fs.writeFileSync('client/src/components/admin/Crud.tsx', crud, 'utf8');
console.log('Crud.tsx patched for faqs');
