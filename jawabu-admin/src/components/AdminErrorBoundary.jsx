import { Component } from 'react';

export default class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('Admin screen error:', error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="admin-page">
        <div className="admin-page-card">
          <h2>This screen hit an error</h2>
          <p className="hint">
            {this.state.error?.message || 'Reload to continue.'}
          </p>
          <button
            type="button"
            className="admin-gold-button"
            onClick={() => window.location.reload()}
          >
            Reload admin
          </button>
        </div>
      </div>
    );
  }
}
