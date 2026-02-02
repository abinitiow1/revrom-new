import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background dark:bg-dark-background flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card dark:bg-dark-card rounded-3xl border border-border dark:border-dark-border p-8 text-center shadow-xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2 text-foreground dark:text-dark-foreground">
              Something went wrong
            </h1>
            <p className="text-muted-foreground dark:text-dark-muted-foreground text-sm mb-6">
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            {this.state.error && (
              <details className="text-left mb-6 bg-slate-50 dark:bg-neutral-900 rounded-xl p-4 text-xs">
                <summary className="cursor-pointer font-bold text-muted-foreground mb-2">
                  Error details
                </summary>
                <pre className="overflow-auto text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 adventure-gradient text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border border-border dark:border-dark-border bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground font-black text-sm uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
