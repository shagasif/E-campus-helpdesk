import { Component, type ReactNode } from 'react';
import { Icon } from './Icon';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('Page error:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="card empty" role="alert">
        <span className="empty-icon empty-icon-error"><Icon name="alert" size={26} /></span>
        <h2>Something went wrong</h2>
        <p className="muted">This page could not be shown. Your complaints are safe in this browser.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
      </div>
    );
  }
}
