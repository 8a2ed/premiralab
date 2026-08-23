const fs = require('fs');
let content = fs.readFileSync('server/src/routes/tracker.ts', 'utf-8');
content = content.replace(
  "    next(err);\\n  }\\n});",
  "    console.error('[Tracker API Error]', err);\\n    res.status(500).json({ error: (err as Error).message, stack: (err as Error).stack });\\n  }\\n});"
);
fs.writeFileSync('server/src/routes/tracker.ts', content, 'utf-8');