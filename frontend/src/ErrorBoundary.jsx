import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '16px', border: '1px solid #555', borderRadius: '8px', background: '#fff3cd' }}>
          <h4 style={{ marginTop: 0, color: '#B8860B' }}>Something went wrong.</h4>
          <p style={{ color: '#333' }}>{this.state.error?.message || 'An unexpected error occurred in this section.'}</p>
          <button
            onClick={this.handleDismiss}
            style={{ backgroundColor: '#B8860B', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;