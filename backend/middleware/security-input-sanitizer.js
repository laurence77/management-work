const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');
const { logger } = require('../utils/logger');
const { errorHandler } = require('../utils/standard-error-handler');

/**
 * Comprehensive Input Sanitization and Validation Middleware
 * Protects against XSS, injection attacks, and malicious input
 */

class SecurityInputSanitizer {
  constructor() {
    this.maxStringLength = 10000;
    this.maxObjectDepth = 10;
    this.maxArrayLength = 1000;
    
    // Dangerous patterns that should be blocked
    this.maliciousPatterns = [
      // Script injection patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi,
      /eval\s*\(/gi,
      
      // SQL injection patterns
      /'\s*(or|and)\s*'?\w/gi,
      /union\s+select/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
      /update\s+\w+\s+set/gi,
      /drop\s+(table|database)/gi,
      
      // Command injection patterns
      /[;&|`$(){}[\]]/g,
      /\.\./g, // Path traversal
      
      // NoSQL injection patterns
      /\$where/gi,
      /\$ne/gi,
      /\$regex/gi,
      
      // Template injection patterns
      /\{\{.*\}\}/g,
      /\$\{.*\}/g,
      
      // XML injection patterns
      /<!entity/gi,
      /<!doctype/gi,
      
      // LDAP injection patterns
      /[()=*!&|]/g
    ];
  }

  /**
   * Main sanitization middleware
   */
  middleware() {
    return (req, res, next) => {
      try {
        // Sanitize all input data
        if (req.body) {
          req.body = this.sanitizeObject(req.body, 'body');
        }
        
        if (req.query) {
          req.query = this.sanitizeObject(req.query, 'query');
        }
        
        if (req.params) {
          req.params = this.sanitizeObject(req.params, 'params');
        }
        
        // Sanitize headers (selective)
        if (req.headers) {
          req.headers = this.sanitizeHeaders(req.headers);
        }
        
        next();
      } catch (error) {
        logger.error('Input sanitization error:', error);
        const sanitizationError = errorHandler.createError(
          errorHandler.errorTypes.VALIDATION,
          'Invalid input detected',
          null,
          error
        );
        next(sanitizationError);
      }
    };
  }

  /**
   * Sanitize an object recursively
   */
  sanitizeObject(obj, source = 'unknown', depth = 0) {
    if (depth > this.maxObjectDepth) {
      throw new Error(`Object nesting too deep in ${source}`);
    }
    
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      if (obj.length > this.maxArrayLength) {
        throw new Error(`Array too large in ${source}`);
      }
      return obj.map((item, index) => 
        this.sanitizeObject(item, `${source}[${index}]`, depth + 1)
      );
    }
    
    if (typeof obj === 'object') {
      const sanitized = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key, `${source}.${key}`);
        sanitized[sanitizedKey] = this.sanitizeObject(value, `${source}.${key}`, depth + 1);
      }
      
      return sanitized;
    }
    
    if (typeof obj === 'string') {
      return this.sanitizeString(obj, source);
    }
    
    if (typeof obj === 'number') {
      return this.sanitizeNumber(obj, source);
    }
    
    if (typeof obj === 'boolean') {
      return obj;
    }
    
    // For other types, convert to string and sanitize
    return this.sanitizeString(String(obj), source);
  }

  /**
   * Sanitize string input
   */
  sanitizeString(str, source = 'unknown') {
    if (typeof str !== 'string') {
      str = String(str);
    }
    
    // Check length
    if (str.length > this.maxStringLength) {
      throw new Error(`String too long in ${source}`);
    }
    
    // Check for malicious patterns
    for (const pattern of this.maliciousPatterns) {
      if (pattern.test(str)) {
        logger.warn('Malicious pattern detected:', {
          source,
          pattern: pattern.toString(),
          input: str.substring(0, 100)
        });
        throw new Error(`Potentially malicious input detected in ${source}`);
      }
    }
    
    // HTML sanitization for potential HTML content
    let sanitized = str;
    
    // Check if string looks like HTML
    if (this.containsHTML(str)) {
      sanitized = DOMPurify.sanitize(str, {
        ALLOWED_TAGS: [], // No HTML tags allowed by default
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      });
    }
    
    // Additional escaping for special contexts
    sanitized = this.escapeSpecialCharacters(sanitized);
    
    // Normalize whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }

  /**
   * Sanitize numeric input
   */
  sanitizeNumber(num, source = 'unknown') {
    if (typeof num !== 'number') {
      throw new Error(`Invalid number in ${source}`);
    }
    
    if (!isFinite(num)) {
      throw new Error(`Invalid number (not finite) in ${source}`);
    }
    
    // Check for reasonable bounds
    if (Math.abs(num) > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Number too large in ${source}`);
    }
    
    return num;
  }

  /**
   * Sanitize HTTP headers
   */
  sanitizeHeaders(headers) {
    const sanitized = {};
    const allowedHeaders = [
      'authorization', 'content-type', 'accept', 'user-agent',
      'origin', 'referer', 'accept-language', 'accept-encoding',
      'cache-control', 'connection', 'host', 'x-forwarded-for',
      'x-real-ip', 'x-request-id'
    ];
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      
      if (allowedHeaders.includes(lowerKey)) {
        sanitized[key] = this.sanitizeHeaderValue(value, key);
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize individual header value
   */
  sanitizeHeaderValue(value, headerName) {
    if (typeof value !== 'string') {
      return value;
    }
    
    // Remove potential header injection
    const sanitized = value
      .replace(/[\r\n]/g, '') // Remove CRLF
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
      .substring(0, 1000); // Limit length
    
    return sanitized;
  }

  /**
   * Check if string contains HTML
   */
  containsHTML(str) {
    return /<[^>]*>/g.test(str);
  }

  /**
   * Escape special characters for various contexts
   */
  escapeSpecialCharacters(str) {
    // Basic HTML entity escaping
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    return validator.isEmail(email) && email.length <= 254;
  }

  /**
   * Validate URL format
   */
  validateURL(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: false
    });
  }

  /**
   * Validate phone number
   */
  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    
    return validator.isMobilePhone(phone, 'any', { strictMode: false });
  }

