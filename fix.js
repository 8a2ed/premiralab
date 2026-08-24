const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Home.tsx', 'utf-8');

const newOrderModal = `function OrderModal({ packages, services, defaultPackage, initialProjectType, onClose, onDone }: OrderModalProps) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    name: '', phone: '', email: '',
    packageId: defaultPackage ? String(defaultPackage.id) : '',
    serviceId: '',
    projectType: initialProjectType || '',
    budget: '', deadline: '', notes: '',
  });
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState<{ orderNo: string } | null>(null);

  const submit = async () => {
    setLoading(true);
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
      onDone((err as Error).message, 'error');
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
      <Modal title="تم استلام طلبك بنجاح ✨" onClose={onClose}>
        <div className="order-success" style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={56} className="icon--success" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 24, marginBottom: 8 }}>شكرًا لثقتك بنا!</h3>
          <p style={{ fontSize: 16 }}>رقم طلبك: <strong style={{ color: 'var(--primary)', fontSize: 18, background: 'var(--primary-dim)', padding: '4px 10px', borderRadius: 8 }}>{submitted.orderNo}</strong></p>
          <p className="muted" style={{ maxWidth: 400, margin: '16px auto' }}>تم حفظ طلبك وسيتم مراجعته والتواصل معك قريبًا. يمكنك متابعة حالة الطلب في أي وقت.</p>
          
          <div style={{ background: 'var(--bg-2)', padding: 20, borderRadius: 16, border: '1px solid var(--border)', marginTop: 24 }}>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>رابط المتابعة الخاص بك (احتفظ به):</p>
            <a href={trackerUrl} style={{ color: 'var(--text)', display: 'block', marginBottom: 16, wordBreak: 'break-all', fontWeight: 600 }} target="_blank" rel="noopener">{trackerUrl}</a>
            <button className="btn btn--sm" onClick={() => copyTrackerUrl(trackerUrl)} style={{ width: '100%', justifyContent: 'center' }} type="button">
              {copied ? <><Check size={16} className="icon--success" /> تم النسخ</> : <><Copy size={16} /> نسخ رابط المتابعة</>}
            </button>
          </div>
          <button className="btn btn--primary" onClick={onClose} style={{ marginTop: 20, width: '100%' }}>إغلاق</button>
        </div>
      </Modal>
    );
  }

  const nextStep = () => {
    if (step === 1) {
      if (!f.packageId && !f.serviceId && !f.projectType) return onDone('يرجى اختيار باقة أو خدمة أو تحديد نوع المشروع', 'error');
    }
    if (step === 2) {
      // notes/budget are optional
    }
    if (step === 3) {
      if (!f.name || !f.phone) return onDone('الاسم ورقم الهاتف مطلوبان', 'error');
    }
    setStep(s => s + 1);
  };

  const steps = [
    { num: 1, title: 'الخدمة المطلوبة' },
    { num: 2, title: 'التفاصيل' },
    { num: 3, title: 'التواصل' },
    { num: 4, title: 'التأكيد' }
  ];

  return (
    <Modal title="ابدأ مشروعك الآن" onClose={onClose} size="lg">
      <div style={{ marginBottom: 30 }}>
        {/* Stepper Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', maxWidth: 500, margin: '0 auto' }}>
          <div style={{ position: 'absolute', top: 16, left: 0, right: 0, height: 2, background: 'var(--border)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 16, right: 0, height: 2, background: 'var(--primary)', zIndex: 1, transition: '0.3s', width: \`\${((step - 1) / (steps.length - 1)) * 100}%\` }} />
          
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

      <div style={{ minHeight: 280 }}>
        {step === 1 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>ما هو نوع الخدمة التي تبحث عنها؟</h3>
            <div className="grid grid-2" style={{ gap: 20 }}>
              <div className="form-field">
                <label className="form-label" htmlFor="order-pkg">الباقات الجاهزة</label>
                <select id="order-pkg" className="select" style={{ padding: 14, fontSize: 15 }} value={f.packageId} onChange={e => setF(p => ({ ...p, packageId: e.target.value, serviceId: e.target.value ? '' : p.serviceId }))}>
                  <option value="">اختر باقة (اختياري)</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.title} — {money(p.price)}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-svc">الخدمات الفردية</label>
                <select id="order-svc" className="select" style={{ padding: 14, fontSize: 15 }} value={f.serviceId} onChange={e => setF(p => ({ ...p, serviceId: e.target.value, packageId: e.target.value ? '' : p.packageId }))}>
                  <option value="">اختر خدمة (اختياري)</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <div className="muted" style={{ fontSize: 12 }}>أو تخصيص مشروعك</div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="order-type">نوع المشروع المخصص</label>
              <input id="order-type" className="input" style={{ padding: 14 }} placeholder="مثال: هوية بصرية كاملة + تصميم موقع..." value={f.projectType} onChange={e => setF(p => ({ ...p, projectType: e.target.value }))} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>متطلبات وتفاصيل إضافية</h3>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="order-budget">الميزانية المتوقعة (اختياري)</label>
                <div style={{ position: 'relative' }}>
                  <input id="order-budget" className="input" style={{ padding: 14, paddingRight: 45 }} type="number" min="0" placeholder="5000" value={f.budget} onChange={e => setF(p => ({ ...p, budget: e.target.value }))} />
                  <span style={{ position: 'absolute', right: 14, top: 14, color: 'var(--muted)', fontSize: 14 }}>ج.م</span>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-deadline">الموعد النهائي للتسليم</label>
                <input id="order-deadline" className="input" style={{ padding: 14 }} type="date" value={f.deadline} onChange={e => setF(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 20 }}>
              <label className="form-label" htmlFor="order-notes">نبذة عن المشروع وأهدافه</label>
              <textarea id="order-notes" className="textarea" rows={4} maxLength={2000} style={{ padding: 14 }}
                placeholder="صف لنا فكرتك، متطلباتك الخاصة، أو أي روابط مرجعية..."
                value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>كيف يمكننا التواصل معك؟</h3>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="order-name">الاسم الكامل *</label>
              <input id="order-name" className="input" style={{ padding: 14 }} required placeholder="محمد أحمد" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="order-phone">رقم الهاتف / الواتساب *</label>
                <input id="order-phone" className="input" style={{ padding: 14, direction: 'ltr', textAlign: 'right' }} required placeholder="01xxxxxxxxx" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-email">البريد الإلكتروني</label>
                <input id="order-email" className="input" style={{ padding: 14 }} type="email" placeholder="email@example.com" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18, textAlign: 'center' }}>مراجعة الطلب</h3>
            <div style={{ background: 'var(--bg-2)', borderRadius: 16, border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الاسم</span><strong>{f.name}</strong></div>
                <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>رقم التواصل</span><strong style={{ direction: 'ltr', display: 'inline-block' }}>{f.phone}</strong></div>
                
                {f.packageId && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الباقة المختارة</span><strong style={{ color: 'var(--primary)' }}>{packages.find(p => p.id === Number(f.packageId))?.title}</strong></div>}
                {f.serviceId && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الخدمة المختارة</span><strong style={{ color: 'var(--primary)' }}>{services.find(s => s.id === Number(f.serviceId))?.title}</strong></div>}
                {f.projectType && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>نوع المشروع</span><strong>{f.projectType}</strong></div>}
                
                {f.budget && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الميزانية المقترحة</span><strong>{money(Number(f.budget))}</strong></div>}
                {f.deadline && <div><span className="muted" style={{ fontSize: 12, display: 'block' }}>الموعد النهائي</span><strong>{f.deadline}</strong></div>}
              </div>
              {f.notes && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <span className="muted" style={{ fontSize: 12, display: 'block' }}>ملاحظات</span>
                  <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{f.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        {step > 1 ? (
          <button type="button" className="btn" onClick={() => setStep(s => s - 1)} disabled={loading}>السابق</button>
        ) : (
          <button type="button" className="btn" onClick={onClose} style={{ color: 'var(--muted)', background: 'transparent', borderColor: 'transparent' }}>إلغاء</button>
        )}
        
        {step < 4 ? (
          <button type="button" className="btn btn--primary" onClick={nextStep} style={{ minWidth: 120 }}>التالي</button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={submit} disabled={loading} style={{ minWidth: 140, boxShadow: '0 0 24px var(--primary-dim)' }}>
            {loading ? 'جاري الإرسال...' : 'تأكيد وإرسال الطلب'}
          </button>
        )}
      </div>
    </Modal>
  );
}`;

let parts = content.split('function OrderModal({');
let rest = parts[1].split('interface CaseStudyModalProps {');
let newContent = parts[0] + newOrderModal + '\n\ninterface CaseStudyModalProps {' + rest[1];
fs.writeFileSync('client/src/pages/Home.tsx', newContent, 'utf-8');
console.log('Fixed Home.tsx successfully!');