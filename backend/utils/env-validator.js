const { logger } = require('./logger');

/**
 * Comprehensive Environment Variable Validator
 * Validates all critical environment variables required for application security and functionality
 */

class EnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validationRules = {
      // Security - JWT Configuration
      JWT_SECRET: {
        required: true,
        type: 'string',
        minLength: 64,
        description: 'JWT secret for access tokens'
      },
      REFRESH_TOKEN_SECRET: {
        required: true,
        type: 'string',
        minLength: 64,
        description: 'JWT secret for refresh tokens'
      },
      
      // Database Configuration - Supabase
      SUPABASE_URL: {
        required: true,
        type: 'url',
        pattern: /^https:\/\/.+\.supabase\.co$/,
        description: 'Supabase project URL'
      },
      SUPABASE_ANON_KEY: {
        required: true,
        type: 'string',
        minLength: 100,
        description: 'Supabase anonymous key'
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        required: true,
        type: 'string',
        minLength: 100,
        description: 'Supabase service role key'
      },
      SUPABASE_SERVICE_KEY: {
        required: true,
        type: 'string',
        minLength: 100,
        description: 'Supabase service key'
      },
      
      // CORS Configuration
      CORS_ALLOWED_ORIGINS: {
        required: false,
        type: 'string',
        validator: this.validateCORSOrigins.bind(this),
        description: 'Comma-separated list of allowed CORS origins'
      },
      CORS_TRUSTED_DOMAINS: {
        required: false,
        type: 'string',
        validator: this.validateDomainList.bind(this),
        description: 'Comma-separated list of trusted domains'
      }
      },
      
      // Application Configuration
      NODE_ENV: {
        required: true,
        type: 'string',
        allowedValues: ['development', 'production', 'staging', 'test'],
        description: 'Node.js environment'
      },
      PORT: {
        required: true,
        type: 'number',
        min: 1000,
        max: 65535,
        description: 'Application port'
      },
      DOMAIN: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        description: 'Application domain'
      },
      
      // Email Configuration
      SMTP_HOST: {
        required: true,
        type: 'string',
        minLength: 5,
        description: 'SMTP server host'
      },
      SMTP_PORT: {
        required: true,
        type: 'number',
        allowedValues: [25, 465, 587, 2525],
        description: 'SMTP server port'
      },
      SMTP_SECURE: {
        required: true,
        type: 'boolean',
        description: 'SMTP SSL/TLS security'
      },
      SMTP_USER: {
        required: true,
        type: 'email',
        description: 'SMTP authentication user'
      },
      SMTP_PASS: {
        required: true,
        type: 'string',
        minLength: 8,
        description: 'SMTP authentication password'
      },
      EMAIL_FROM: {
        required: true,
        type: 'string',
        minLength: 5,
        description: 'Default email sender'
      },
      
      // URLs
      FRONTEND_URL: {
        required: true,
        type: 'url',
        description: 'Frontend application URL'
      },
      ADMIN_URL: {
        required: false,
        type: 'url',
        description: 'Admin dashboard URL'
      },
      
      // File Upload Configuration
      MAX_FILE_SIZE: {
        required: true,
        type: 'number',
        min: 1024,
        max: 100 * 1024 * 1024, // 100MB max
        description: 'Maximum file upload size in bytes'
      },
      UPLOAD_PATH: {
        required: true,
        type: 'string',
        minLength: 2,
        description: 'File upload directory path'
      },
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: {
        required: true,
        type: 'number',
        min: 60000, // 1 minute minimum
        max: 3600000, // 1 hour maximum
        description: 'Rate limiting window in milliseconds'
      },
      RATE_LIMIT_MAX_REQUESTS: {
        required: true,
        type: 'number',
        min: 10,
        max: 10000,
        description: 'Maximum requests per rate limit window'
      },
      
      // Optional Token Configuration
      ACCESS_TOKEN_EXPIRY: {
        required: false,
        type: 'string',
        pattern: /^\d+(m|h|d)$/,
        description: 'Access token expiry duration'
      },
      REFRESH_TOKEN_EXPIRY: {
        required: false,
        type: 'string',
        pattern: /^\d+(d|w)$/,
        description: 'Refresh token expiry duration'
      }
    };
  }

  /**
   * Validate a single environment variable
   */
  validateVariable(name, rules) {
    const value = process.env[name];
    const errors = [];

    // Check if required variable is missing
    if (rules.required && (!value || value.trim() === '')) {
      errors.push(`${name} is required but not set`);
      return errors;
    }

    // Skip validation if optional and not set
    if (!rules.required && (!value || value.trim() === '')) {
      return errors;
    }

    // Type validation
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${name} must be a string`);
        }
        break;
      
      case 'number':
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
          errors.push(`${name} must be a valid number`);
          break;
        }
        
        if (rules.min !== undefined && numValue < rules.min) {
          errors.push(`${name} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && numValue > rules.max) {
          errors.push(`${name} must be at most ${rules.max}`);
        }
        break;
      
      case 'boolean':
        if (!['true', 'false'].includes(value.toLowerCase())) {
          errors.push(`${name} must be 'true' or 'false'`);
        }
        break;
      
      case 'url':
        try {
          new URL(value);
        } catch {
          errors.push(`${name} must be a valid URL`);
        }
        break;
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${name} must be a valid email address`);
        }
        break;
    }

    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${name} must be at least ${rules.minLength} characters long`);
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${name} must be at most ${rules.maxLength} characters long`);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${name} format is invalid`);
    }

    // Allowed values validation
    if (rules.allowedValues && !rules.allowedValues.includes(value) && rules.type !== 'number') {
      errors.push(`${name} must be one of: ${rules.allowedValues.join(', ')}`);
    }
    if (rules.allowedValues && rules.type === 'number') {
      const numValue = parseInt(value, 10);
      if (!rules.allowedValues.includes(numValue)) {
        errors.push(`${name} must be one of: ${rules.allowedValues.join(', ')}`);
      }
    }

    return errors;
  }

  /**
   * Perform security-specific validations
   */
  validateSecurity() {
    const securityErrors = [];

    // Ensure JWT secrets are different
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    
    if (jwtSecret && refreshSecret && jwtSecret === refreshSecret) {
      securityErrors.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be different for security');
    }

    // Validate production-specific requirements
    if (process.env.NODE_ENV === 'production') {
      // Ensure HTTPS in production
      const frontendUrl = process.env.FRONTEND_URL;
      const adminUrl = process.env.ADMIN_URL;
      
      if (frontendUrl && !frontendUrl.startsWith('https://')) {
        securityErrors.push('FRONTEND_URL must use HTTPS in production');
      }
      if (adminUrl && !adminUrl.startsWith('https://')) {
        securityErrors.push('ADMIN_URL must use HTTPS in production');
      }

      // Ensure secure SMTP in production
      if (process.env.SMTP_SECURE !== 'true') {
        securityErrors.push('SMTP_SECURE must be true in production');
      }

      // Check for development/test values in production
      if (process.env.SMTP_PASS && process.env.SMTP_PASS.includes('test') || process.env.SMTP_PASS.includes('dev')) {
        this.warnings.push('SMTP_PASS appears to contain test/dev credentials in production');
      }
    }

    return securityErrors;
  }

  /**
   * Validate all environment variables
   */
  validate() {
    this.errors = [];
    this.warnings = [];

    logger.info('Starting comprehensive environment variable validation...');

    // Validate each configured variable
    for (const [name, rules] of Object.entries(this.validationRules)) {
      const variableErrors = this.validateVariable(name, rules);
      this.errors.push(...variableErrors);
    }

    // Perform security validations
    const securityErrors = this.validateSecurity();
    this.errors.push(...securityErrors);

    // Log results
    if (this.errors.length > 0) {
      logger.error('Environment validation failed:', {
        errors: this.errors,
        count: this.errors.length
      });
    }

    if (this.warnings.length > 0) {
      logger.warn('Environment validation warnings:', {
        warnings: this.warnings,
        count: this.warnings.length
      });
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      logger.info('✅ All environment variables are valid');
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Validate and throw if invalid (for startup validation)
   */
  validateOrThrow() {
    const result = this.validate();
    
    if (!result.isValid) {
      const errorMessage = `Environment validation failed:\n${result.errors.map(e => `  - ${e}`).join('\n')}`;
      throw new Error(errorMessage);
    }

    return result;
  }

  /**
   * Get validation summary for logging
   */
  getValidationSummary() {
    const totalVars = Object.keys(this.validationRules).length;
    const requiredVars = Object.values(this.validationRules).filter(rule => rule.required).length;
    const setVars = Object.keys(this.validationRules).filter(name => process.env[name]).length;

    return {
      total: totalVars,
      required: requiredVars,
      set: setVars,
      errors: this.errors.length,
      warnings: this.warnings.length
    };
  }

  /**
   * Validate CORS origins format and security
   */
  validateCORSOrigins(value) {
    const errors = [];
    
    if (!value || value.trim() === '') {
      return errors; // Optional field
    }
    
    const origins = value.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);
    
    for (const origin of origins) {
      try {
        const url = new URL(origin);
        
        // Check protocol
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push(`CORS origin '${origin}' must use HTTP or HTTPS protocol`);
        }
        
        // Production environment checks
        if (process.env.NODE_ENV === 'production') {
          // Warn about HTTP in production
          if (url.protocol === 'http:') {
            this.warnings.push(`CORS origin '${origin}' uses HTTP in production environment`);
          }
          
          // Warn about localhost in production
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            this.warnings.push(`CORS origin '${origin}' uses localhost in production environment`);
          }
        }
        
        // Check for suspicious patterns
        const suspiciousPatterns = [
          /data:/i,
          /javascript:/i,
          /file:/i,
          /<script/i,
          /[<>'"`]/
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(origin))) {
          errors.push(`CORS origin '${origin}' contains suspicious patterns`);
        }
        
      } catch (error) {
        errors.push(`CORS origin '${origin}' is not a valid URL`);
      }
    }
    
    return errors;
  }

  /**
   * Validate domain list format
   */
  validateDomainList(value) {
    const errors = [];
    
    if (!value || value.trim() === '') {
      return errors; // Optional field
    }
    
    const domains = value.split(',').map(domain => domain.trim()).filter(domain => domain.length > 0);
    
    for (const domain of domains) {
      // Basic domain validation
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
      
      if (!domainRegex.test(domain)) {
        errors.push(`Domain '${domain}' is not valid`);
      }
      
      // Check for suspicious patterns
      if (domain.includes('<') || domain.includes('>') || domain.includes('script')) {
        errors.push(`Domain '${domain}' contains suspicious patterns`);
      }
    }
    
    return errors;
  }
}

module.exports = { EnvValidator };