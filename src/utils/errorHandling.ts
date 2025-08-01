// Comprehensive error handling and reporting system

export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  errorBoundary?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorInfo[] = [];
  private maxQueueSize = 50;
  private reportingEndpoint = '/api/errors/report';

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  constructor() {
    this.setupGlobalErrorHandlers();
    this.setupUnhandledRejectionHandler();
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId(),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript'
        }
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId(),
        metadata: {
          reason: event.reason,
          type: 'promise-rejection'
        }
      });
    });
  }

  private setupUnhandledRejectionHandler() {
    if (typeof window === 'undefined') return;

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Prevent the default browser behavior
      event.preventDefault();
      
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId(),
        metadata: {
          type: 'unhandled-rejection',
          reason: event.reason
        }
      });
    });
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let sessionId = sessionStorage.getItem('error-session-id');
    if (!sessionId) {
      sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('error-session-id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : undefined;
    } catch {
      return undefined;
    }
  }

  captureError(errorInfo: Partial<ErrorInfo>): void {
    const fullErrorInfo: ErrorInfo = {
      message: errorInfo.message || 'Unknown error',
      stack: errorInfo.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.errorBoundary,
      timestamp: errorInfo.timestamp || Date.now(),
      userAgent: errorInfo.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
      url: errorInfo.url || (typeof window !== 'undefined' ? window.location.href : 'unknown'),
      userId: errorInfo.userId || this.getUserId(),
      sessionId: errorInfo.sessionId || this.getSessionId(),
      metadata: errorInfo.metadata
    };

    // Add to queue
    this.errorQueue.push(fullErrorInfo);
    
    // Trim queue if too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.splice(0, this.errorQueue.length - this.maxQueueSize);
    }

    // Report error
    this.reportError(fullErrorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔴 Error Captured');
      console.error('Message:', fullErrorInfo.message);
      console.error('Stack:', fullErrorInfo.stack);
      console.error('Metadata:', fullErrorInfo.metadata);
      console.groupEnd();
    }
  }

  private async reportError(errorInfo: ErrorInfo): Promise<void> {
    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorInfo),
      });
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
      
      // Store in localStorage as fallback
      try {
        const storedErrors = JSON.parse(localStorage.getItem('error-reports') || '[]');
        storedErrors.push(errorInfo);
        
        // Keep only last 10 errors in localStorage
        if (storedErrors.length > 10) {
          storedErrors.splice(0, storedErrors.length - 10);
        }
        
        localStorage.setItem('error-reports', JSON.stringify(storedErrors));
      } catch (storageError) {
        console.warn('Failed to store error in localStorage:', storageError);
      }
    }
  }

  // Get all captured errors
  getErrors(): ErrorInfo[] {
    return [...this.errorQueue];
  }

  // Clear error queue
  clearErrors(): void {
    this.errorQueue = [];
  }

  // Report custom error
  reportCustomError(message: string, metadata?: Record<string, any>): void {
    this.captureError({
      message,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      sessionId: this.getSessionId(),
      metadata: {
        ...metadata,
        type: 'custom'
      }
    });
  }
}

// React Error Boundary component
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorHandler = ErrorHandler.getInstance();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    
    // Capture error with React-specific info
    this.errorHandler.captureError({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.errorHandler['getSessionId'](),
      metadata: {
        type: 'react-error-boundary',
        errorInfo
      }
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. The error has been reported.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// API Error handling utilities
export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    // HTTP error response
    return {
      code: error.response.status?.toString() || 'HTTP_ERROR',
      message: error.response.data?.message || error.message || 'An error occurred',
      details: error.response.data,
      status: error.response.status
    };
  } else if (error.request) {
    // Network error
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error - please check your connection',
      details: error.request
    };
  } else {
    // Other error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error
    };
  }
};

// Async error wrapper
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: any) => void
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorHandlerInstance = ErrorHandler.getInstance();
      errorHandlerInstance.captureError({
        message: error instanceof Error ? error.message : 'Async operation failed',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        sessionId: errorHandlerInstance['getSessionId'](),
        metadata: {
          type: 'async-error',
          functionName: fn.name,
          args: args.map(arg => typeof arg === 'object' ? '[Object]' : String(arg))
        }
      });

      if (errorHandler) {
        errorHandler(error);
      } else {
        throw error;
      }
    }
  }) as T;
};

// React hook for error handling
import { useCallback } from 'react';

export const useErrorHandler = () => {
  const errorHandler = ErrorHandler.getInstance();

  const captureError = useCallback((error: Error | string, metadata?: Record<string, any>) => {
    if (typeof error === 'string') {
      errorHandler.reportCustomError(error, metadata);
    } else {
      errorHandler.captureError({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: errorHandler['getSessionId'](),
        metadata: {
          ...metadata,
          type: 'hook-error'
        }
      });
    }
  }, [errorHandler]);

  const handleAsyncError = useCallback(<T>(
    asyncFn: () => Promise<T>,
    onError?: (error: any) => void
  ): Promise<T | void> => {
    return withErrorHandling(asyncFn, onError)();
  }, []);

  return {
    captureError,
    handleAsyncError,
    getErrors: () => errorHandler.getErrors(),
    clearErrors: () => errorHandler.clearErrors()
  };
};

// Retry utility with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export default ErrorHandler;