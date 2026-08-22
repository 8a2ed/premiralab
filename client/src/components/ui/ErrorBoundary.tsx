import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]', error, info);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', height: '100%', minHeight: '50vh' }}>
          <div style={{ background: 'var(--danger-dim, #dc262615)', color: 'var(--danger, #dc2626)', padding: '24px', borderRadius: '50%', marginBottom: '24px' }}>
            <AlertTriangle size={48} />
          </div>
          <h2 style={{ fontSize: '24px', marginBottom: '12px', fontWeight: 800 }}>حدث خطأ غير متوقع</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '450px', lineHeight: 1.6 }}>
            واجه النظام مشكلة أثناء معالجة هذا الجزء من الصفحة. يمكنك محاولة تحديث الصفحة أو العودة لاحقاً.
            <br/><br/>
            <span style={{ fontSize: '12px', opacity: 0.7, fontFamily: 'monospace' }}>
              {this.state.error.message}
            </span>
          </p>
          <button 
            className="btn btn--primary btn--lg" 
            onClick={() => window.location.reload()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCcw size={18} />
            <span>تحديث الصفحة</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
