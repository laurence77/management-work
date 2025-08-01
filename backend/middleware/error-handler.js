const { errorHandler } = require('../utils/standard-error-handler');
const { logger } = require('../utils/logger');

/**
 * Global error handling middleware
 * Should be the last middleware in the Express app
 */
const globalErrorHandler = (error, req, res, next) => {
  // If response has already been sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(error);
  }

  // Use the standard error handler
  return errorHandler.expressMiddleware()(error, req, res, next);
};

/**
 * 404 handler - for when no route matches
 */
const notFoundHandler = (req, res, next) => {
  const error = errorHandler.handleNotFoundError('Endpoint');
  next(error);
};

/**
 * Validation error handler middleware
 * Processes express-validator errors
 */
const validationErrorHandler = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const error = errorHandler.handleValidationError(errors);
    return next(error);
  }
  
  next();
};

/**
 * Database error handler helper
 */
const handleDatabaseError = (originalError, operation) => {
  return errorHandler.handleDatabaseError(originalError, operation);
};

/**
 * Async wrapper utility for route handlers
 */
const asyncWrapper = (fn) => {
  return errorHandler.asyncRouteWrapper(fn);
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  validationErrorHandler,
  handleDatabaseError,
  asyncWrapper,
  errorHandler
};