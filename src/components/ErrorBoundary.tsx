import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'An unknown error occurred';
      let isFirestoreError = false;
      
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error && parsed.operationType) {
          isFirestoreError = true;
          errorMessage = parsed.error;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-600 mb-6">
              {isFirestoreError 
                ? "There was a problem accessing the database. You might not have permission to perform this action."
                : "We encountered an unexpected error. Please try refreshing the page."}
            </p>
            
            <div className="bg-slate-50 p-4 rounded-lg text-left overflow-auto max-h-48 mb-6 border border-slate-200">
              <code className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
                {errorMessage}
              </code>
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors w-full"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
