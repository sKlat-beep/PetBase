import React from 'react';
import { logTelemetry, serialiseTelemetryLog } from '../utils/telemetry';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true, errorId: crypto.randomUUID() };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logTelemetry('error', `Uncaught error: ${error.message}`, {
      stack: error.stack?.slice(0, 2000),
      componentStack: info.componentStack?.slice(0, 2000),
    }).catch(() => {});

    // Fire-and-forget: dispatch log dump to the Cloud Function relay
    this.dispatchErrorReport(error).catch(() => {
      // Non-critical — report dispatch failure silently
    });
  }

  private async dispatchErrorReport(error: Error): Promise<void> {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { app } = await import('../lib/firebase');
    const functions = getFunctions(app);
    const sendReport = httpsCallable(functions, 'sendReport');
    await sendReport({
      type: 'crash',
      message: error.message,
      log: await serialiseTelemetryLog(),
      errorId: this.state.errorId,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 p-8 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Something went wrong</h1>
            <p className="text-neutral-500 text-sm leading-relaxed">
              An error has occurred. Please refresh or re-open the app and try again — a bug report has been filed.
            </p>
            {this.state.errorId && (
              <p className="text-xs text-neutral-400 font-mono">Ref: {this.state.errorId}</p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
