function OrderModal({ packages, services, defaultPackage, initialProjectType, onClose, onDone }: OrderModalProps) {
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
    const trackerUrl = `${window.location.origin}/?track=${submitted.orderNo}`;
    return (
      <Modal title="تم استلام طلبك بنجاح ✨" onClose={onClose}>
        <div className="order-success" style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={56} className="icon--success" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 24, marginBottom: 8 }}>شكراً لثقتك بنا!</h3>
          <p style={{ fontSize: 16 }}>رقم طلبك: <strong style={{ color: 'var(--primary)', fontSize: 18, background: 'var(--primary-dim)', padding: '4px 10px', borderRadius: 8 }}>{submitted.orderNo}</strong></p>
          <p className="muted" style={{ maxWidth: 400, margin: '16px auto' }}>تم حفظ طلبك وسيتم مراجعته والتواصل معك قريباً. يمكنك متابعة حالة الطلب في أي وقت.</p>
          
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
    setError('');
    
    if (step === 1) {
      if (!f.packageId && !f.serviceId && !f.projectType) {
        setError('يرجى اختيار باقة أو خدمة أو كتابة نوع المشروع المخصص للمتابعة');
        return;
      }
    }
    
    if (step === 2) {
      // notes/budget are optional
    }
    
    if (step === 3) {
      if (!f.name || !f.phone) {
        setError('الاسم ورقم الهاتف مطلوبان للتواصل');
        return;
      }
      
      const phoneRegex = /^01\d{9}$/;
      if (!phoneRegex.test(f.phone.trim())) {
        setError('يرجى إدخال رقم هاتف صحيح مكون من 11 رقم (مثال: 01012345678)');
        return;
      }
      
      if (f.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(f.email.trim())) {
          setError('يرجى إدخال بريد إلكتروني صحيح');
          return;
        }
      }
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
        <div className="stepper-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', maxWidth: 500, margin: '0 auto', padding: '0 10px' }}>
          <div style={{ position: 'absolute', top: 16, left: 10, right: 10, height: 2, background: 'var(--border)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 16, right: 10, height: 2, background: 'var(--primary)', zIndex: 1, transition: '0.3s', width: `calc(${((step - 1) / (steps.length - 1)) * 100}% - 20px)` }} />
          
          {steps.map(s => (
            <div key={s.num} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, transition: '0.3s',
                background: step >= s.num ? 'var(--primary)' : 'var(--bg-3)', 
                color: step >= s.num ? '#fff' : 'var(--muted)',
                border: `2px solid ${step >= s.num ? 'var(--primary)' : 'var(--border)'}`,
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
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>ما هو نوع الخدمة التي تبحث عنها؟</h3>
            <div className="grid grid-2" style={{ gap: 20 }}>
              <div className="form-field">
                <label className="form-label" htmlFor="order-pkg">الباقات الجاهزة</label>
                <select id="order-pkg" className="select" style={{ padding: 14, fontSize: 15, borderColor: error && !f.packageId && !f.serviceId && !f.projectType ? '#ef4444' : undefined }} value={f.packageId} onChange={e => updateF({ packageId: e.target.value, serviceId: e.target.value ? '' : f.serviceId })}>
                  <option value="">اختر باقة (اختياري)</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.title} — {money(p.price)}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-svc">الخدمات الفردية</label>
                <select id="order-svc" className="select" style={{ padding: 14, fontSize: 15, borderColor: error && !f.packageId && !f.serviceId && !f.projectType ? '#ef4444' : undefined }} value={f.serviceId} onChange={e => updateF({ serviceId: e.target.value, packageId: e.target.value ? '' : f.packageId })}>
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
              <input id="order-type" className="input" style={{ padding: 14, borderColor: error && !f.packageId && !f.serviceId && !f.projectType ? '#ef4444' : undefined }} placeholder="مثال: هوية بصرية كاملة + تصميم موقع..." value={f.projectType} onChange={e => updateF({ projectType: e.target.value })} />
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
                  <input id="order-budget" className="input" style={{ padding: 14, paddingRight: 45 }} type="number" min="0" placeholder="5000" value={f.budget} onChange={e => updateF({ budget: e.target.value })} />
                  <span style={{ position: 'absolute', right: 14, top: 14, color: 'var(--muted)', fontSize: 14 }}>ج.م</span>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-deadline">الموعد النهائي للتسليم</label>
                <input id="order-deadline" className="input" style={{ padding: 14 }} type="date" value={f.deadline} onChange={e => updateF({ deadline: e.target.value })} />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 20 }}>
              <label className="form-label" htmlFor="order-notes">نبذة عن المشروع وأهدافه</label>
              <textarea id="order-notes" className="textarea" rows={4} maxLength={2000} style={{ padding: 14 }}
                placeholder="صف لنا فكرتك، متطلباتك الخاصة، أو أي روابط مرجعية..."
                value={f.notes} onChange={e => updateF({ notes: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animation-fade-in">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>كيف يمكننا التواصل معك؟</h3>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="order-name">الاسم الكامل *</label>
              <input id="order-name" className="input" style={{ padding: 14, borderColor: error && !f.name ? '#ef4444' : undefined }} required placeholder="محمد أحمد" value={f.name} onChange={e => updateF({ name: e.target.value })} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="order-phone">رقم الهاتف / الواتساب *</label>
                <input id="order-phone" className="input" style={{ padding: 14, direction: 'ltr', textAlign: 'right', borderColor: error && !f.phone ? '#ef4444' : undefined }} required placeholder="01xxxxxxxxx" value={f.phone} onChange={e => updateF({ phone: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="order-email">البريد الإلكتروني (اختياري)</label>
                <input id="order-email" className="input" style={{ padding: 14 }} type="email" placeholder="email@example.com" value={f.email} onChange={e => updateF({ email: e.target.value })} />
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
              
              <div style={{ marginTop: 24, padding: '16px', background: 'rgba(205, 69, 205, 0.05)', borderRadius: 12, border: '1px dashed var(--primary-dim)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
                  <strong style={{ fontSize: 14 }}>طرق الدفع المتاحة</strong>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  بعد تأكيد الطلب، سيتم إصدار فاتورة رقمية يمكنك دفعها بسهولة عبر:
                  <br />
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>InstaPay، فودافون كاش، أو التحويل البنكي</span>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer Actions */}
      <div className="stepper-footer-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', gap: 16 }}>
        {step > 1 ? (
          <button type="button" className="btn" onClick={() => setStep(s => s - 1)} disabled={loading}>السابق</button>
        ) : (
          <button type="button" className="btn" onClick={onClose} style={{ color: 'var(--muted)', background: 'transparent', borderColor: 'transparent' }}>إلغاء</button>
        )}
        
        {step < 4 ? (
          <button type="button" className="btn btn--primary" onClick={nextStep} style={{ minWidth: 120 }}>التالي</button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={submit} disabled={loading} style={{ minWidth: 140, boxShadow: '0 0 24px var(--primary-dim)' }}>
            {loading ? 'جاري الإرسال...' : 'تأكيد الطلب'}
          </button>
        )}
      </div>
    </Modal>
  );
}\n\n��i m p o r t   {   u s e S t a t e   }   f r o m   ' r e a c t ' ;  
 i m p o r t   {   A r r o w L e f t ,   S t a r ,   C h e c k C i r c l e 2 ,   P a l e t t e ,   M o n i t o r ,   L a y o u t ,   C o p y ,   C h e c k ,   M e s s a g e C i r c l e ,   E x t e r n a l L i n k ,   X ,   E y e   }   f r o m   ' l u c i d e - r e a c t ' ;  
 i m p o r t   {   N a v   }   f r o m   ' . . / c o m p o n e n t s / l a y o u t / N a v . j s ' ;  
 i m p o r t   {   F o o t e r   }   f r o m   ' . . / c o m p o n e n t s / l a y o u t / F o o t e r . j s ' ;  
 i m p o r t   {   M o d a l   }   f r o m   ' . . / c o m p o n e n t s / u i / M o d a l . j s ' ;  
 i m p o r t   {   I m a g e W i t h S k e l e t o n   }   f r o m   ' . . / c o m p o n e n t s / u i / I m a g e W i t h S k e l e t o n . j s ' ;  
 i m p o r t   {   m o n e y ,   w a L i n k   }   f r o m   ' . . / l i b / u t i l s . j s ' ;  
 i m p o r t   {   a p i   }   f r o m   ' . . / l i b / a p i . j s ' ;  
 i m p o r t   t y p e   {   P u b l i c D a t a ,   P a c k a g e ,   P o r t f o l i o I t e m   }   f r o m   ' . . / t y p e s . j s ' ;  
  
 c o n s t   I C O N _ M A P :   R e c o r d < s t r i n g ,   R e a c t . R e a c t N o d e >   =   {  
     p a l e t t e :   < P a l e t t e   s i z e = { 2 8 }   c l a s s N a m e = " s e r v i c e - i c o n "   / > ,  
     m o n i t o r :   < M o n i t o r   s i z e = { 2 8 }   c l a s s N a m e = " s e r v i c e - i c o n "   / > ,  
     l a y o u t :     < L a y o u t     s i z e = { 2 8 }   c l a s s N a m e = " s e r v i c e - i c o n "   / > ,  
 } ;  
  
 i n t e r f a c e   H o m e P r o p s   {  
     d a t a :         P u b l i c D a t a ;  
     o n T o a s t :   ( m s g :   s t r i n g ,   t y p e ? :   ' s u c c e s s '   |   ' e r r o r ' )   = >   v o i d ;  
 }  
  
 e x p o r t   f u n c t i o n   H o m e ( {   d a t a ,   o n T o a s t   } :   H o m e P r o p s )   {  
     c o n s t   [ o r d e r O p e n ,                     s e t O r d e r O p e n ]                     =   u s e S t a t e ( f a l s e ) ;  
     c o n s t   [ s e l e c t e d ,                       s e t S e l e c t e d ]                       =   u s e S t a t e < P a c k a g e   |   n u l l > ( n u l l ) ;  
     c o n s t   [ i n i t i a l P r o j e c t T y p e ,   s e t I n i t i a l P r o j e c t T y p e ]   =   u s e S t a t e < s t r i n g   |   u n d e f i n e d > ( u n d e f i n e d ) ;  
     c o n s t   [ a c t i v e P o r t f o l i o ,         s e t A c t i v e P o r t f o l i o ]         =   u s e S t a t e < P o r t f o l i o I t e m   |   n u l l > ( n u l l ) ;  
  
     c o n s t   o p e n O r d e r   =   ( p k g ? :   P a c k a g e ,   i n i t i a l P r o j ? :   s t r i n g )   = >   {  
         s e t S e l e c t e d ( p k g   ? ?   n u l l ) ;  
         s e t I n i t i a l P r o j e c t T y p e ( i n i t i a l P r o j ) ;  
         s e t O r d e r O p e n ( t r u e ) ;  
     } ;  
  
     r e t u r n   (  
         < >  
             < N a v   s i t e = { d a t a . s i t e }   o n O r d e r = { ( )   = >   o p e n O r d e r ( ) }   / >  
  
             < m a i n   i d = " t o p " >  
                 { / *   H e r o   * / }  
                 < s e c t i o n   c l a s s N a m e = " h e r o " >  
                     < d i v   c l a s s N a m e = " c o n t a i n e r   h e r o - g r i d " >  
                         < d i v >  
                             < d i v   c l a s s N a m e = " e y e b r o w " > j%� j%%j%� %� j%� %� %�   j%� j%a%%� %� %�   j%�%%� %� %�   %� j%� %� j%� %� %� < / d i v >  
                             < h 1 > %� j%� %� %� %�   j%� %� j%� %� %� j%� j%�%  j%� %� %�   < s p a n   c l a s s N a m e = " h i g h l i g h t " > j%� j%� j%� j%�%j%�   j%� j%a%j%�%%� j%#< / s p a n >   %� %� %� j%#. < / h 1 >  
                             < p > %� %�   j%� %� %� %� %� j%#  j%� %� j%� j%a%j%�%%� j%#  j%� %� %�   j%� %� %� %� j%� j%� j%� j%�   j%� %� j%�%%� %� %� j%#  �� �   %� %� j%U%%� %� j%#  j%� j%a%%� %� %�   j%� j%� j%� j%�%j%� %� %� j%#  %� j%c%  j%� j%� j%� j%�%j%#  %� j%$%j%� j%�%%� j%c%  %� %� %� %� j%� j%�   %� %� j%�%j%� j%� j%c%j%� j%�   %� %� j%U%%� j%#. < / p >  
                             < d i v   c l a s s N a m e = " a c t i o n s " >  
                                 < b u t t o n   c l a s s N a m e = " b t n   b t n - - p r i m a r y   b t n - - l g "   o n C l i c k = { ( )   = >   o p e n O r d e r ( ) } >  
                                     j%� j%V%%� j%�   %� j%$%j%�%%� j%c%%�   < A r r o w L e f t   s i z e = { 1 8 }   a r i a - h i d d e n   / >  
                                 < / b u t t o n >  
                             < / d i v >  
                         < / d i v >  
                         < d i v   c l a s s N a m e = " h e r o - a r t "   a r i a - h i d d e n = " t r u e "   / >  
                     < / d i v >  
                 < / s e c t i o n >  
  
                 { / *   S e r v i c e s   * / }  
                 < s e c t i o n   c l a s s N a m e = " s e c t i o n "   i d = " s e r v i c e s "   a r i a - l a b e l l e d b y = " s e r v i c e s - t i t l e " >  
                     < d i v   c l a s s N a m e = " c o n t a i n e r " >  
                         < h 2   i d = " s e r v i c e s - t i t l e " > j%� %� j%� j%� %� j%� j%� < / h 2 >  
                         < p   c l a s s N a m e = " m u t e d " > j%� %� %� %�   j%� j%a%%� %� %�   %� j%� j%� %� j%#  %� %� j%� %� j%%j%c%. < / p >  
                         < d i v   c l a s s N a m e = " g r i d   g r i d - 3 "   s t y l e = { {   m a r g i n T o p :   2 8   } } >  
                             { d a t a . s e r v i c e s ? . m a p ( s   = >   (  
                                 < d i v   c l a s s N a m e = " c a r d "   k e y = { s . i d } >  
                                     { I C O N _ M A P [ s . i c o n ]   ? ?   < P a l e t t e   s i z e = { 2 8 }   c l a s s N a m e = " s e r v i c e - i c o n "   / > }  
                                     < h 3 > { s . t i t l e } < / h 3 >  
                                     < p   c l a s s N a m e = " m u t e d " > { s . d e s c r i p t i o n } < / p >  
                                 < / d i v >  
                             ) ) }  
                         < / d i v >  
                     < / d i v >  
                 < / s e c t i o n >  
  
                 { / *   P a c k a g e s   * / }  
                 < s e c t i o n   c l a s s N a m e = " s e c t i o n "   i d = " p a c k a g e s "   a r i a - l a b e l l e d b y = " p a c k a g e s - t i t l e " >  
                     < d i v   c l a s s N a m e = " c o n t a i n e r " >  
                         < h 2   i d = " p a c k a g e s - t i t l e " > j%� %� j%� j%� %� j%� j%� < / h 2 >  
                         < p   c l a s s N a m e = " m u t e d " > j%� j%� j%� j%�%  %� %� j%V%j%#  j%� %� j%� j%� j%� %� j%#  j%� %� %� %� j%� j%%j%� j%#. < / p >  
                         < d i v   c l a s s N a m e = " g r i d   g r i d - 3 "   s t y l e = { {   m a r g i n T o p :   2 8   } } >  
                             { d a t a . p a c k a g e s ? . m a p ( p   = >   (  
                                 < d i v   c l a s s N a m e = { ` c a r d   p a c k a g e - c a r d   $ { p . p o p u l a r   ?   ' p a c k a g e - c a r d - - p o p u l a r '   :   ' ' } ` }   k e y = { p . i d } >  
                                     { p . p o p u l a r   & &   < s p a n   c l a s s N a m e = " t a g " > j%� %� j%� %� j%� j%�%  j%V%%� j%� j%� %�   �� � < / s p a n > }  
                                     < h 3 > { p . t i t l e } < / h 3 >  
                                     < d i v   c l a s s N a m e = " p r i c e " > { m o n e y ( p . p r i c e ,   d a t a . s i t e ? . c u r r e n c y ) } < / d i v >  
                                     < p   c l a s s N a m e = " m u t e d " > { p . d e s c r i p t i o n } < / p >  
                                     < u l   c l a s s N a m e = " f e a t u r e - l i s t "   a r i a - l a b e l = " %� %� %� j%�%j%� j%�   j%� %� j%� j%� %� j%#" >  
                                         { p . f e a t u r e s . m a p ( f   = >   (  
                                             < l i   k e y = { f } > < C h e c k C i r c l e 2   s i z e = { 1 4 }   a r i a - h i d d e n   / >   { f } < / l i >  
                                         ) ) }  
                                     < / u l >  
                                     < b u t t o n   c l a s s N a m e = " b t n   b t n - - p r i m a r y "   o n C l i c k = { ( )   = >   o p e n O r d e r ( p ) }   s t y l e = { {   m a r g i n T o p :   ' a u t o '   } } >  
                                         j%� j%V%%� j%�   j%� %� j%� j%� %� j%# 
                                     < / b u t t o n >  
                                 < / d i v >  
                             ) ) }  
                         < / d i v >  
                     < / d i v >  
                 < / s e c t i o n >  
  
                 { / *   P o r t f o l i o   * / }  
                 < s e c t i o n   c l a s s N a m e = " s e c t i o n "   i d = " p o r t f o l i o "   a r i a - l a b e l l e d b y = " p o r t f o l i o - t i t l e " >  
                     < d i v   c l a s s N a m e = " c o n t a i n e r " >  
                         < d i v   s t y l e = { {   d i s p l a y :   ' f l e x ' ,   j u s t i f y C o n t e n t :   ' s p a c e - b e t w e e n ' ,   a l i g n I t e m s :   ' b a s e l i n e ' ,   f l e x W r a p :   ' w r a p ' ,   g a p :   1 0   } } >  
                             < d i v >  
                                 < h 2   i d = " p o r t f o l i o - t i t l e " > j%� j%c%%� j%� %�   %� j%� j%� j%� j%�%j%#< / h 2 >  
                                 < p   c l a s s N a m e = " m u t e d " > %� %� j%� j%�%j%�   %� j%� j%� j%� j%�%j%�   j%� j%a%j%�%%� j%#  j%a%%� %� %� j%� %� j%�   %� j%c%%� %� j%� j%� %� j%�   ( j%� j%b%j%Q%j%V%  j%c%%� %�   j%� %�   j%c%%� %�   %� j%� j%%j%� j%c%j%�%j%� j%b%  j%� %� j%� %� j%� j%a%%� %�   j%� %� %� j%� %� %� j%#) . < / p >  
                             < / d i v >  
                         < / d i v >  
  
                         < d i v   c l a s s N a m e = " g r i d   g r i d - 3 "   s t y l e = { {   m a r g i n T o p :   2 8   } } >  
                             { d a t a . p o r t f o l i o ? . l e n g t h   ?   d a t a . p o r t f o l i o . m a p ( p   = >   (  
                                 < d i v  
                                     c l a s s N a m e = " c a r d   p o r t f o l i o - c a r d - c l i c k a b l e "  
                                     k e y = { p . i d }  
                                     o n C l i c k = { ( )   = >   s e t A c t i v e P o r t f o l i o ( p ) }  
                                     r o l e = " b u t t o n "  
                                     t a b I n d e x = { 0 }  
                                     a r i a - l a b e l = { ` j%c%j%�%j%b%  j%� %� j%� j%a%%� %�   $ { p . t i t l e } ` }  
                                 >  
                                     { p . i m a g e _ u r l   & &   (  
                                         < d i v   s t y l e = { {   p o s i t i o n :   ' r e l a t i v e ' ,   o v e r f l o w :   ' h i d d e n ' ,   b o r d e r R a d i u s :   ' v a r ( - - r a d i u s - s m ) '   } } >  
                                             < I m a g e W i t h S k e l e t o n   s k e l e t o n H e i g h t = { 2 4 0 }   c l a s s N a m e = " p o r t f o l i o - i m g "   s r c = { p . i m a g e _ u r l }   l o a d i n g = " l a z y "   d e c o d i n g = " a s y n c "   a l t = { p . t i t l e }   / >  
                                             < d i v   s t y l e = { {   p o s i t i o n :   ' a b s o l u t e ' ,   b o t t o m :   1 0 ,   l e f t :   1 0 ,   b a c k g r o u n d :   ' r g b a ( 0 , 0 , 0 , 0 . 7 ) ' ,   c o l o r :   ' # f f f ' ,   p a d d i n g :   ' 4 p x   1 0 p x ' ,   b o r d e r R a d i u s :   6 ,   f o n t S i z e :   1 1 ,   d i s p l a y :   ' f l e x ' ,   a l i g n I t e m s :   ' c e n t e r ' ,   g a p :   5 ,   b a c k d r o p F i l t e r :   ' b l u r ( 4 p x ) ' ,   z I n d e x :   2   } } >  
                                                 < E y e   s i z e = { 1 2 }   / >   j%� j%%j%� j%c%j%�%j%� j%b%  j%� %� j%c%%� %�  
                                             < / d i v >  
                                         < / d i v >  
                                     ) }  
                                     < h 3   s t y l e = { {   m a r g i n T o p :   1 4 ,   m a r g i n B o t t o m :   4   } } > { p . t i t l e } < / h 3 >  
                                     { p . c a t e g o r y   & &   < s p a n   c l a s s N a m e = " t a g   t a g - - s m " > { p . c a t e g o r y } < / s p a n > }  
                                     < p   c l a s s N a m e = " m u t e d "   s t y l e = { {   m a r g i n T o p :   8 ,   f o n t S i z e :   1 3   } } > { p . d e s c r i p t i o n } < / p >  
                                 < / d i v >  
                             ) )   :   (  
                                 < d i v   c l a s s N a m e = " e m p t y " > j%� j%b%%�   j%� j%c%%� j%� %� %�   %� %�   %� %� j%� j%#  j%� %� j%� j%� j%� j%�%j%#. < / d i v >  
                             ) }  
                         < / d i v >  
                     < / d i v >  
                 < / s e c t i o n >  
  
                 { / *   T e s t i m o n i a l s   * / }  
                 < s e c t i o n   c l a s s N a m e = " s e c t i o n "   i d = " t e s t i m o n i a l s "   a r i a - l a b e l l e d b y = " t e s t i m o n i a l s - t i t l e " >  
                     < d i v   c l a s s N a m e = " c o n t a i n e r " >  
                         < h 2   i d = " t e s t i m o n i a l s - t i t l e " > j%� j%�%j%� j%�   j%� %� j%c%%� %� j%� j%� < / h 2 >  
                         < d i v   c l a s s N a m e = " g r i d   g r i d - 3 "   s t y l e = { {   m a r g i n T o p :   2 8   } } >  
                             { d a t a . t e s t i m o n i a l s ? . m a p ( t   = >   (  
                                 < d i v   c l a s s N a m e = " c a r d   t e s t i m o n i a l - c a r d "   k e y = { t . i d } >  
                                     < d i v   c l a s s N a m e = " s t a r s "   a r i a - l a b e l = { ` j%� %� %� %� %�   $ { t . r a t i n g }   %� %�   5 ` } >  
                                         { A r r a y . f r o m ( {   l e n g t h :   t . r a t i n g   } ) . m a p ( ( _ ,   i )   = >   (  
                                             < S t a r   k e y = { i }   s i z e = { 1 6 }   f i l l = " c u r r e n t C o l o r "   a r i a - h i d d e n   / >  
                                         ) ) }  
                                     < / d i v >  
                                     < p   c l a s s N a m e = " t e s t i m o n i a l - q u o t e " > " { t . c o n t e n t } " < / p >  
                                     < d i v   c l a s s N a m e = " t e s t i m o n i a l - a u t h o r " >  
                                         { t . a v a t a r _ u r l   & &   < I m a g e W i t h S k e l e t o n   s k e l e t o n H e i g h t = { 4 8 }   s r c = { t . a v a t a r _ u r l }   a l t = { t . n a m e }   c l a s s N a m e = " a v a t a r "   / > }  
                                         < d i v >  
                                             < s t r o n g > { t . n a m e } < / s t r o n g >  
                                             < d i v   c l a s s N a m e = " m u t e d " > { t . r o l e } < / d i v >  
                                         < / d i v >  
                                     < / d i v >  
                                 < / d i v >  
                             ) ) }  
                         < / d i v >  
                     < / d i v >  
                 < / s e c t i o n >  
             < / m a i n >  
  
             < F o o t e r   s i t e = { d a t a . s i t e }   / >  
  
             { / *   F l o a t i n g   W h a t s A p p   Q u i c k - C h a t   W i d g e t   * / }  
             < F l o a t i n g W h a t s A p p   w h a t s a p p = { d a t a . s i t e ? . w h a t s a p p }   b r a n d = { d a t a . s i t e ? . b r a n d }   / >  
  
             { / *   C a s e   S t u d y   M o d a l   * / }  
             { a c t i v e P o r t f o l i o   & &   (  
                 < C a s e S t u d y M o d a l  
                     i t e m = { a c t i v e P o r t f o l i o }  
                     o n C l o s e = { ( )   = >   s e t A c t i v e P o r t f o l i o ( n u l l ) }  
                     o n O r d e r = { ( p k g ,   p r o j )   = >   o p e n O r d e r ( p k g ,   p r o j ) }  
                     w h a t s a p p = { d a t a . s i t e ? . w h a t s a p p }  
                     b r a n d = { d a t a . s i t e ? . b r a n d }  
                 / >  
             ) }  
  
             { / *   O r d e r   M o d a l   * / }  
             { o r d e r O p e n   & &   (  
                 < O r d e r M o d a l  
                     p a c k a g e s = { d a t a . p a c k a g e s   ? ?   [ ] }  
                     s e r v i c e s = { d a t a . s e r v i c e s   ? ?   [ ] }  
                     d e f a u l t P a c k a g e = { s e l e c t e d }  
                     i n i t i a l P r o j e c t T y p e = { i n i t i a l P r o j e c t T y p e }  
                     o n C l o s e = { ( )   = >   {   s e t O r d e r O p e n ( f a l s e ) ;   s e t I n i t i a l P r o j e c t T y p e ( u n d e f i n e d ) ;   } }  
                     o n D o n e = { ( m s g ,   t y p e )   = >   {   o n T o a s t ( m s g ,   t y p e ) ;   s e t O r d e r O p e n ( f a l s e ) ;   s e t I n i t i a l P r o j e c t T y p e ( u n d e f i n e d ) ;   } }  
                 / >  
             ) }  
         < / >  
     ) ;  
 }  
  
 / /   �� � �� � �� �   O r d e r   M o d a l   �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� �  
  
 i n t e r f a c e   O r d e r M o d a l P r o p s   {  
     p a c k a g e s :                       P a c k a g e [ ] ;  
     s e r v i c e s :                       A r r a y < {   i d :   n u m b e r ;   t i t l e :   s t r i n g   } > ;  
     d e f a u l t P a c k a g e :           P a c k a g e   |   n u l l ;  
     i n i t i a l P r o j e c t T y p e ? :   s t r i n g ;  
     o n C l o s e :                         ( )   = >   v o i d ;  
     o n D o n e :                           ( m s g :   s t r i n g ,   t y p e :   ' s u c c e s s '   |   ' e r r o r ' )   = >   v o i d ;  
 }  
  
 f u n c t i o n   O r d e r M o d a l ( {   p a c k a g e s ,   s e r v i c e s ,   d e f a u l t P a c k a g e ,   i n i t i a l P r o j e c t T y p e ,   o n C l o s e ,   o n D o n e   } :   O r d e r M o d a l P r o p s )   {  
     c o n s t   [ f ,   s e t F ]   =   u s e S t a t e ( {  
         n a m e :   ' ' ,   p h o n e :   ' ' ,   e m a i l :   ' ' ,  
         p a c k a g e I d :   d e f a u l t P a c k a g e   ?   S t r i n g ( d e f a u l t P a c k a g e . i d )   :   ' ' ,  
         s e r v i c e I d :   ' ' ,  
         p r o j e c t T y p e :   i n i t i a l P r o j e c t T y p e   | |   ' ' ,  
         b u d g e t :   ' ' ,   d e a d l i n e :   ' ' ,   n o t e s :   ' ' ,  
     } ) ;  
     c o n s t   [ l o a d i n g ,       s e t L o a d i n g ]       =   u s e S t a t e ( f a l s e ) ;  
     c o n s t   [ s u b m i t t e d ,   s e t S u b m i t t e d ]   =   u s e S t a t e < {   o r d e r N o :   s t r i n g   }   |   n u l l > ( n u l l ) ;  
  
     c o n s t   s u b m i t   =   a s y n c   ( e :   R e a c t . F o r m E v e n t )   = >   {  
         e . p r e v e n t D e f a u l t ( ) ;  
         s e t L o a d i n g ( t r u e ) ;  
         t r y   {  
             c o n s t   r e s   =   a w a i t   a p i . o r d e r ( {  
                 n a m e :   f . n a m e ,   p h o n e :   f . p h o n e ,   e m a i l :   f . e m a i l   | |   u n d e f i n e d ,  
                 p a c k a g e I d :       f . p a c k a g e I d   ?   N u m b e r ( f . p a c k a g e I d )   :   u n d e f i n e d ,  
                 s e r v i c e I d :       f . s e r v i c e I d   ?   N u m b e r ( f . s e r v i c e I d )   :   u n d e f i n e d ,  
                 p r o j e c t T y p e :   f . p r o j e c t T y p e ,  
                 n o t e s :               f . n o t e s ,  
                 b u d g e t :             f . b u d g e t   ?   N u m b e r ( f . b u d g e t )   :   u n d e f i n e d ,  
                 d e a d l i n e :         f . d e a d l i n e   | |   u n d e f i n e d ,  
             } ) ;  
             s e t S u b m i t t e d ( {   o r d e r N o :   r e s . o r d e r N o   } ) ;  
         }   c a t c h   ( e r r )   {  
             o n D o n e ( ( e r r   a s   E r r o r ) . m e s s a g e ,   ' e r r o r ' ) ;  
         }   f i n a l l y   {   s e t L o a d i n g ( f a l s e ) ;   }  
     } ;  
  
     c o n s t   [ c o p i e d ,   s e t C o p i e d ]   =   u s e S t a t e ( f a l s e ) ;  
  
     c o n s t   c o p y T r a c k e r U r l   =   ( u r l :   s t r i n g )   = >   {  
         n a v i g a t o r . c l i p b o a r d . w r i t e T e x t ( u r l ) . t h e n ( ( )   = >   {  
             s e t C o p i e d ( t r u e ) ;  
             s e t T i m e o u t ( ( )   = >   s e t C o p i e d ( f a l s e ) ,   2 5 0 0 ) ;  
         } ) . c a t c h ( ( )   = >   { } ) ;  
     } ;  
  
     i f   ( s u b m i t t e d )   {  
         c o n s t   t r a c k e r U r l   =   ` $ { w i n d o w . l o c a t i o n . o r i g i n } / ? t r a c k = $ { s u b m i t t e d . o r d e r N o } ` ;  
         r e t u r n   (  
             < M o d a l   t i t l e = " j%� %�   j%� j%%j%� %� j%� %�   j%V%%� j%� %�   a"�� � "   o n C l o s e = { o n C l o s e } >  
                 < d i v   c l a s s N a m e = " o r d e r - s u c c e s s " >  
                     < C h e c k C i r c l e 2   s i z e = { 4 8 }   c l a s s N a m e = " i c o n - - s u c c e s s "   / >  
                     < h 3 > j%$%%� j%�%j%� %�   %� %� ! < / h 3 >  
                     < p > j%�%%� %�   j%V%%� j%� %� :   < s t r o n g   c l a s s N a m e = " o r d e r - n o - h i g h l i g h t " > { s u b m i t t e d . o r d e r N o } < / s t r o n g > < / p >  
                     < p   c l a s s N a m e = " m u t e d " > j%� j%� %� j%U%  %� j%�%j%�   j%� %� j%�%%� %�   %� %� j%� j%� j%� j%c%j%#  j%� j%� %� j%#  %� j%$%j%�%%� j%c%%� . < / p >  
                     < d i v   c l a s s N a m e = " t r a c k e r - l i n k - b o x "   s t y l e = { {   d i s p l a y :   ' f l e x ' ,   f l e x D i r e c t i o n :   ' c o l u m n ' ,   g a p :   8 ,   a l i g n I t e m s :   ' c e n t e r '   } } >  
                         < p   c l a s s N a m e = " m u t e d "   s t y l e = { {   m a r g i n :   0   } } > j%�%j%� j%� j%V%  %� j%� j%� j%� j%c%j%#  j%� %� %� j%$%j%�%%� j%c%: < / p >  
                         < a   h r e f = { t r a c k e r U r l }   c l a s s N a m e = " t r a c k e r - l i n k "   t a r g e t = " _ b l a n k "   r e l = " n o o p e n e r " > { t r a c k e r U r l } < / a >  
                         < b u t t o n  
                             c l a s s N a m e = " b t n   b t n - - s m "  
                             o n C l i c k = { ( )   = >   c o p y T r a c k e r U r l ( t r a c k e r U r l ) }  
                             s t y l e = { {   m a r g i n T o p :   4   } }  
                             t y p e = " b u t t o n "  
                         >  
                             { c o p i e d   ?   < > < C h e c k   s i z e = { 1 4 }   c l a s s N a m e = " i c o n - - s u c c e s s "   / >   j%� %�   j%� %� %� j%%j%� < / >   :   < > < C o p y   s i z e = { 1 4 }   / >   %� j%%j%�   j%� %� j%�%j%� j%� j%V%< / > }  
                         < / b u t t o n >  
                     < / d i v >  
                     < b u t t o n   c l a s s N a m e = " b t n   b t n - - p r i m a r y "   o n C l i c k = { o n C l o s e }   s t y l e = { {   m a r g i n T o p :   2 0   } } > j%� j%Q%%� j%� %� < / b u t t o n >  
                 < / d i v >  
             < / M o d a l >  
         ) ;  
     }  
  
     r e t u r n   (  
         < M o d a l   t i t l e = " j%� j%� j%� j%�   %� j%$%j%�%%� j%c%%� "   o n C l o s e = { o n C l o s e }   s i z e = " l g " >  
             < f o r m   o n S u b m i t = { s u b m i t }   n o V a l i d a t e >  
                 < d i v   c l a s s N a m e = " f o r m - g r i d " >  
                     < d i v   c l a s s N a m e = " f o r m - f i e l d " >  
                         < l a b e l   c l a s s N a m e = " f o r m - l a b e l "   h t m l F o r = " o r d e r - n a m e " > j%� %� j%� j%%%�   j%� %� %� j%� %� %�   * < / l a b e l >  
                         < i n p u t   i d = " o r d e r - n a m e "   c l a s s N a m e = " i n p u t "   r e q u i r e d   p l a c e h o l d e r = " %� j%� %� j%�   j%� j%� %� j%� "   v a l u e = { f . n a m e }   o n C h a n g e = { e   = >   s e t F ( p   = >   ( {   . . . p ,   n a m e :   e . t a r g e t . v a l u e   } ) ) }   / >  
                     < / d i v >  
                     < d i v   c l a s s N a m e = " f o r m - f i e l d " >  
                         < l a b e l   c l a s s N a m e = " f o r m - l a b e l "   h t m l F o r = " o r d e r - p h o n e " > j%�%%� %�   j%� %� %� j%� j%� %�   * < / l a b e l >  
                         < i n p u t   i d = " o r d e r - p h o n e "   c l a s s N a m e = " i n p u t "   r e q u i r e d   p l a c e h o l d e r = " 0 1 x x x x x x x x x "   v a l u e = { f . p h o n e }   o n C h a n g e = { e   = >   s e t F ( p   = >   ( {   . . . p ,   p h o n e :   e . t a r g e t . v a l u e   } ) ) }   / >  
                     < / d i v >  
                     < d i v   c l a s s N a m e = " f o r m - f i e l d " >  
                         < l a b e l   c l a s s N a m e = " f o r m - l a b e l "   h t m l F o r = " o r d e r - e m a i l " > j%� %� j%� j%�%%� j%�   j%� %� j%� %� %� j%� j%�%%� %� %� < / l a b e l >  
                         < i n p u t   i d = " o r d e r - e m a i l "   c l a s s N a m e = " i n p u t "   t y p e = " e m a i l "   p l a c e h o l d e r = " e m a i l @ e x a m p l e . c o m "   v a l u e = { f . e m a i l }   o n C h a n g e = { e   = >   s e t F ( p   = >   ( {   . . . p ,   e m a i l :   e . t a r g e t . v a l u e   } ) ) }   / >  
                     < / d i v >  
                     < d i v   c l a s s N a m e = " f o r m - f i e l d " >  
                         < l a b e l   c l a s s N a m e = " f o r m - l a b e l "   h t m l F o r = " o r d e r - t y p e " > %� %� j%c%  j%� %� %� j%$%j%�%%� j%c%< / l a b e l >  
                         < i n p u t   i d = " o r d e r - t y p e "   c l a s s N a m e = " i n p u t "   p l a c e h o l d e r = " %� %� %� j%#  j%� j%a%j%�%%� j%#j%�   j%%%� j%$%%� j%� %�   %� %� j%� %� j%� . . . "   v a l u e = { f . p r o j e c t T y p e }   o n C h a n g e = { e   = >   s e t F ( p   = >   ( {   . . . p ,   p r o j e c t T y p e :   e . t a r g e t . v a l u e   } ) ) }   / >  
                     < / d i v >  
                     < d i v   c l a s s N a m e = " f o r m - f i e l d " >  
                         < l a b e l   c l a s s N a m e = " f o r m - l a b e l "   h t m l F o r = " o r d e r - p k g " > j%� %� j%� j%� %� j%#< / l a b e l >  
                         < s e l e c t   i d = " o r d e r - p k g "   c l a s s N a m e = " s e l e c t "   v a l u e = { f . p a c k a g e I d }   o n C h a n g e = { e   = >   s e t F ( p   = >   ( {   . . . p ,   p a c k a g e I d :   e . t a r g e t . v a l u e   } ) ) } >  
                             < o p t i o n   v a l u e = " " > j%� j%� j%� j%�%  j%� j%� %� j%#  ( j%� j%� j%� %� j%� j%�%%� ) < / o p t i o n >  
                             { p a c k a g e s . m a p ( p   = >   < o p t i o n   k e y = { p . i d }   v a l u e = { p . i d } > { p . t i t l e }   �� �   { m o n e y ( p . p r i c e ) } < / o p t i o n > ) }  
                         < / s e l e c t >  
                     < / d i v >  
                     < d i v   c l a s s N a m e = " f o r m - f i e l d " >  
                         < l a b e l   c l a s s N a m e = " f o r m - l a b e l "   h t m l F o r = " o r d e r - s v c " > j%� %� j%� j%� %� j%#< / l a b e l >  
                         < s e l e c t   i d = " o r d e r - s v c "   c l a s s N a m e = " s e l e c t "   v a l u e = { f . s e r v i c e I d }   o n C h a n g e = { e   = >   s e t F ( p   = >   ( {   . . . p ,   s e r v i c e I d :   e . t a r g e t . v a l u e   } ) ) } >  
                             < o p t i o n   v a l u e = " " > j%� j%� j%� j%�%  j%� j%� %� j%#  ( j%� j%� j%� %� j%� j%�%%� ) < / o p t i o n >  
                             { s e r v i c e s . m a p ( s   = >   < o p t i o n   k e y = { s . i d }   v a l u e = { s . i d } > { s . t i t l e } < / o p t i o n > ) }  
                         < / s e l e c t >  
                     < / d i v >  
                     < d i v   c l a s s N a m e = " f o r m - f i e l d " >  
                         < l a b e l   c l a s s N a m e = " f o r m - l a b e l "   h t m l F o r = " o r d e r - b u d g e t " > j%� %� %� %� j%�%j%� %� %� j%#  j%� %� %� j%� %� %� j%c%j%#  ( j%� %� %� %� ) < / l a b e l >  
                         < i n p u t   i d = " o r d e r - b u d g e t "   c l a s s N a m e = " i n p u t "   t y p e = " n u m b e r "   m i n = " 0 "   p l a c e h o l d e r = " 5 0 0 0 "   v a l u e = { f . b u d g e t }   o n C h a n g e = { e   = >   s e t F ( p   = >   ( {   . . . p ,   b u d g e t :   e . t a r g e t . v a l u e   } ) ) }   / >  
                     < / d i v >  
                     < d i v   c l a s s N a m e = " f o r m - f i e l d " >  
                         < l a b e l   c l a s s N a m e = " f o r m - l a b e l "   h t m l F o r = " o r d e r - d e a d l i n e " > j%� %� %� %� j%c%j%�   j%� %� %� %� j%� j%� %� < / l a b e l >  
                         < i n p u t   i d = " o r d e r - d e a d l i n e "   c l a s s N a m e = " i n p u t "   t y p e = " d a t e "   v a l u e = { f . d e a d l i n e }   o n C h a n g e = { e   = >   s e t F ( p   = >   ( {   . . . p ,   d e a d l i n e :   e . t a r g e t . v a l u e   } ) ) }   / >  
                     < / d i v >  
                 < / d i v >  
                 < d i v   c l a s s N a m e = " f o r m - f i e l d "   s t y l e = { {   m a r g i n T o p :   1 0   } } >  
                     < l a b e l   c l a s s N a m e = " f o r m - l a b e l "   h t m l F o r = " o r d e r - n o t e s " > j%� %� j%� j%a%%� %�   j%� %� %� j%$%j%�%%� j%c%< / l a b e l >  
                     < t e x t a r e a   i d = " o r d e r - n o t e s "   c l a s s N a m e = " t e x t a r e a "   r o w s = { 4 }   m a x L e n g t h = { 2 0 0 0 }  
                         p l a c e h o l d e r = " j%a%%�   %� j%$%j%�%%� j%c%%� j%�   %� j%�%j%� j%c%%� j%� j%� %� j%�   %� j%� %�   j%V%%� j%� j%� j%�   j%� j%� j%a%j%#. . . "  
                         v a l u e = { f . n o t e s }   o n C h a n g e = { e   = >   s e t F ( p   = >   ( {   . . . p ,   n o t e s :   e . t a r g e t . v a l u e   } ) ) }  
                     / >  
                 < / d i v >  
                 < b u t t o n   t y p e = " s u b m i t "   c l a s s N a m e = " b t n   b t n - - p r i m a r y "   d i s a b l e d = { l o a d i n g }   s t y l e = { {   w i d t h :   ' 1 0 0 % ' ,   m a r g i n T o p :   1 4   } } >  
                     { l o a d i n g   ?   ' j%� j%� j%�%%�   j%� %� j%� j%�%j%%j%� %� . . . '   :   ' j%� j%�%j%%j%� %�   j%� %� j%V%%� j%� ' }  
                 < / b u t t o n >  
             < / f o r m >  
         < / M o d a l >  
     ) ;  
 }  
  
 / /   �� � �� � �� �   C a s e   S t u d y   M o d a l   �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� �  
  
 i n t e r f a c e   C a s e S t u d y M o d a l P r o p s   {  
     i t e m :           P o r t f o l i o I t e m ;  
     o n C l o s e :     ( )   = >   v o i d ;  
     o n O r d e r :     ( p k g ? :   P a c k a g e ,   i n i t i a l P r o j ? :   s t r i n g )   = >   v o i d ;  
     w h a t s a p p ? :   s t r i n g ;  
     b r a n d ? :       s t r i n g ;  
 }  
  
 f u n c t i o n   C a s e S t u d y M o d a l ( {   i t e m ,   o n C l o s e ,   o n O r d e r ,   w h a t s a p p ,   b r a n d   } :   C a s e S t u d y M o d a l P r o p s )   {  
     c o n s t   w a U r l   =   w h a t s a p p  
         ?   w a L i n k ( w h a t s a p p ,   ` %� j%�%j%� j%� j%� %�   $ { b r a n d   | |   ' P R E M I R A L A B ' } j%�   j%� j%c%j%� j%� %� %�   %� j%$%j%�%%� j%c%  " $ { i t e m . t i t l e } "   %� j%� j%�%%� j%�   j%� %� %� %� j%�%  %� j%$%j%�%%� j%c%  %� j%$%j%� j%� %� . ` )  
         :   n u l l ;  
  
     r e t u r n   (  
         < M o d a l   t i t l e = { i t e m . t i t l e }   o n C l o s e = { o n C l o s e }   s i z e = " l g " >  
             < d i v   c l a s s N a m e = " c a s e - s t u d y - m o d a l " >  
                 { i t e m . i m a g e _ u r l   & &   (  
                     < d i v   c l a s s N a m e = " c a s e - s t u d y - h e r o - i m g - w r a p " >  
                         < I m a g e W i t h S k e l e t o n   s k e l e t o n H e i g h t = { 4 0 0 }   s r c = { i t e m . i m a g e _ u r l }   a l t = { i t e m . t i t l e }   c l a s s N a m e = " c a s e - s t u d y - h e r o - i m g "   / >  
                     < / d i v >  
                 ) }  
                 < d i v   s t y l e = { {   m a r g i n T o p :   1 8 ,   d i s p l a y :   ' f l e x ' ,   f l e x D i r e c t i o n :   ' c o l u m n ' ,   g a p :   1 4   } } >  
                     < d i v   s t y l e = { {   d i s p l a y :   ' f l e x ' ,   j u s t i f y C o n t e n t :   ' s p a c e - b e t w e e n ' ,   a l i g n I t e m s :   ' c e n t e r ' ,   f l e x W r a p :   ' w r a p ' ,   g a p :   1 0   } } >  
                         < d i v >  
                             { i t e m . c a t e g o r y   & &   < s p a n   c l a s s N a m e = " t a g "   s t y l e = { {   b a c k g r o u n d :   ' v a r ( - - a c c e n t ) ' ,   c o l o r :   ' # f f f ' ,   f o n t W e i g h t :   6 0 0   } } > { i t e m . c a t e g o r y } < / s p a n > }  
                             < h 3   s t y l e = { {   m a r g i n :   ' 8 p x   0   0 ' ,   f o n t S i z e :   2 2   } } > { i t e m . t i t l e } < / h 3 >  
                         < / d i v >  
                         < d i v   s t y l e = { {   d i s p l a y :   ' f l e x ' ,   g a p :   1 0 ,   f l e x W r a p :   ' w r a p '   } } >  
                             { w a U r l   & &   (  
                                 < a   h r e f = { w a U r l }   t a r g e t = " _ b l a n k "   r e l = " n o o p e n e r   n o r e f e r r e r "   c l a s s N a m e = " b t n   b t n - - s m "   s t y l e = { {   b o r d e r C o l o r :   ' # 2 5 D 3 6 6 ' ,   c o l o r :   ' # 2 5 D 3 6 6 '   } } >  
                                     a"�� �   j%� j%%j%� %� j%%j%�%  j%c%j%� j%�%  %� j%� j%� j%%j%� j%�  
                                 < / a >  
                             ) }  
                             < b u t t o n  
                                 c l a s s N a m e = " b t n   b t n - - p r i m a r y   b t n - - s m "  
                                 o n C l i c k = { ( )   = >   {  
                                     o n C l o s e ( ) ;  
                                     o n O r d e r ( u n d e f i n e d ,   i t e m . t i t l e ) ;  
                                 } }  
                             >  
                                 j%� j%V%%� j%�   %� j%$%j%�%%� j%c%j%� %�   %� %� j%� j%� %� j%� %�  
                             < / b u t t o n >  
                         < / d i v >  
                     < / d i v >  
  
                     < d i v   s t y l e = { {   b a c k g r o u n d :   ' v a r ( - - b g - 3 ) ' ,   p a d d i n g :   1 8 ,   b o r d e r R a d i u s :   ' v a r ( - - r a d i u s - s m ) ' ,   l i n e H e i g h t :   1 . 8   } } >  
                         < h 4   s t y l e = { {   m a r g i n :   ' 0   0   8 p x ' ,   f o n t S i z e :   1 5 ,   c o l o r :   ' v a r ( - - t e x t ) '   } } > j%c%%�   %� j%�%j%�   j%� %� j%c%%� %� : < / h 4 >  
                         < p   s t y l e = { {   m a r g i n :   0 ,   c o l o r :   ' v a r ( - - t e x t - m u t e d ) '   } } >  
                             { i t e m . d e s c r i p t i o n   | |   ' %� j%$%j%�%%� j%c%  j%� j%a%%� %� %�   %� %� %� %� j%#  j%� j%a%j%�%%� j%#  j%�%%� %� %� j%#  %� j%� %� j%� %� %� j%#  j%� %�   j%� j%V%%� %� j%�%%�   %� %� %�   j%� j%c%%� %�   %� j%c%j%� %� %� j%�%  j%� %� j%� %� j%� j%#  %� j%� %� j%� j%� j%�%j%� j%#  j%� %� j%� j%a%j%�%%� j%#. ' }  
                         < / p >  
                     < / d i v >  
                 < / d i v >  
             < / d i v >  
         < / M o d a l >  
     ) ;  
 }  
  
 / /   �� � �� � �� �   F l o a t i n g   W h a t s A p p   W i d g e t   �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� � �� �  
  
 f u n c t i o n   F l o a t i n g W h a t s A p p ( {   w h a t s a p p ,   b r a n d   } :   {   w h a t s a p p ? :   s t r i n g ;   b r a n d ? :   s t r i n g   } )   {  
     c o n s t   [ o p e n ,   s e t O p e n ]   =   u s e S t a t e ( f a l s e ) ;  
     i f   ( ! w h a t s a p p )   r e t u r n   n u l l ;  
  
     c o n s t   q u i c k L i n k s   =   [  
         {   t i t l e :   ' j%V%%� j%�   j%c%j%�%j%b%  j%%j%c%j%�%  j%%j%�%%� j%c%' ,   m s g :   ` %� j%�%j%� j%� j%� %�   $ { b r a n d   | |   ' P R E M I R A L A B ' } j%�   j%� j%�%%� j%�   j%� %� j%� j%a%%� %�   j%c%%� %�   j%c%j%�%j%b%  j%%j%c%j%�%  %� %� j%$%j%�%%� j%c%%�   j%� %� j%� j%� %� j%� . `   } ,  
         {   t i t l e :   ' j%� j%%j%� %� j%%j%� j%�%  j%c%%�   j%� %� j%� j%� %� j%� j%�   j%� %� %� j%� j%� j%� j%#' ,   m s g :   ` %� j%�%j%� j%� j%� %�   $ { b r a n d   | |   ' P R E M I R A L A B ' } j%�   %� j%� %�   j%� j%%j%� %� j%%j%� j%�%  j%� j%� j%a%%� j%a%  j%� j%� %� j%� j%�   j%� %� j%� j%a%%� %� %� . `   } ,  
         {   t i t l e :   ' %� j%� j%� j%� j%c%j%#  j%V%%� j%�   %� j%� j%� %� ' ,   m s g :   ` %� j%�%j%� j%� j%� %�   $ { b r a n d   | |   ' P R E M I R A L A B ' } j%�   j%� j%�%%� j%�   j%� %� j%� j%%j%� %� j%%j%� j%�%  j%c%%�   j%� j%� %� j%#  j%V%%� j%� %� . `   } ,  
     ] ;  
  
     r e t u r n   (  
         < d i v   c l a s s N a m e = " f l o a t i n g - w a - c o n t a i n e r " >  
             { o p e n   & &   (  
                 < d i v   c l a s s N a m e = " f l o a t i n g - w a - c a r d   c a r d " >  
                     < d i v   c l a s s N a m e = " f l o a t i n g - w a - h e a d e r " >  
                         < d i v   s t y l e = { {   d i s p l a y :   ' f l e x ' ,   a l i g n I t e m s :   ' c e n t e r ' ,   g a p :   1 0   } } >  
                             < d i v   c l a s s N a m e = " w a - a v a t a r - b a d g e " >  
                                 < i m g   s r c = " / l o g o . p n g "   a l t = " P R E M I R A L A B "   s t y l e = { {   w i d t h :   2 8 ,   h e i g h t :   2 8 ,   b o r d e r R a d i u s :   6 ,   o b j e c t F i t :   ' c o n t a i n '   } }   / >  
                                 < s p a n   c l a s s N a m e = " w a - o n l i n e - d o t "   / >  
                             < / d i v >  
                             < d i v >  
                                 < s t r o n g > { b r a n d   | |   ' P R E M I R A L A B ' } < / s t r o n g >  
                                 < d i v   s t y l e = { {   f o n t S i z e :   1 1 ,   c o l o r :   ' # 2 5 D 3 6 6 '   } } > %� j%� j%a%%�   j%� %� j%� %�   �� �   %� j%�%j%�   j%� %� j%� %�   j%� %� j%� j%� %� < / d i v >  
                             < / d i v >  
                         < / d i v >  
                         < b u t t o n   c l a s s N a m e = " b t n   b t n - - i c o n   b t n - - s m "   o n C l i c k = { ( )   = >   s e t O p e n ( f a l s e ) }   a r i a - l a b e l = " j%� j%Q%%� j%� %� " >  
                             < X   s i z e = { 1 6 }   / >  
                         < / b u t t o n >  
                     < / d i v >  
  
                     < p   s t y l e = { {   f o n t S i z e :   1 3 ,   m a r g i n :   ' 1 2 p x   0   1 0 p x ' ,   c o l o r :   ' v a r ( - - t e x t - m u t e d ) '   } } >  
                         %� j%�%j%� j%� j%� %�   j%� %� !   %� %� %�   %� %� %� %� %� j%�   %� j%%j%� j%c%j%� j%� %�   j%� %� %� %� %� j%�  j%� j%� j%� j%�%  %� %�   j%� %� j%� %� j%� j%�%j%� j%�   j%� %� j%%j%�%%� j%c%j%#:  
                     < / p >  
  
                     < d i v   s t y l e = { {   d i s p l a y :   ' f l e x ' ,   f l e x D i r e c t i o n :   ' c o l u m n ' ,   g a p :   8   } } >  
                         { q u i c k L i n k s . m a p ( ( q ,   i d x )   = >   (  
                             < a  
                                 k e y = { i d x }  
                                 h r e f = { w a L i n k ( w h a t s a p p ,   q . m s g ) }  
                                 t a r g e t = " _ b l a n k "  
                                 r e l = " n o o p e n e r   n o r e f e r r e r "  
                                 c l a s s N a m e = " f l o a t i n g - w a - i t e m "  
                                 o n C l i c k = { ( )   = >   s e t O p e n ( f a l s e ) }  
                             >  
                                 < s p a n > { q . t i t l e } < / s p a n >  
                                 < E x t e r n a l L i n k   s i z e = { 1 3 }   s t y l e = { {   o p a c i t y :   0 . 7   } }   / >  
                             < / a >  
                         ) ) }  
                     < / d i v >  
                 < / d i v >  
             ) }  
  
             < b u t t o n  
                 c l a s s N a m e = " f l o a t i n g - w a - b t n "  
                 o n C l i c k = { ( )   = >   s e t O p e n ( o   = >   ! o ) }  
                 a r i a - l a b e l = " j%� %� j%� j%a%%�   j%c%j%� j%�%  %� j%� j%� j%%j%� j%� "  
             >  
                 < M e s s a g e C i r c l e   s i z e = { 2 6 }   / >  
                 < s p a n   c l a s s N a m e = " f l o a t i n g - w a - p u l s e "   / >  
             < / b u t t o n >  
         < / d i v >  
     ) ;  
 }  
 