  /**
   * Validate UUID format
   */
  validateUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }
    
    return validator.isUUID(uuid);
  }

  /**
   * Validate date format
   */
  validateDate(date) {
    if (!date) {
      return false;
    }
    
    if (typeof date === 'string') {
      return validator.isISO8601(date);
    }
    
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Sanitize filename for file uploads
   */
  sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename');
    }
    
    // Remove dangerous characters
    const sanitized = filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace dangerous chars with underscore
      .replace(/\.{2,}/g, '.') // Remove multiple dots
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 255); // Limit length
    
    if (!sanitized || sanitized.length === 0) {
      throw new Error('Invalid filename after sanitization');
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize JSON input
   */
  sanitizeJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return this.sanitizeObject(parsed, 'json');
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Content Security Policy for dynamic content
   */
  getCSPHeaders() {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: https://images.unsplash.com",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://api.stripe.com wss:",
        "media-src 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ].join('; ')
    };
  }

  /**
   * Validation middleware for specific field types
   */
  validateFields(fieldRules) {
    return (req, res, next) => {
      try {
        const errors = [];
        
        for (const [field, rules] of Object.entries(fieldRules)) {
          const value = this.getNestedValue(req.body, field);
          
          for (const rule of rules) {
            const result = this.validateField(value, rule, field);
            if (!result.valid) {
              errors.push({
                field,
                message: result.message,
                rule: rule.type
              });
            }
          }
        }
        
        if (errors.length > 0) {
          const validationError = errorHandler.handleValidationError({ errors });
          return next(validationError);
        }
        
        next();
      } catch (error) {
        logger.error('Field validation error:', error);
        next(errorHandler.createError(
          errorHandler.errorTypes.VALIDATION,
          'Validation failed',
          null,
          error
        ));
      }
    };
  }

  /**
   * Validate individual field
   */
  validateField(value, rule, fieldName) {
    switch (rule.type) {
      case 'email':
        return {
          valid: this.validateEmail(value),
          message: `${fieldName} must be a valid email address`
        };
        
      case 'url':
        return {
          valid: this.validateURL(value),
          message: `${fieldName} must be a valid URL`
        };
        
      case 'phone':
        return {
          valid: this.validatePhone(value),
          message: `${fieldName} must be a valid phone number`
        };
        
      case 'uuid':
        return {
          valid: this.validateUUID(value),
          message: `${fieldName} must be a valid UUID`
        };
        
      case 'date':
        return {
          valid: this.validateDate(value),
          message: `${fieldName} must be a valid date`
        };
        
      case 'required':
        return {
          valid: value !== null && value !== undefined && value !== '',
          message: `${fieldName} is required`
        };
        
      case 'minLength':
        return {
          valid: typeof value === 'string' && value.length >= rule.value,
          message: `${fieldName} must be at least ${rule.value} characters`
        };
        
      case 'maxLength':
        return {
          valid: typeof value === 'string' && value.length <= rule.value,
          message: `${fieldName} must be no more than ${rule.value} characters`
        };
        
      default:
        return { valid: true, message: '' };
    }
  }

  /**
   * Get nested object value by dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Create singleton instance
const securityInputSanitizer = new SecurityInputSanitizer();

module.exports = {
  SecurityInputSanitizer,
  securityInputSanitizer,
  sanitizeMiddleware: securityInputSanitizer.middleware(),
  validateFields: securityInputSanitizer.validateFields.bind(securityInputSanitizer)
};