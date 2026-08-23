const fs = require('fs');

const ar = JSON.parse(fs.readFileSync('arabic_dict.json', 'utf8'));

const premiumInvoice = `
              {/* Financial summary */}
              <div style={{ background: 'var(--bg-3)', padding: '24px', borderRadius: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, paddingBottom: 20, borderBottom: '1px dashed var(--border)' }}>
                  <div>
                    <span className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>${ar.totalBudget}</span>
                    <strong style={{ fontSize: 24, color: 'var(--text)' }}>{money(data.budget || 0)}</strong>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>${ar.paidAmount}</span>
                    <strong style={{ fontSize: 20, color: 'var(--primary)' }}>{money(data.paidAmount || 0)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>${ar.remaining}</span>
                  <strong style={{ fontSize: 18, color: (data.budget || 0) - (data.paidAmount || 0) > 0 ? '#ef4444' : '#10b981' }}>
                    {money(Math.max(0, (data.budget || 0) - (data.paidAmount || 0)))}
                  </strong>
                </div>

                {/* Payment Methods */}
                {data.paymentInfo && (data.paymentInfo.instapayUsername || data.paymentInfo.vodafoneCash || data.paymentInfo.bankDetails) && (
                  <div>
                    <h4 style={{ fontSize: 13, margin: '0 0 12px', color: 'var(--text)' }}>${ar.paymentMethods}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      {data.paymentInfo.instapayUsername && (
                        <div style={{ background: 'var(--bg-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--primary-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}>
                          <div>
                            <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>${ar.instapay}</div>
                            <strong style={{ fontSize: 14, direction: 'ltr', display: 'block', color: '#fff' }}>{data.paymentInfo.instapayUsername}</strong>
                          </div>
                          <button className="btn btn--icon" style={{ background: 'var(--bg-3)' }} onClick={() => copyText(data.paymentInfo!.instapayUsername!, 'insta')} title="${ar.copy}">
                            {copiedField === 'insta' ? <Check size={16} className="icon--success" /> : <Copy size={16} />}
                          </button>
                        </div>
                      )}

                      {data.paymentInfo.vodafoneCash && (
                        <div style={{ background: 'var(--bg-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(230,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}>
                          <div>
                            <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>${ar.vodafone}</div>
                            <strong style={{ fontSize: 14, direction: 'ltr', display: 'block', color: '#fff' }}>{data.paymentInfo.vodafoneCash}</strong>
                          </div>
                          <button className="btn btn--icon" style={{ background: 'var(--bg-3)' }} onClick={() => copyText(data.paymentInfo!.vodafoneCash!, 'voda')} title="${ar.copy}">
                            {copiedField === 'voda' ? <Check size={16} className="icon--success" /> : <Copy size={16} />}
                          </button>
                        </div>
                      )}
                    </div>

                    {data.paymentInfo.bankDetails && (
                      <div style={{ background: 'var(--bg-2)', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', marginTop: 12 }}>
                        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>${ar.bank}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'pre-wrap' }}>{data.paymentInfo.bankDetails}</div>
                      </div>
                    )}

                    {data.paymentInfo.paymentInstructions && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 8, marginTop: 14, fontSize: 12.5, lineHeight: 1.6, borderLeft: '3px solid var(--primary)' }}>
                        <strong style={{ display: 'block', marginBottom: 4 }}>${ar.note}</strong>
                        <span className="muted">{data.paymentInfo.paymentInstructions}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
`;

const receiptCode = `
              {/* Receipt Upload */}
              {data.paymentReceipt ? (
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  ${ar.receiptSuccess}
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <button
                    className="btn btn--primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 8 }}
                    onClick={() => receiptFileRef.current?.click()}
                    disabled={uploadingReceipt}
                  >
                    <Upload size={16} /> {uploadingReceipt ? '${ar.uploading}' : '${ar.uploadReceipt}'}
                  </button>
                </div>
              )}
`;

let content = fs.readFileSync('client/src/pages/Tracker.tsx', 'utf-8');
let parts = content.split('{/* Financial summary */}');
let rest = parts[1].split('{/* Project progress */}');

// The pristine file from 3cf63b5 has <div className="card"> before {/* Financial summary */}
// but that card wraps the entire financial section.
// Our new code REPLACES that entire card, so we don't need to put it back exactly, BUT we need to make sure we include the file input!
// Wait, let's look at the pristine Tracker.tsx to see what's actually there.

let newContent = parts[0] + premiumInvoice + receiptCode + \`
              <input
                ref={receiptFileRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadReceipt(f); e.target.value = ''; }}
              />
            </div>

            {/* Project progress */}\` + rest[1];

fs.writeFileSync('client/src/pages/Tracker.tsx', newContent, 'utf-8');
