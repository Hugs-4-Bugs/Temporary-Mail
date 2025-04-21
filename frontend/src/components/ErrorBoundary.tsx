import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Wifi, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isNetworkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isNetworkError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if it's a network error
    const isNetworkError = error.message.includes('network') ||
                          error.message.includes('failed to fetch') ||
                          error.message.includes('NetworkError');

    return {
      hasError: true,
      error,
      errorInfo: null,
      isNetworkError
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public tryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const { isNetworkError, error } = this.state;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="bg-red-100 dark:bg-red-900/30 p-8 rounded-xl shadow-md max-w-md w-full">
            {isNetworkError ? (
              <>
                <Wifi className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-3">
                  Connection Error
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  We couldn't connect to the server. Please check your internet connection and try again.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-3">
                  Something went wrong
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  An unexpected error occurred. Our team has been notified.
                </p>
                {error && (
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-left overflow-auto text-xs mb-4 max-h-[150px]">
                    <code className="text-red-600 dark:text-red-400">
                      {error.toString()}
                    </code>
                  </div>
                )}
              </>
            )}
            <button
              onClick={this.tryAgain}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md mx-auto mt-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
