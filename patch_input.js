const fs = require('fs');
let code = fs.readFileSync('client/src/pages/Tracker.tsx', 'utf8');

code = code.replace(
  '</div>\\n\\n            {/* Project progress */}',
  `
              <input
                ref={receiptFileRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadReceipt(f); e.target.value = ''; }}
              />
            </div>
            {/* Project progress */}
  `
);

fs.writeFileSync('client/src/pages/Tracker.tsx', code, 'utf8');
