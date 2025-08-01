import React from 'react';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Configure Sentry for frontend error monitoring and performance tracking
 */
export const configureSentry = () => {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('VITE_SENTRY_DSN not configured - frontend error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      new BrowserTracing({
        // Performance monitoring for React Router
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          // We'll need to import these from React Router
          // React.useEffect,
          // useLocation,
          // useNavigationType,
          // createRoutesFromChildren,
          // matchRoutes
        ),
      }),
    ],
    
    // Error filtering and data scrubbing
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (import.meta.env.VITE_ENVIRONMENT === 'development' && !import.meta.env.VITE_SENTRY_ENABLE_DEV) {
        return null;
      }

      // Filter out sensitive data from URLs
      if (event.request?.url) {
        event.request.url = event.request.url
          .replace(/[?&]token=[^&]*/gi, '?token=[FILTERED]')
          .replace(/[?&]key=[^&]*/gi, '?key=[FILTERED]')
          .replace(/[?&]password=[^&]*/gi, '?password=[FILTERED]');
      }

      // Scrub local storage and session storage data
      if (event.contexts?.storage) {
        const sensitiveKeys = ['auth_token', 'access_token', 'refresh_token', 'session_id'];
        sensitiveKeys.forEach(key => {
          if (event.contexts.storage[key]) {
            event.contexts.storage[key] = '[FILTERED]';
          }
        });
      }

      // Filter out common non-critical errors
      if (event.exception) {
        const errorMessage = event.exception.values?.[0]?.value || '';
        
        // Skip network errors and common browser issues
        if (errorMessage.includes('Network Error') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('Load failed') ||
            errorMessage.includes('ChunkLoadError') ||
            errorMessage.includes('Loading chunk')) {
          return null;
        }

        // Skip ResizeObserver errors (common browser quirk)
        if (errorMessage.includes('ResizeObserver loop limit exceeded')) {
          return null;
        }
      }

      return event;
    },

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out noisy console logs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      
      // Filter out API health checks
      if (breadcrumb.category === 'xhr' && breadcrumb.data?.url?.includes('/health')) {
        return null;
      }
      
      // Scrub sensitive data from HTTP requests
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        if (breadcrumb.data?.url) {
          breadcrumb.data.url = breadcrumb.data.url
            .replace(/[?&]token=[^&]*/gi, '?token=[FILTERED]')
            .replace(/[?&]key=[^&]*/gi, '?key=[FILTERED]');
        }
      }
      
      return breadcrumb;
    },

    // Error sampling
    sampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.8 : 1.0,

    // Max breadcrumbs
    maxBreadcrumbs: 50,

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || 'unknown',

    // Initial scope
    initialScope: {
      tags: {
        component: 'frontend',
        service: 'celebrity-booking-admin'
      }
    }
  });

  console.log('✅ Sentry frontend monitoring configured successfully');
};

/**
 * Set user context for Sentry
 */
export const setSentryUser = (user: { id: string; email: string; role?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role || 'user'
  });
};

/**
 * Clear user context (on logout)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add custom context to Sentry
 */
export const setSentryContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, context);
};

/**
 * Capture exception with additional context
 */
export const captureException = (error: Error, context: Record<string, any> = {}) => {
  Sentry.withScope((scope) => {
    // Add custom context
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Add tags
    if (context.tags) {
      Object.keys(context.tags).forEach(tag => {
        scope.setTag(tag, context.tags[tag]);
      });
    }
    
    // Add level
    if (context.level) {
      scope.setLevel(context.level as Sentry.SeverityLevel);
    }
    
    Sentry.captureException(error);
  });
};

/**
 * Capture message with context
 */
export const captureMessage = (
  message: string, 
  level: Sentry.SeverityLevel = 'info', 
  context: Record<string, any> = {}
) => {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    
    // Add custom context
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    Sentry.captureMessage(message);
  });
};

/**
 * Start a performance transaction
 */
export const startTransaction = (name: string, op: string = 'navigation') => {
  return Sentry.startTransaction({
    name,
    op
  });
};

/**
 * Performance monitoring for API calls
 */
export const withPerformanceMonitoring = <T extends (...args: any[]) => Promise<any>>(
  name: string,
  asyncFn: T
): T => {
  return (async (...args: Parameters<T>) => {
    const transaction = startTransaction(name, 'api.call');
    
    try {
      const result = await asyncFn(...args);
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      captureException(error as Error, {
        context: {
          function: name,
          arguments: args.length
        }
      });
      throw error;
    } finally {
      transaction.finish();
    }
  }) as T;
};

/**
 * Higher-order component for error boundaries
 */
export const withSentryErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ComponentType<any>;
    beforeCapture?: (scope: Sentry.Scope, error: Error, info: React.ErrorInfo) => void;
  }
) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: options?.fallback || ErrorFallback,
    beforeCapture: options?.beforeCapture
  });
};

/**
 * Default error fallback component
 */
const ErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
      </div>
      <div className="mt-4 text-center">
        <h3 className="text-lg font-medium text-gray-900">
          Something went wrong
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          We've been notified about this error and are working to fix it.
        </p>
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={resetError}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  </div>
);

export { Sentry };