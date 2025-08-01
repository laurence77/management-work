const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Configure Sentry for production error monitoring and performance tracking
 */
const configureSentry = () => {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured - error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined }),
    ],
    
    // Error filtering and data scrubbing
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
        return null;
      }

      // Filter out sensitive data
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers['x-api-key'];
        }

        // Scrub sensitive query parameters
        if (event.request.query_string) {
          event.request.query_string = event.request.query_string
            .replace(/password=[^&]*/gi, 'password=[FILTERED]')
            .replace(/token=[^&]*/gi, 'token=[FILTERED]')
            .replace(/key=[^&]*/gi, 'key=[FILTERED]');
        }

        // Scrub request body for sensitive data
        if (event.request.data && typeof event.request.data === 'object') {
          const sanitizedData = { ...event.request.data };
          
          // Remove common sensitive fields
          const sensitiveFields = [
            'password', 'token', 'secret', 'key', 'auth', 'credential',
            'smtp_pass', 'stripe_secret', 'jwt_secret', 'session_secret'
          ];
          
          sensitiveFields.forEach(field => {
            Object.keys(sanitizedData).forEach(key => {
              if (key.toLowerCase().includes(field)) {
                sanitizedData[key] = '[FILTERED]';
              }
            });
          });
          
          event.request.data = sanitizedData;
        }
      }

      // Filter out health check and monitoring endpoints
      if (event.request && event.request.url) {
        const url = event.request.url;
        if (url.includes('/health') || url.includes('/metrics') || url.includes('/ping')) {
          return null;
        }
      }

      // Rate limit error reports (don't spam Sentry)
      if (event.exception) {
        const errorMessage = event.exception.values?.[0]?.value || '';
        
        // Skip common non-critical errors
        if (errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('ENOTFOUND') ||
            errorMessage.includes('timeout')) {
          return null;
        }
      }

      return event;
    },

    // Set user context
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/health')) {
        return null;
      }
      
      // Scrub sensitive data from breadcrumbs
      if (breadcrumb.data) {
        const sanitizedData = { ...breadcrumb.data };
        
        // Remove authorization headers from HTTP breadcrumbs
        if (sanitizedData.headers) {
          delete sanitizedData.headers.authorization;
          delete sanitizedData.headers.cookie;
        }
        
        breadcrumb.data = sanitizedData;
      }
      
      return breadcrumb;
    },

    // Error sampling
    sampleRate: process.env.NODE_ENV === 'production' ? 0.8 : 1.0,

    // Max breadcrumbs
    maxBreadcrumbs: 50,

    // Release tracking
    release: process.env.npm_package_version || 'unknown',

    // Server name
    serverName: process.env.DOMAIN || 'celebrity-booking-backend',

    // Tags
    initialScope: {
      tags: {
        component: 'backend',
        service: 'celebrity-booking'
      }
    }
  });

  console.log('✅ Sentry error monitoring configured successfully');
};

/**
 * Add user context to Sentry scope
 */
const setSentryUser = (user) => {
  Sentry.configureScope((scope) => {
    scope.setUser({
      id: user.id,
      email: user.email,
      role: user.role
    });
  });
};

/**
 * Add custom context to Sentry scope
 */
const setSentryContext = (key, context) => {
  Sentry.configureScope((scope) => {
    scope.setContext(key, context);
  });
};

/**
 * Capture exception with additional context
 */
const captureException = (error, context = {}) => {
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
      scope.setLevel(context.level);
    }
    
    Sentry.captureException(error);
  });
};

/**
 * Capture message with context
 */
const captureMessage = (message, level = 'info', context = {}) => {
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
 * Create Sentry middleware for Express
 */
const createSentryMiddleware = () => {
  return {
    requestHandler: Sentry.Handlers.requestHandler({
      transaction: 'methodPath',
      user: ['id', 'email', 'role']
    }),
    
    tracingHandler: Sentry.Handlers.tracingHandler(),
    
    errorHandler: Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Only handle 5xx errors
        return error.status >= 500;
      }
    })
  };
};

/**
 * Performance monitoring for database queries
 */
const startTransaction = (name, op = 'db.query') => {
  return Sentry.startTransaction({
    name,
    op
  });
};

/**
 * Add performance monitoring to async functions
 */
const withPerformanceMonitoring = (name, asyncFn) => {
  return async (...args) => {
    const transaction = startTransaction(name, 'function');
    
    try {
      const result = await asyncFn(...args);
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      captureException(error, {
        context: {
          function: name,
          arguments: args.length
        }
      });
      throw error;
    } finally {
      transaction.finish();
    }
  };
};

module.exports = {
  configureSentry,
  setSentryUser,
  setSentryContext,
  captureException,
  captureMessage,
  createSentryMiddleware,
  startTransaction,
  withPerformanceMonitoring,
  Sentry
};