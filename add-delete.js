const fs = require('fs');

const ar = {
  trash: "\\u062D\\u0630\\u0641",
  confirm: "\\u0647\\u0644 \\u0623\\u0646\\u062A \\u0645\\u062A\\u0623\\u0643\\u062F \\u0645\\u0646 \\u062D\\u0630\\u0641 \\u0647\\u0630\\u0627 \\u0627\\u0644\\u0637\\u0644\\u0628\\u061F"
};

let code = fs.readFileSync('client/src/components/admin/Orders.tsx', 'utf8');

// 1. Add Trash2 import
code = code.replace("DollarSign, Paperclip } from 'lucide-react'", "DollarSign, Paperclip, Trash2 } from 'lucide-react'");

// 2. Replace the Table actions-cell
// We match the whole `<td className="actions-cell"> ... </td>`
const tdStart = code.indexOf('<td className="actions-cell">');
const tdEnd = code.indexOf('</td>', tdStart) + 5;
const tdOld = code.substring(tdStart, tdEnd);

const openInvoiceCall1 = tdOld.match(/onClick=\{[^}]+\}/)?.[0] || "onClick={() => openInvoice(o.id)}";
const ariaLabel = tdOld.match(/aria-label=\{[^}]+\}/)?.[0] || "";
const titleInvoice = tdOld.match(/title="[^"]+"/)?.[0] || `title="Invoice"`;

const tdNew = \`<td className="actions-cell">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn--icon"
                            \${titleInvoice}
                            \${openInvoiceCall1}
                            \${ariaLabel}
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            className="btn btn--icon"
                            title="\${ar.trash}"
                            onClick={() => {
                              if (confirm('\${ar.confirm}')) {
                                api.admin.orders.remove(o.id).then(fetchData);
                              }
                            }}
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>\`;
code = code.replace(tdOld, tdNew);

// 3. Replace Kanban view buttons
const kanbanStart = code.indexOf('<FileText size={13} />');
const kanbanEnd = code.indexOf('</div>', kanbanStart);
const kanbanOld = code.substring(kanbanStart - 50, kanbanEnd + 6);

// the actual string to replace in Kanban:
const toReplace = \`<FileText size={13} />
                              </button>
                            </div>\`;
const replacement = \`<FileText size={13} />
                              </button>
                              <button
                                className="btn btn--icon btn--sm"
                                title="\${ar.trash}"
                                onClick={() => {
                                  if (confirm('\${ar.confirm}')) {
                                    api.admin.orders.remove(o.id).then(fetchData);
                                  }
                                }}
                                style={{ color: '#ef4444' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>\`;

code = code.replace(toReplace, replacement);

fs.writeFileSync('client/src/components/admin/Orders.tsx', code, 'utf8');
