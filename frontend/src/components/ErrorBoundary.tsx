import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import i18n from '../i18n/config';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h1>⚠️ {i18n.t('errorBoundary.somethingWrong')}</h1>
            <p>{this.state.error?.message || i18n.t('errorBoundary.unexpectedError')}</p>
            {import.meta.env.DEV && this.state.error?.stack && (
              <details className="error-details">
                <summary>{i18n.t('errorBoundary.errorDetails')}</summary>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
            <button onClick={this.handleReset} className="btn btn-primary">
              {i18n.t('errorBoundary.reloadPage')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
