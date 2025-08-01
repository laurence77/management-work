const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * Comprehensive Logging Service
 * Production-grade logging with multiple transports and structured logging
 */

class LoggingService {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.createLogsDirectory();
    
    this.logger = this.createLogger();
    this.setupGlobalHandlers();
    
    console.log('📝 Logging service initialized');
  }
  
  createLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }
  
  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const logEntry = {
          timestamp,
          level,
          message,
          ...meta
        };
        
        if (stack) {
          logEntry.stack = stack;
        }
        
        return JSON.stringify(logEntry);
      })
    );
    
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
          metaStr = ' ' + JSON.stringify(meta, null, 2);
        }
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    );
    
    const transports = [
      // Console transport for development
      new winston.transports.Console({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
      }),
      
      // Combined log file
      new winston.transports.File({
        filename: path.join(this.logsDir, 'combined.log'),
        level: 'info',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 10,
        tailable: true
      }),
      
      // Error log file
      new winston.transports.File({
        filename: path.join(this.logsDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      }),
      
      // Access log file for HTTP requests
      new winston.transports.File({
        filename: path.join(this.logsDir, 'access.log'),
        level: 'http',
        format: logFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 15,
        tailable: true
      }),
      
      // Database log file
      new winston.transports.File({
        filename: path.join(this.logsDir, 'database.log'),
        level: 'debug',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    ];
    
    // Add daily rotate transport for production
    if (process.env.NODE_ENV === 'production') {
      const DailyRotateFile = require('winston-daily-rotate-file');
      
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logsDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'info',
          format: logFormat
        })
      );
    }
    
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exitOnError: false,
      
      // Default metadata
      defaultMeta: {
        service: 'celebrity-booking-api',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        hostname: require('os').hostname(),
        pid: process.pid
      }
    });
  }
  
  setupGlobalHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        type: 'uncaughtException'
      });
      
      // Give winston time to write logs before exiting
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : null,
        promise: promise.toString(),
        type: 'unhandledRejection'
      });
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, starting graceful shutdown');
      this.shutdown();
    });
    
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, starting graceful shutdown');
      this.shutdown();
    });
  }
  
  // High-level logging methods
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }
  
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }
  
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }
  
  error(message, error = null, meta = {}) {
    const logMeta = { ...meta };
    
    if (error instanceof Error) {
      logMeta.error = error.message;
      logMeta.stack = error.stack;
      logMeta.name = error.name;
    } else if (error) {
      logMeta.error = error;
    }
    
    this.logger.error(message, logMeta);
  }
  
  // HTTP request logging
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      userRole: req.user?.role,
      contentLength: res.get('Content-Length'),
      referer: req.get('Referer')
    };
    
    // Log based on status code
    if (res.statusCode >= 400) {
      this.logger.error('HTTP Request Error', logData);
    } else if (res.statusCode >= 300) {
      this.logger.warn('HTTP Request Redirect', logData);
    } else {
      this.logger.http('HTTP Request', logData);
    }
  }
  
  // Database operation logging
  logDatabase(operation, table, duration, error = null, meta = {}) {
    const logData = {
      operation,
      table,
      duration: `${duration}ms`,
      ...meta
    };
    
    if (error) {
      logData.error = error.message;
      logData.stack = error.stack;
      this.logger.error('Database Error', logData);
    } else if (duration > 1000) {
      this.logger.warn('Slow Database Query', logData);
    } else {
      this.logger.debug('Database Operation', logData);
    }
  }
  
  // Authentication logging
  logAuth(event, userId, success = true, meta = {}) {
    const logData = {
      event,
      userId,
      success,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    if (success) {
      this.logger.info('Authentication Success', logData);
    } else {
      this.logger.warn('Authentication Failure', logData);
    }
  }
  
  // Business logic logging
  logBusiness(event, entity, action, meta = {}) {
    const logData = {
      event,
      entity,
      action,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    this.logger.info('Business Event', logData);
  }
  
  // Security event logging
  logSecurity(event, severity = 'medium', meta = {}) {
    const logData = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    if (severity === 'high') {
      this.logger.error('Security Event', logData);
    } else if (severity === 'medium') {
      this.logger.warn('Security Event', logData);
    } else {
      this.logger.info('Security Event', logData);
    }
  }
  
  // Performance logging
  logPerformance(metric, value, unit = 'ms', meta = {}) {
    const logData = {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    this.logger.info('Performance Metric', logData);
  }
  
  // Cache operation logging
  logCache(operation, key, hit = null, meta = {}) {
    const logData = {
      operation,
      key: key.substring(0, 50) + '...',
      hit,
      ...meta
    };
    
    this.logger.debug('Cache Operation', logData);
  }
  
  // Email logging
  logEmail(event, recipient, template = null, success = true, meta = {}) {
    const logData = {
      event,
      recipient,
      template,
      success,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    if (success) {
      this.logger.info('Email Sent', logData);
    } else {
      this.logger.error('Email Failed', logData);
    }
  }
  
  // File operation logging
  logFile(operation, filename, size = null, meta = {}) {
    const logData = {
      operation,
      filename,
      size,
      ...meta
    };
    
    this.logger.info('File Operation', logData);
  }
  
  // External API logging
  logExternalAPI(service, endpoint, responseTime, statusCode, meta = {}) {
    const logData = {
      service,
      endpoint,
      responseTime: `${responseTime}ms`,
      statusCode,
      ...meta
    };
    
    if (statusCode >= 400) {
      this.logger.error('External API Error', logData);
    } else if (responseTime > 5000) {
      this.logger.warn('Slow External API', logData);
    } else {
      this.logger.debug('External API Call', logData);
    }
  }
  
  // Get log statistics
  getStats() {
    const stats = {
      logsDirectory: this.logsDir,
      logLevel: this.logger.level,
      transports: this.logger.transports.length,
      files: []
    };
    
    try {
      const files = fs.readdirSync(this.logsDir);
      stats.files = files.map(file => {
        const filePath = path.join(this.logsDir, file);
        const stat = fs.statSync(filePath);
        return {
          name: file,
          size: stat.size,
          modified: stat.mtime
        };
      });
    } catch (error) {
      this.logger.error('Failed to read logs directory', error);
    }
    
    return stats;
  }
  
  // Health check
  async healthCheck() {
    try {
      const testMessage = 'Health check test log';
      this.logger.info(testMessage, { healthCheck: true });
      
      return {
        status: 'healthy',
        logsDirectory: fs.existsSync(this.logsDir),
        winston: true,
        transports: this.logger.transports.length
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  // Log rotation and cleanup
  async cleanup(maxAge = 30) {
    try {
      let deletedCount = 0;
      const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
      
      const files = fs.readdirSync(this.logsDir);
      
      for (const file of files) {
        const filePath = path.join(this.logsDir, file);
        const stat = fs.statSync(filePath);
        
        if (Date.now() - stat.mtime.getTime() > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          this.logger.info('Deleted old log file', { file, age: maxAge });
        }
      }
      
      this.logger.info('Log cleanup completed', { deletedFiles: deletedCount });
      return deletedCount;
    } catch (error) {
      this.logger.error('Log cleanup failed', error);
      return 0;
    }
  }
  
  // Graceful shutdown
  shutdown() {
    this.logger.info('Logging service shutting down');
    
    // Close all transports
    this.logger.transports.forEach(transport => {
      if (transport.close) {
        transport.close();
      }
    });
    
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
}

// Create and export singleton instance
const loggingService = new LoggingService();

// Export both the service and direct logger access
module.exports = {
  loggingService,
  logger: loggingService.logger,
  
  // Convenience methods
  debug: (message, meta) => loggingService.debug(message, meta),
  info: (message, meta) => loggingService.info(message, meta),
  warn: (message, meta) => loggingService.warn(message, meta),
  error: (message, error, meta) => loggingService.error(message, error, meta),
  
  // Specialized logging
  logRequest: (req, res, responseTime) => loggingService.logRequest(req, res, responseTime),
  logDatabase: (operation, table, duration, error, meta) => loggingService.logDatabase(operation, table, duration, error, meta),
  logAuth: (event, userId, success, meta) => loggingService.logAuth(event, userId, success, meta),
  logBusiness: (event, entity, action, meta) => loggingService.logBusiness(event, entity, action, meta),
  logSecurity: (event, severity, meta) => loggingService.logSecurity(event, severity, meta),
  logPerformance: (metric, value, unit, meta) => loggingService.logPerformance(metric, value, unit, meta),
  logCache: (operation, key, hit, meta) => loggingService.logCache(operation, key, hit, meta),
  logEmail: (event, recipient, template, success, meta) => loggingService.logEmail(event, recipient, template, success, meta),
  logFile: (operation, filename, size, meta) => loggingService.logFile(operation, filename, size, meta),
  logExternalAPI: (service, endpoint, responseTime, statusCode, meta) => loggingService.logExternalAPI(service, endpoint, responseTime, statusCode, meta)
};