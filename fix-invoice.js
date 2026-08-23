const fs = require('fs');

const ar = {
  print: "\\u0637\\u0628\\u0627\\u0639\\u0629 / \\u062D\\u0641\\u0638 PDF",
  clientData: "\\u0628\\u064A\\u0627\\u0646\\u0627\\u062A \\u0627\\u0644\\u0639\\u0645\\u064A\\u0644",
  clientName: "\\u0627\\u0644\\u0627\\u0633\\u0645",
  clientPhone: "\\u0631\\u0642\\u0645 \\u0627\\u0644\\u0647\\u0627\\u062A\\u0641",
  clientEmail: "\\u0627\\u0644\\u0628\\u0631\\u064A\\u062F",
  orderDetails: "\\u062A\\u0641\\u0627\\u0635\\u064A\\u0644 \\u0627\\u0644\\u0637\\u0644\\u0628",
  service: "\\u0627\\u0644\\u062E\\u062F\\u0645\\u0629 / \\u0627\\u0644\\u0628\\u0627\\u0642\\u0629",
  deadline: "\\u0645\\u0648\\u0639\\u062F \\u0627\\u0644\\u062A\\u0633\\u0644\\u064A\\u0645",
  status: "\\u0627\\u0644\\u062D\\u0627\\u0644\\u0629",
  notes: "\\u0645\\u0644\\u0627\\u062D\\u0638\\u0627\\u062A",
  item: "\\u0627\\u0644\\u0628\\u0646\\u062F",
  amount: "\\u0627\\u0644\\u0645\\u0628\\u0644\\u063A",
  footer: "\\u062A\\u0645 \\u0625\\u0635\\u062F\\u0627\\u0631 \\u0647\\u0630\\u0647 \\u0627\\u0644\\u0641\\u0627\\u062A\\u0648\\u0631\\u0629 \\u0625\\u0644\\u0643\\u062A\\u0631\\u0648\\u0646\\u064A\\u0627"
};

const newHtml = `const html = \\\`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>Invoice \${safeOrderNo}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 24px; font-weight: 900; color: #111; }
    .brand p { font-size: 13px; color: #666; font-weight: 400; margin: 4px 0 0; }
    .badge { display: inline-block; padding: 4px 10px; background: #f3f4f6; border-radius: 4px; font-size: 12px; font-weight: 600; margin-top: 8px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .section h2 { font-size: 14px; color: #888; text-transform: uppercase; margin: 0 0 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .section label { display: block; font-size: 11px; color: #888; margin-bottom: 2px; }
    .section span { display: block; font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: right; padding: 12px; background: #f9fafb; font-size: 13px; color: #666; border-bottom: 2px solid #eee; }
    td { padding: 15px 12px; border-bottom: 1px solid #eee; font-size: 14px; font-weight: 500; }
    .total { text-align: left; font-weight: 800; font-size: 18px; color: #111; }
    .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; }
    .print-btn { position: fixed; bottom: 30px; right: 30px; background: #111; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">${ar.print}</button>
  <div class="header">
    <div class="brand">\${safeBrand}<p>\${safeEmail} • \${safePhone}</p></div>
    <div style="text-align:left">
      <div style="font-size:28px;font-weight:800;color:#111">\${safeOrderNo}</div>
      <div class="badge">\${safeStatus}</div>
      <div style="font-size:13px;color:#888;margin-top:6px">\${formatDate(order.created_at)}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="section">
      <h2>${ar.clientData}</h2>
      <label>${ar.clientName}</label><span>\${safeClientName}</span>
      <label>${ar.clientPhone}</label><span>\${safeClientPhone}</span>
      <label>${ar.clientEmail}</label><span>\${safeClientEmail}</span>
    </div>
    <div class="section">
      <h2>${ar.orderDetails}</h2>
      <label>${ar.service}</label><span>\${safeItemTitle}</span>
      <label>${ar.deadline}</label><span>\${safeDeadline}</span>
      <label>${ar.status}</label><span>\${safeStatus}</span>
    </div>
  </div>

  \${safeNotes ? \`<div class="section" style="margin-bottom:30px"><h2>${ar.notes}</h2><p style="margin-top:10px;line-height:1.8">\${safeNotes}</p></div>\` : ''}

  <table>
    <thead><tr><th>${ar.item}</th><th style="text-align:left">${ar.amount}</th></tr></thead>
    <tbody>
      <tr>
        <td>\${safeItemTitle}</td>
        <td class="total">\${formatMoney(order.budget)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">${ar.footer} \${safeBrand}.</div>
</body>
</html>\`;`;

let code = fs.readFileSync('server/src/routes/admin/orders.ts', 'utf8');

// Replace everything from `const html = \`<!DOCTYPE html>` to `</html>\`;`
const startIdx = code.indexOf('const html = `<!DOCTYPE html>');
const endIdx = code.indexOf('</html>`;', startIdx) + 9;

code = code.substring(0, startIdx) + newHtml + code.substring(endIdx);
fs.writeFileSync('server/src/routes/admin/orders.ts', code, 'utf8');
