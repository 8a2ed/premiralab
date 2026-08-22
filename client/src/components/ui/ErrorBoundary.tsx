import { Component, type ReactNode } from 'react';

interface Props   { children: ReactNode; fallback?: ReactNode; }
interface State   { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: '#ff6b6b' }}>حدث خطأ غير متوقع</h2>
          <p style={{ color: '#888', marginTop: 8 }}>{this.state.error.message}</p>
          <button
            className="btn btn--primary"
            style={{ marginTop: 20 }}
            onClick={() => this.setState({ error: null })}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
