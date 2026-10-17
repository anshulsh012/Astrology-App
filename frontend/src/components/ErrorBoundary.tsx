import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches unexpected render-time errors so the user sees a friendly
 * fallback instead of a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-space-900 px-6 text-center">
          <h1 className="font-display text-3xl text-white">Something went wrong</h1>
          <p className="max-w-md text-sm text-white/60">
            {this.state.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-full border border-gold-400/60 bg-gold-400/10 px-6 py-2 text-sm font-medium text-gold-300 transition hover:bg-gold-400/20"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}