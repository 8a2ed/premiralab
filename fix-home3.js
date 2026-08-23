const fs = require('fs');

const ar = JSON.parse(fs.readFileSync('arabic_dict_home.json', 'utf8'));

const newOrderModal = `function OrderModal({ packages, services, defaultPackage, initialProjectType, onClose, onDone }: OrderModalProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [f, setF] = useState({
    name: '', phone: '', email: '',
    packageId: defaultPackage ? String(defaultPackage.id) : '',
    serviceId: '',
    projectType: initialProjectType || '',
    budget: '', deadline: '', notes: '',
  });
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState<{ orderNo: string } | null>(null);

  const updateF = (updates: Partial<typeof f>) => {
    setError('');
    setF(prev => ({ ...prev, ...updates }));
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.order({
        name: f.name, phone: f.phone, email: f.email || undefined,
        packageId:   f.packageId ? Number(f.packageId) : undefined,
        serviceId:   f.serviceId ? Number(f.serviceId) : undefined,
        projectType: f.projectType,
        notes:       f.notes,
        budget:      f.budget ? Number(f.budget) : undefined,
        deadline:    f.deadline || undefined,
      });
      setSubmitted({ orderNo: res.orderNo });
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  };

  const [copied, setCopied] = useState(false);
  const copyTrackerUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  if (submitted) {
    const trackerUrl = \`\${window.location.origin}/?track=\${submitted.orderNo}\`;
    return (
      <Modal title="${ar.receivedSuccess}" onClose={onClose}>
        <div className="order-success" style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={56} className="icon--success" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 24, marginBottom: 8 }}>${ar.thanks}</h3>
          <p style={{ fontSize: 16 }}>${ar.orderNo} <strong style={{ color: 'var(--primary)', fontSize: 18, background: 'var(--primary-dim)', padding: '4px 10px', borderRadius: 8 }}>{submitted.orderNo}</strong></p>
          <p className="muted" style={{ maxWidth: 400, margin: '16px auto' }}>${ar.savedOrder}</p>
          
          <div style={{ background: 'var(--bg-2)', padding: 20, borderRadius: 16, border: '1px solid var(--border)', marginTop: 24 }}>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>${ar.trackerLink}</p>
            <a href={trackerUrl} style={{ color: 'var(--text)', display: 'block', marginBottom: 16, wordBreak: 'break-all', fontWeight: 600 }} target="_blank" rel="noopener">{trackerUrl}</a>
            <button className="btn btn--sm" onClick={() => copyTrackerUrl(trackerUrl)} style={{ width: '100%', justifyContent: 'center' }} type="button">
              {copied ? <><Check size={16} className="icon--success" /> ${ar.copied}</> : <><Copy size={16} /> ${ar.copyTracker}</>}
            </button>
          </div>
          <button className="btn btn--primary" onClick={onClose} style={{ marginTop: 20, width: '100%' }}>${ar.close}</button>
        </div>
      </Modal>
    );
  }

  const nextStep = () => {
    setError('');
    
    if (step === 1) {
      if (!f.packageId && !f.serviceId && !f.projectType) {
        setError('${ar.selectPackage}');
        return;
      }
    }
    
    if (step === 2) {
      // notes/budget are optional
    }
    
    if (step === 3) {
      if (!f.name || !f.phone) {
        setError('${ar.namePhoneRequired}');
        return;
      }
      
      const phoneRegex = /^01\\d{9}$/;
      if (!phoneRegex.test(f.phone.trim())) {
        setError('${ar.invalidPhone}');
        return;
      }
      
      if (f.email) {
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(f.email.trim())) {
          setError('${ar.invalidEmail}');
          return;
        }
      }
    }
    
    setStep(s => s + 1);
  };

  const steps = [
    { num: 1, title: '${ar.s1}' },
    { num: 2, title: '${ar.s2}' },
    { num: 3, title: '${ar.s3}' },
    { num: 4, title: '${ar.s4}' }
  ];

  return (
    <Modal title="${ar.startProject}" onClose={onClose} size="lg">
      <div style={{ marginBottom: 30 }}>
        {/* Stepper Header */}
        <div className="stepper-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', maxWidth: 500, margin: '0 auto', padding: '0 10px' }}>
          <div style={{ position: 'absolute', top: 16, left: 10, right: 10, height: 2, background: 'var(--border)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 16, right: 10, height: 2, background: 'var(--primary)', zIndex: 1, transition: '0.3s', width: \`calc(\${((step - 1) / (steps.length - 1)) * 100}% - 20px)\` }} />
          
          {steps.map(s => (
            <div key={s.num} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, transition: '0.3s',
                background: step >= s.num ? 'var(--primary)' : 'var(--bg-3)', 
                color: step >= s.num ? '#fff' : 'var(--muted)',
                border: \`2px solid \${step >= s.num ? 'var(--primary)' : 'var(--border)'}\`,
                boxShadow: step === s.num ? '0 0 0 4px var(--primary-dim)' : 'none'
              }}>
                {step > s.num ? <Check size={16} /> : s.num}
              </div>
              <span style={{ fontSize: 11, fontWeight: step === s.num ? 700 : 500, color: step >= s.num ? 'var(--text)' : 'var(--muted)' }}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ minHeight: 280, position: 'relative' }}>
        {error && (
          <div className="animation-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>${ar.whatService}</h3>
            <div className="grid grid-2" style={{ gap: 20 }}>
              <div className="form-field">
                <label className="form-label" htmlFor="order-pkg">${ar.readyPackages}</label>
                <select id="order-pkg" className="select" style={{ padding: 14, fontSize: 15, borderColor: error && !f.packageId && !f.serviceId && !f.projectType ? '#ef4444' : undefined }} value={f.packageId} onChange={e => updateF({ packageId: e.target.value, serviceId: e.target.value ? '' : f.serviceId })}>
                  <option value="">${ar.choosePackage}</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.title} — {money(p.price)}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-svc">${ar.singleServices}</label>
                <select id="order-svc" className="select" style={{ padding: 14, fontSize: 15, borderColor: error && !f.packageId && !f.serviceId && !f.projectType ? '#ef4444' : undefined }} value={f.serviceId} onChange={e => updateF({ serviceId: e.target.value, packageId: e.target.value ? '' : f.packageId })}>
                  <option value="">${ar.chooseService}</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <div className="muted" style={{ fontSize: 12 }}>${ar.orCustom}</div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="order-type">${ar.customType}</label>
              <input id="order-type" className="input" style={{ padding: 14, borderColor: error && !f.packageId && !f.serviceId && !f.projectType ? '#ef4444' : undefined }} placeholder="${ar.customEx}" value={f.projectType} onChange={e => updateF({ projectType: e.target.value })} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>${ar.detailsTitle}</h3>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="order-budget">${ar.budgetOptional}</label>
                <div style={{ position: 'relative' }}>
                  <input id="order-budget" className="input" style={{ padding: 14, paddingRight: 45 }} type="number" min="0" placeholder="5000" value={f.budget} onChange={e => updateF({ budget: e.target.value })} />
                  <span style={{ position: 'absolute', right: 14, top: 14, color: 'var(--muted)', fontSize: 14 }}>${ar.currency}</span>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-deadline">${ar.deadline}</label>
                <input id="order-deadline" className="input" style={{ padding: 14 }} type="date" value={f.deadline} onChange={e => updateF({ deadline: e.target.value })} />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 20 }}>
              <label className="form-label" htmlFor="order-notes">${ar.projectNotes}</label>
              <textarea id="order-notes" className="textarea" rows={4} maxLength={2000} style={{ padding: 14 }}
                placeholder="${ar.notesEx}"
                value={f.notes} onChange={e => updateF({ notes: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>${ar.howToContact}</h3>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="order-name">${ar.fullName}</label>
              <input id="order-name" className="input" style={{ padding: 14, borderColor: error && !f.name ? '#ef4444' : undefined }} required placeholder="محمد أحمد" value={f.name} onChange={e => updateF({ name: e.target.value })} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="order-phone">${ar.phone}</label>
                <input id="order-phone" className="input" style={{ padding: 14, direction: 'ltr', textAlign: 'right', borderColor: error && !f.phone ? '#ef4444' : undefined }} required placeholder="01xxxxxxxxx" value={f.phone} onChange={e => updateF({ phone: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-email">${ar.emailOptional}</label>
                <input id="order-email" className="input" style={{ padding: 14 }} type="email" placeholder="email@example.com" value={f.email} onChange={e => updateF({ email: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18, textAlign: 'center' }}>${ar.reviewOrder}</h3>
            <div style={{ background: 'var(--bg-2)', borderRadius: 16, border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>${ar.nameLabel}</span><strong>{f.name}</strong></div>
                <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>${ar.phoneLabel}</span><strong style={{ direction: 'ltr', display: 'inline-block' }}>{f.phone}</strong></div>
                
                {f.packageId && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>${ar.packageLabel}</span><strong style={{ color: 'var(--primary)' }}>{packages.find(p => p.id === Number(f.packageId))?.title}</strong></div>}
                {f.serviceId && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>${ar.serviceLabel}</span><strong style={{ color: 'var(--primary)' }}>{services.find(s => s.id === Number(f.serviceId))?.title}</strong></div>}
                {f.projectType && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>${ar.typeLabel}</span><strong>{f.projectType}</strong></div>}
                
                {f.budget && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>${ar.budgetLabel}</span><strong>{money(Number(f.budget))}</strong></div>}
                {f.deadline && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>${ar.deadlineLabel}</span><strong>{f.deadline}</strong></div>}
              </div>
              {f.notes && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <span className="muted" style={{ fontSize: 12, display: 'block' }}>${ar.notesLabel}</span>
                  <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{f.notes}</p>
                </div>
              )}
              
              <div style={{ marginTop: 24, padding: '16px', background: 'rgba(205, 69, 205, 0.05)', borderRadius: 12, border: '1px dashed var(--primary-dim)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
                  <strong style={{ fontSize: 14 }}>${ar.paymentInfoTitle}</strong>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  ${ar.paymentInfoDesc}
                  <br />
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>${ar.paymentOptions}</span>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer Actions */}
      <div className="stepper-footer-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', gap: 16 }}>
        {step > 1 ? (
          <button type="button" className="btn" onClick={() => setStep(s => s - 1)} disabled={loading}>${ar.btnPrev}</button>
        ) : (
          <button type="button" className="btn" onClick={onClose} style={{ color: 'var(--muted)', background: 'transparent', borderColor: 'transparent' }}>${ar.btnCancel}</button>
        )}
        
        {step < 4 ? (
          <button type="button" className="btn btn--primary" onClick={nextStep} style={{ minWidth: 120 }}>${ar.btnNext}</button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={submit} disabled={loading} style={{ minWidth: 140, boxShadow: '0 0 24px var(--primary-dim)' }}>
            {loading ? '${ar.sending}' : '${ar.btnSubmit}'}
          </button>
        )}
      </div>
    </Modal>
  );
}`;

let content = fs.readFileSync('clean_home.tsx', 'utf-8');

// Ensure AlertCircle is imported
content = content.replace(
  "import { ArrowLeft, Star, CheckCircle2, Palette, Monitor, Layout, Copy, Check, MessageCircle, ExternalLink, X, Eye } from 'lucide-react';",
  "import { ArrowLeft, Star, CheckCircle2, Palette, Monitor, Layout, Copy, Check, MessageCircle, ExternalLink, X, Eye, AlertCircle } from 'lucide-react';"
);

let start = content.indexOf('function OrderModal');
let end = content.indexOf('interface CaseStudyModalProps');
let newContent = content.substring(0, start) + newOrderModal + '\\n\\n' + content.substring(end);

fs.writeFileSync('client/src/pages/Home.tsx', newContent, 'utf-8');
