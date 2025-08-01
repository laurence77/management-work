const { logRequest } = require('../services/LoggingService');

/**
 * HTTP Request Logging Middleware
 * Comprehensive request/response logging with performance metrics
 */

function createRequestLogger(options = {}) {
  const {
    skipPaths = ['/health', '/favicon.ico', '/metrics'],
    skipUserAgents = ['kube-probe', 'GoogleHC'],
    logBody = false,
    logHeaders = process.env.NODE_ENV === 'development',
    maxBodyLength = 1000
  } = options;
  
  return (req, res, next) => {
    // Skip logging for certain paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Skip logging for certain user agents (health checks, bots)
    const userAgent = req.get('User-Agent') || '';
    if (skipUserAgents.some(agent => userAgent.includes(agent))) {
      return next();
    }
    
    const startTime = Date.now();
    
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseBody = null;
    let requestBody = null;
    
    // Capture request body if enabled
    if (logBody && req.body) {
      requestBody = typeof req.body === 'string' 
        ? req.body.substring(0, maxBodyLength)
        : JSON.stringify(req.body).substring(0, maxBodyLength);
    }
    
    // Override response methods to capture response data
    res.send = function(body) {
      if (logBody) {
        responseBody = typeof body === 'string' 
          ? body.substring(0, maxBodyLength)
          : JSON.stringify(body).substring(0, maxBodyLength);
      }
      return originalSend.call(this, body);
    };
    
    res.json = function(obj) {
      if (logBody) {
        responseBody = JSON.stringify(obj).substring(0, maxBodyLength);
      }
      return originalJson.call(this, obj);
    };
    
    // Log request completion
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      const logData = {
        method: req.method,
        url: req.url,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
        userId: req.user?.id,
        userRole: req.user?.role,
        contentLength: res.get('Content-Length'),
        referer: req.get('Referer'),
        forwardedFor: req.get('X-Forwarded-For'),
        sessionId: req.sessionID,
        correlationId: req.correlationId
      };
      
      // Add headers if enabled
      if (logHeaders) {
        logData.requestHeaders = {
          'content-type': req.get('Content-Type'),
          'accept': req.get('Accept'),
          'authorization': req.get('Authorization') ? '[REDACTED]' : undefined,
          'cache-control': req.get('Cache-Control')
        };
        
        logData.responseHeaders = {
          'content-type': res.get('Content-Type'),
          'cache-control': res.get('Cache-Control'),
          'x-cache': res.get('X-Cache'),
          'etag': res.get('ETag')
        };
      }
      
      // Add body data if enabled
      if (logBody) {
        if (requestBody) logData.requestBody = requestBody;
        if (responseBody) logData.responseBody = responseBody;
      }
      
      // Add performance indicators
      if (responseTime > 1000) {
        logData.performance = 'slow';
      } else if (responseTime > 500) {
        logData.performance = 'moderate';
      } else {
        logData.performance = 'fast';
      }
      
      // Add security indicators
      if (res.statusCode === 401) {
        logData.security = 'unauthorized';
      } else if (res.statusCode === 403) {
        logData.security = 'forbidden';
      } else if (res.statusCode === 429) {
        logData.security = 'rate_limited';
      }
      
      logRequest(req, res, responseTime);
    });
    
    // Log request errors
    res.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      
      logRequest(req, res, responseTime);
      
      // Additional error logging
      require('../services/LoggingService').error('Response Error', error, {
        method: req.method,
        url: req.url,
        responseTime,
        userId: req.user?.id
      });
    });
    
    next();
  };
}

// Correlation ID middleware
function correlationId() {
  return (req, res, next) => {
    // Generate or use existing correlation ID
    req.correlationId = req.get('X-Correlation-ID') || 
                       req.get('X-Request-ID') || 
                       generateCorrelationId();
    
    // Set response header
    res.set('X-Correlation-ID', req.correlationId);
    
    next();
  };
}

// Generate unique correlation ID
function generateCorrelationId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Error logging middleware
function errorLogger() {
  return (error, req, res, next) => {
    const { error: logError } = require('../services/LoggingService');
    
    const errorData = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      correlationId: req.correlationId,
      body: req.body,
      params: req.params
    };
    
    logError('HTTP Error', error, errorData);
    
    next(error);
  };
}

// Security event logger
function securityLogger() {
  return (req, res, next) => {
    const { logSecurity } = require('../services/LoggingService');
    
    // Log authentication attempts
    if (req.path.includes('/auth') || req.path.includes('/login')) {
      const originalJson = res.json;
      
      res.json = function(data) {
        const success = res.statusCode < 400;
        
        logSecurity('authentication_attempt', success ? 'low' : 'medium', {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          success,
          userId: data?.user?.id || req.body?.email
        });
        
        return originalJson.call(this, data);
      };
    }
    
    // Log suspicious activities
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /javascript:/i,  // JavaScript injection
      /eval\(/i  // Code injection
    ];
    
    const fullUrl = req.url;
    const bodyString = JSON.stringify(req.body || {});
    
    if (suspiciousPatterns.some(pattern => 
        pattern.test(fullUrl) || pattern.test(bodyString))) {
      
      logSecurity('suspicious_request', 'high', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        correlationId: req.correlationId
      });
    }
    
    next();
  };
}

module.exports = {
  createRequestLogger,
  correlationId,
  errorLogger,
  securityLogger,
  generateCorrelationId
};