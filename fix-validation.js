const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Home.tsx', 'utf-8');

// We need to replace the nextStep function.
const oldNextStep = `  const nextStep = () => {
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
        setError('يرجى إدخال الاسم ورقم الهاتف للتواصل معك');
        return;
      }
    }
    setStep(s => s + 1);
  };`;

const newNextStep = `  const nextStep = () => {
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
      
      // Validate Phone (11 digits Egyptian number)
      const phoneRegex = /^01\\d{9}$/;
      if (!phoneRegex.test(f.phone.trim())) {
        setError('يرجى إدخال رقم هاتف صحيح مكون من 11 رقم (مثال: 01012345678)');
        return;
      }
      
      // Validate Email if provided
      if (f.email) {
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(f.email.trim())) {
          setError('يرجى إدخال بريد إلكتروني صحيح');
          return;
        }
      }
    }
    
    setStep(s => s + 1);
  };`;

content = content.replace(oldNextStep, newNextStep);

// Add Payment methods note in Step 4
const oldStep4 = `{f.notes && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <span className="muted" style={{ fontSize: 12, display: 'block' }}>ملاحظات</span>
                  <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{f.notes}</p>
                </div>
              )}`;

const newStep4 = `{f.notes && (
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
              </div>`;

content = content.replace(oldStep4, newStep4);

fs.writeFileSync('client/src/pages/Home.tsx', content, 'utf-8');
console.log('Validation and Payment methods info added to Home.tsx');
