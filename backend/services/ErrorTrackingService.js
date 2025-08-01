const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const { logger } = require('./LoggingService');

/**
 * Error Tracking Service with Sentry Integration
 * Comprehensive error monitoring, performance tracking, and alerting
 */

class ErrorTrackingService {
  constructor() {
    this.isInitialized = false;
    this.initializeSentry();
  }
  
  initializeSentry() {
    try {
      // Only initialize if DSN is provided
      if (!process.env.SENTRY_DSN) {
        console.log('⚠️ Sentry DSN not provided, error tracking disabled');
        return;
      }
      
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version || '1.0.0',
        
        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Integrations
        integrations: [
          // Enable HTTP tracking
          new Sentry.Integrations.Http({ tracing: true }),
          
          // Enable Express integration
          new Sentry.Integrations.Express({ app: null }),
          
          // Enable profiling
          new ProfilingIntegration(),
          
          // Enable console integration
          new Sentry.Integrations.Console(),
          
          // Enable local variables in stack traces
          new Sentry.Integrations.LocalVariables({
            captureAllExceptions: false
          })
        ],
        
        // Filter out sensitive data
        beforeSend(event, hint) {
          // Remove sensitive headers
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
            delete event.request.headers['x-api-key'];
          }
          
          // Remove sensitive data from extra context
          if (event.extra) {
            delete event.extra.password;
            delete event.extra.token;
            delete event.extra.secret;
          }
          
          // Remove sensitive form data
          if (event.request?.data) {
            if (typeof event.request.data === 'object') {
              delete event.request.data.password;
              delete event.request.data.token;
              delete event.request.data.secret;
            }
          }
          
          return event;
        },
        
        // Sample rate for error events
        sampleRate: 1.0,
        
        // Debug mode in development
        debug: process.env.NODE_ENV === 'development',
        
        // Server name
        serverName: process.env.HOSTNAME || require('os').hostname(),
        
        // Initial scope
        initialScope: {
          tags: {
            component: 'celebrity-booking-api',
            node_version: process.version
          },
          user: {
            id: 'system'
          }
        }
      });
      
      this.isInitialized = true;
      console.log('🚨 Sentry error tracking initialized');
      
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
      logger.error('Sentry initialization failed', error);
    }
  }
  
  // Express middleware for request context
  getRequestHandler() {
    if (!this.isInitialized) {
      return (req, res, next) => next();
    }
    
    return Sentry.Handlers.requestHandler({
      user: ['id', 'email', 'role'],
      request: ['method', 'url', 'headers', 'query_string'],
      serverName: false
    });
  }
  
  // Express middleware for tracing
  getTracingHandler() {
    if (!this.isInitialized) {
      return (req, res, next) => next();
    }
    
    return Sentry.Handlers.tracingHandler();
  }
  
  // Express error handler middleware
  getErrorHandler() {
    if (!this.isInitialized) {
      return (error, req, res, next) => next(error);
    }
    
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Only capture 5xx errors and specific 4xx errors
        if (error.status >= 500) return true;
        if (error.status === 401 || error.status === 403) return true;
        if (error.name === 'ValidationError') return true;
        if (error.name === 'DatabaseError') return true;
        return false;
      }
    });
  }
  
  // Set user context
  setUser(user) {
    if (!this.isInitialized) return;
    
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
      ip_address: '{{auto}}'
    });
  }
  
  // Clear user context
  clearUser() {
    if (!this.isInitialized) return;
    
    Sentry.setUser(null);
  }
  
  // Set tags for context
  setTag(key, value) {
    if (!this.isInitialized) return;
    
    Sentry.setTag(key, value);
  }
  
  // Set extra context
  setExtra(key, value) {
    if (!this.isInitialized) return;
    
    Sentry.setExtra(key, value);
  }
  
  // Set context data
  setContext(key, context) {
    if (!this.isInitialized) return;
    
    Sentry.setContext(key, context);
  }
  
  // Capture exception manually
  captureException(error, options = {}) {
    if (!this.isInitialized) {
      logger.error('Error (Sentry disabled)', error);
      return null;
    }
    
    const sentryId = Sentry.captureException(error, {
      tags: options.tags || {},
      extra: options.extra || {},
      user: options.user || {},
      level: options.level || 'error',
      fingerprint: options.fingerprint || ['{{ default }}']
    });
    
    logger.error('Error captured by Sentry', error, { sentryId });
    
    return sentryId;
  }
  
  // Capture message manually
  captureMessage(message, level = 'info', options = {}) {
    if (!this.isInitialized) {
      logger.info(`Message (Sentry disabled): ${message}`);
      return null;
    }
    
    const sentryId = Sentry.captureMessage(message, {
      level,
      tags: options.tags || {},
      extra: options.extra || {},
      user: options.user || {}
    });
    
    logger.info('Message captured by Sentry', { message, level, sentryId });
    
    return sentryId;
  }
  
  // Add breadcrumb
  addBreadcrumb(breadcrumb) {
    if (!this.isInitialized) return;
    
    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'custom',
      level: breadcrumb.level || 'info',
      data: breadcrumb.data || {},
      timestamp: breadcrumb.timestamp || Date.now() / 1000
    });
  }
  
  // Start transaction for performance monitoring
  startTransaction(name, op = 'custom') {
    if (!this.isInitialized) {
      return {
        setTag: () => {},
        setData: () => {},
        finish: () => {},
        startChild: () => ({
          setTag: () => {},
          setData: () => {},
          finish: () => {}
        })
      };
    }
    
    return Sentry.startTransaction({
      name,
      op,
      trimEnd: true
    });
  }
  
  // Configure scope for database operations
  configureDatabaseScope(operation, table) {
    if (!this.isInitialized) return;
    
    Sentry.configureScope(scope => {
      scope.setTag('db.operation', operation);
      scope.setTag('db.table', table);
      scope.setContext('database', {
        operation,
        table,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  // Configure scope for API operations
  configureAPIScope(method, endpoint, userId = null) {
    if (!this.isInitialized) return;
    
    Sentry.configureScope(scope => {
      scope.setTag('api.method', method);
      scope.setTag('api.endpoint', endpoint);
      
      if (userId) {
        scope.setTag('user.id', userId);
      }
      
      scope.setContext('api', {
        method,
        endpoint,
        userId,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  // Configure scope for authentication events
  configureAuthScope(event, email = null, success = true) {
    if (!this.isInitialized) return;
    
    Sentry.configureScope(scope => {
      scope.setTag('auth.event', event);
      scope.setTag('auth.success', success);
      
      if (email) {
        scope.setTag('auth.email', email);
      }
      
      scope.setContext('authentication', {
        event,
        email,
        success,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  // Capture business logic errors
  captureBusinessError(error, context = {}) {
    if (!this.isInitialized) {
      logger.error('Business error (Sentry disabled)', error, context);
      return null;
    }
    
    return this.captureException(error, {
      tags: {
        error_type: 'business_logic',
        ...context.tags
      },
      extra: {
        business_context: context,
        ...context.extra
      },
      level: 'warning'
    });
  }
  
  // Capture security events
  captureSecurityEvent(event, severity = 'medium', context = {}) {
    if (!this.isInitialized) {
      logger.warn(`Security event (Sentry disabled): ${event}`, context);
      return null;
    }
    
    const level = severity === 'high' ? 'error' : 
                  severity === 'medium' ? 'warning' : 'info';
    
    return this.captureMessage(`Security Event: ${event}`, level, {
      tags: {
        event_type: 'security',
        security_severity: severity,
        ...context.tags
      },
      extra: {
        security_context: context,
        ...context.extra
      }
    });
  }
  
  // Capture performance issues
  capturePerformanceIssue(metric, value, threshold, context = {}) {
    if (!this.isInitialized) {
      logger.warn(`Performance issue (Sentry disabled): ${metric}=${value} (threshold: ${threshold})`);
      return null;
    }
    
    return this.captureMessage(
      `Performance Issue: ${metric} exceeded threshold`,
      'warning',
      {
        tags: {
          performance_metric: metric,
          performance_issue: 'threshold_exceeded',
          ...context.tags
        },
        extra: {
          metric,
          value,
          threshold,
          performance_context: context,
          ...context.extra
        }
      }
    );
  }
  
  // Get Sentry client
  getClient() {
    return this.isInitialized ? Sentry.getCurrentHub().getClient() : null;
  }
  
  // Check if Sentry is initialized
  isEnabled() {
    return this.isInitialized;
  }
  
  // Health check
  async healthCheck() {
    if (!this.isInitialized) {
      return {
        status: 'disabled',
        reason: 'Sentry DSN not provided'
      };
    }
    
    try {
      const client = this.getClient();
      
      return {
        status: 'healthy',
        dsn: process.env.SENTRY_DSN ? 'configured' : 'missing',
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version || '1.0.0',
        transport: client?.getTransport() ? 'active' : 'inactive'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  // Flush events before shutdown
  async flush(timeout = 2000) {
    if (!this.isInitialized) {
      return true;
    }
    
    try {
      await Sentry.flush(timeout);
      logger.info('Sentry events flushed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to flush Sentry events', error);
      return false;
    }
  }
  
  // Close Sentry client
  async close(timeout = 2000) {
    if (!this.isInitialized) {
      return true;
    }
    
    try {
      await Sentry.close(timeout);
      logger.info('Sentry client closed');
      return true;
    } catch (error) {
      logger.error('Failed to close Sentry client', error);
      return false;
    }
  }
}

// Create and export singleton instance
const errorTrackingService = new ErrorTrackingService();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await errorTrackingService.flush();
  await errorTrackingService.close();
});

process.on('SIGTERM', async () => {
  await errorTrackingService.flush();
  await errorTrackingService.close();
});

module.exports = errorTrackingService;