const { logger } = require('./logger');

/**
 * Standardized Error Handler
 * Provides consistent error handling across all application modules
 */

class StandardErrorHandler {
  constructor() {
    this.errorTypes = {
      VALIDATION: 'validation_error',
      AUTHENTICATION: 'authentication_error',
      AUTHORIZATION: 'authorization_error',
      NOT_FOUND: 'not_found_error',
      CONFLICT: 'conflict_error',
      RATE_LIMIT: 'rate_limit_error',
      DATABASE: 'database_error',
      EXTERNAL_API: 'external_api_error',
      FILE_UPLOAD: 'file_upload_error',
      NETWORK: 'network_error',
      INTERNAL: 'internal_error'
    };

    this.statusCodes = {
      [this.errorTypes.VALIDATION]: 400,
      [this.errorTypes.AUTHENTICATION]: 401,
      [this.errorTypes.AUTHORIZATION]: 403,
      [this.errorTypes.NOT_FOUND]: 404,
      [this.errorTypes.CONFLICT]: 409,
      [this.errorTypes.RATE_LIMIT]: 429,
      [this.errorTypes.DATABASE]: 500,
      [this.errorTypes.EXTERNAL_API]: 502,
      [this.errorTypes.FILE_UPLOAD]: 400,
      [this.errorTypes.NETWORK]: 503,
      [this.errorTypes.INTERNAL]: 500
    };
  }

  /**
   * Create standardized error object
   */
  createError(type, message, details = null, originalError = null) {
    const error = new Error(message);
    error.type = type;
    error.statusCode = this.statusCodes[type] || 500;
    error.details = details;
    error.originalError = originalError;
    error.timestamp = new Date().toISOString();
    
    return error;
  }

  /**
   * Log error with appropriate level based on type
   */
  logError(error, context = {}) {
    const logData = {
      type: error.type || 'unknown',
      message: error.message,
      statusCode: error.statusCode || 500,
      details: error.details,
      context,
      timestamp: error.timestamp || new Date().toISOString(),
      stack: error.stack
    };

    // Determine log level based on error type
    if (error.statusCode >= 500) {
      logger.error('Server Error:', logData);
    } else if (error.statusCode >= 400) {
      logger.warn('Client Error:', logData);
    } else {
      logger.info('Request Error:', logData);
    }

    // Log original error if present
    if (error.originalError) {
      logger.error('Original Error:', {
        message: error.originalError.message,
        stack: error.originalError.stack
      });
    }
  }

  /**
   * Format error response for client (sanitized)
   */
  formatErrorResponse(error) {
    const response = {
      success: false,
      error: {
        type: error.type || this.errorTypes.INTERNAL,
        message: this.getSafeErrorMessage(error),
        timestamp: error.timestamp || new Date().toISOString()
      }
    };

    // Only include details for client errors (4xx), not server errors (5xx)
    if (error.statusCode < 500 && error.details) {
      response.error.details = error.details;
    }

    // Include request ID if available
    if (error.requestId) {
      response.error.requestId = error.requestId;
    }

    return response;
  }

  /**
   * Get safe error message (no sensitive information)
   */
  getSafeErrorMessage(error) {
    const safeMessages = {
      [this.errorTypes.VALIDATION]: 'Invalid input provided',
      [this.errorTypes.AUTHENTICATION]: 'Authentication required',
      [this.errorTypes.AUTHORIZATION]: 'Access denied',
      [this.errorTypes.NOT_FOUND]: 'Resource not found',
      [this.errorTypes.CONFLICT]: 'Resource conflict',
      [this.errorTypes.RATE_LIMIT]: 'Too many requests',
      [this.errorTypes.DATABASE]: 'Database operation failed',
      [this.errorTypes.EXTERNAL_API]: 'External service unavailable',
      [this.errorTypes.FILE_UPLOAD]: 'File upload failed',
      [this.errorTypes.NETWORK]: 'Network error',
      [this.errorTypes.INTERNAL]: 'Internal server error'
    };

    // For client errors, use the actual message if safe
    if (error.statusCode < 500 && error.message && !this.containsSensitiveInfo(error.message)) {
      return error.message;
    }

    // For server errors or unsafe messages, use safe default
    return safeMessages[error.type] || 'An unexpected error occurred';
  }

  /**
   * Check if message contains sensitive information
   */
  containsSensitiveInfo(message) {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /connection string/i,
      /database/i,
      /env/i,
      /config/i,
      /internal/i,
      /system/i,
      /server/i,
      /path/i,
      /file/i,
      /directory/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Express middleware for handling errors
   */
  expressMiddleware() {
    return (error, req, res, next) => {
      // Add request ID to error
      error.requestId = req.id || req.headers['x-request-id'];

      // Log the error
      this.logError(error, {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id
      });

      // Format and send response
      const errorResponse = this.formatErrorResponse(error);
      const statusCode = error.statusCode || 500;

      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * Async route wrapper for consistent error handling
   */
  asyncRouteWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Database error handler
   */
  handleDatabaseError(originalError, operation = 'database operation') {
    let errorType = this.errorTypes.DATABASE;
    let message = `Failed to perform ${operation}`;

    // Handle specific database errors
    if (originalError.code === '23505') { // Unique violation
      errorType = this.errorTypes.CONFLICT;
      message = 'Resource already exists';
    } else if (originalError.code === '23503') { // Foreign key violation
      errorType = this.errorTypes.VALIDATION;
      message = 'Invalid reference to related resource';
    } else if (originalError.code === '23502') { // Not null violation
      errorType = this.errorTypes.VALIDATION;
      message = 'Required field is missing';
    }

    return this.createError(errorType, message, null, originalError);
  }

  /**
   * Validation error handler
   */
  handleValidationError(validationResult) {
    const details = validationResult.errors || validationResult.array?.() || [];
    return this.createError(
      this.errorTypes.VALIDATION,
      'Validation failed',
      details
    );
  }

  /**
   * Authentication error handler
   */
  handleAuthError(message = 'Authentication failed') {
    return this.createError(this.errorTypes.AUTHENTICATION, message);
  }

  /**
   * Authorization error handler
   */
  handleAuthorizationError(message = 'Insufficient permissions') {
    return this.createError(this.errorTypes.AUTHORIZATION, message);
  }

  /**
   * Not found error handler
   */
  handleNotFoundError(resource = 'Resource') {
    return this.createError(this.errorTypes.NOT_FOUND, `${resource} not found`);
  }

  /**
   * Rate limit error handler
   */
  handleRateLimitError(retryAfter = null) {
    const error = this.createError(
      this.errorTypes.RATE_LIMIT,
      'Too many requests',
      retryAfter ? { retryAfter } : null
    );
    return error;
  }

  /**
   * File upload error handler
   */
  handleFileUploadError(message = 'File upload failed') {
    return this.createError(this.errorTypes.FILE_UPLOAD, message);
  }

  /**
   * External API error handler
   */
  handleExternalApiError(service, originalError) {
    return this.createError(
      this.errorTypes.EXTERNAL_API,
      `${service} service unavailable`,
      null,
      originalError
    );
  }
}

// Create singleton instance
const errorHandler = new StandardErrorHandler();

module.exports = {
  ErrorHandler: StandardErrorHandler,
  errorHandler,
  errorTypes: errorHandler.errorTypes
};