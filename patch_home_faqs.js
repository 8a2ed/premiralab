const fs = require('fs');

const ar = {
  reviewsTitle: "\\u0622\\u0631\\u0627\\u0621 \\u0627\\u0644\\u0639\\u0645\\u0644\\u0627\\u0621",
  faqTitle: "\\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0627\\u0644\\u0634\\u0627\\u0626\\u0639\\u0629",
  faqDesc: "\\u0625\\u062C\\u0627\\u0628\\u0627\\u062A \\u0633\\u0631\\u064A\\u0639\\u0629 \\u0644\\u0623\\u0643\\u062B\\u0631 \\u0627\\u0644\\u0623\\u0633\\u0626\\u0644\\u0629 \\u0634\\u064A\\u0648\\u0639\\u0627\\u064B."
};

let code = fs.readFileSync('client/src/pages/Home.tsx', 'utf8');

// Add ChevronDown to imports
code = code.replace("ExternalLink, X, Eye, AlertCircle } from 'lucide-react'", "ExternalLink, X, Eye, AlertCircle, ChevronDown } from 'lucide-react'");
// Also import FAQ type
code = code.replace("PublicData, Package, PortfolioItem", "PublicData, Package, PortfolioItem, FAQ");

// Change the first testimonials title
code = code.replace(/<h2 style=\{\{ marginBottom: 8 \}\}>.*?<\/h2>/, `<h2 style={{ marginBottom: 8 }}>${ar.reviewsTitle}</h2>`);

// Create FAQ Component to inject before Home
const faqComp = `
const FaqItem = ({ faq }: { faq: FAQ }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 0' }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0, color: 'var(--text)', cursor: 'pointer', textAlign: 'right', fontSize: 16, fontWeight: 600 }}
      >
        <span>{faq.question}</span>
        <ChevronDown size={20} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ marginTop: 12, color: 'var(--text-muted)', lineHeight: 1.6, fontSize: 15 }}>
          {faq.answer.split('\\n').map((line, i) => <p key={i} style={{ margin: '0 0 8px' }}>{line}</p>)}
        </div>
      )}
    </div>
  );
};
`;
if (!code.includes('const FaqItem')) {
  code = code.replace("export function Home", faqComp + "\nexport function Home");
}

// Replace the second testimonials section with FAQ section
const startTestimonials = code.indexOf('{/* Testimonials */}');
const endTestimonials = code.indexOf('</main>', startTestimonials);
const oldSection = code.substring(startTestimonials, endTestimonials);

const newSection = `{/* FAQs */}
        {data.faqs && data.faqs.length > 0 && (
          <section className="section" id="faqs" aria-labelledby="faqs-title">
            <div className="container" style={{ maxWidth: 800 }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <h2 id="faqs-title">${ar.faqTitle}</h2>
                <p className="muted">${ar.faqDesc}</p>
              </div>
              <div style={{ background: 'var(--bg-2)', borderRadius: 16, padding: '24px 32px' }}>
                {data.faqs.map(faq => (
                  <FaqItem key={faq.id} faq={faq} />
                ))}
              </div>
            </div>
          </section>
        )}
      `;

code = code.replace(oldSection, newSection);

fs.writeFileSync('client/src/pages/Home.tsx', code, 'utf8');
console.log('Home.tsx updated with FAQs');
