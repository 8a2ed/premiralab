const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Home.tsx', 'utf-8');
content = content.replace(
  "import { ArrowLeft, Star, CheckCircle2, Palette, Monitor, Layout, Copy, Check, MessageCircle, ExternalLink, X, Eye } from 'lucide-react';",
  "import { ArrowLeft, Star, CheckCircle2, Palette, Monitor, Layout, Copy, Check, MessageCircle, ExternalLink, X, Eye, AlertCircle } from 'lucide-react';"
);
fs.writeFileSync('client/src/pages/Home.tsx', content, 'utf-8');