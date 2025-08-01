const cors = require('cors');
const { logger, securityLogger } = require('../utils/logger');

/**
 * Secure CORS Configuration
 * Provides production-ready CORS settings with comprehensive security controls
 */

class SecureCORSConfig {
  constructor() {
    this.allowedOrigins = this.getAllowedOrigins();
    this.trustedDomains = this.getTrustedDomains();
    this.corsOptions = this.createCORSOptions();
  }

  /**
   * Get allowed origins based on environment
   */
  getAllowedOrigins() {
    const baseOrigins = {
      development: [
        'http://localhost:3000',
        'http://localhost:3001', // Admin dashboard
        'http://localhost:8080', // Main frontend
        'http://localhost:5173', // Vite dev server
        'http://localhost:5174', // Alternative Vite port
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5173'
      ],
      staging: [
        'https://staging.bookmyreservation.org',
        'https://admin-staging.bookmyreservation.org',
        'https://api-staging.bookmyreservation.org'
      ],
      production: [
        'https://bookmyreservation.org',
        'https://www.bookmyreservation.org',
        'https://admin.bookmyreservation.org',
        'https://api.bookmyreservation.org'
      ]
    };

    const environment = process.env.NODE_ENV || 'development';
    let origins = baseOrigins[environment] || baseOrigins.development;

    // Add custom origins from environment variable
    if (process.env.CORS_ALLOWED_ORIGINS) {
      const customOrigins = process.env.CORS_ALLOWED_ORIGINS
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0);
      
      origins = [...origins, ...customOrigins];
    }

    // Remove duplicates and validate URLs
    origins = [...new Set(origins)].filter(origin => this.isValidOrigin(origin));

    logger.info(`CORS allowed origins configured: ${origins.length} origins for ${environment}`);
    return origins;
  }

  /**
   * Get trusted domains for additional security checks
   */
  getTrustedDomains() {
    const trustedDomains = [
      'bookmyreservation.org',
      'localhost',
      '127.0.0.1'
    ];

    if (process.env.CORS_TRUSTED_DOMAINS) {
      const customDomains = process.env.CORS_TRUSTED_DOMAINS
        .split(',')
        .map(domain => domain.trim())
        .filter(domain => domain.length > 0);
      
      trustedDomains.push(...customDomains);
    }

    return [...new Set(trustedDomains)];
  }

  /**
   * Validate if origin is properly formatted
   */
  isValidOrigin(origin) {
    try {
      const url = new URL(origin);
      
      // Only allow HTTP/HTTPS protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        logger.warn(`Invalid origin protocol: ${origin}`);
        return false;
      }

      // Block suspicious patterns
      const suspiciousPatterns = [
        /data:/i,
        /javascript:/i,
        /file:/i,
        /ftp:/i,
        /\.(js|html|php)$/i,
        /<script/i,
        /[<>'"]/
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(origin))) {
        securityLogger.warn(`Suspicious origin pattern detected: ${origin}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.warn(`Invalid origin URL format: ${origin}`);
      return false;
    }
  }

  /**
   * Check if origin is from a trusted domain
   */
  isTrustedDomain(origin) {
    if (!origin) return false;

    try {
      const url = new URL(origin);
      const hostname = url.hostname.toLowerCase();

      return this.trustedDomains.some(trustedDomain => {
        // Exact match
        if (hostname === trustedDomain) return true;
        
        // Subdomain match (e.g., admin.bookmyreservation.org)
        if (hostname.endsWith(`.${trustedDomain}`)) return true;
        
        return false;
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Advanced origin validation with security checks
   */
  validateOrigin(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      // In production, log requests without origin for monitoring
      if (process.env.NODE_ENV === 'production') {
        logger.debug('Request without origin header');
      }
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (this.allowedOrigins.includes(origin)) {
      logger.debug(`CORS allowed origin: ${origin}`);
      return callback(null, true);
    }

    // Additional security checks for production
    if (process.env.NODE_ENV === 'production') {
      // Check if it's a trusted domain (for wildcard subdomains)
      if (this.isTrustedDomain(origin)) {
        logger.info(`CORS allowed trusted domain: ${origin}`);
        return callback(null, true);
      }

      // Log blocked origin for security monitoring
      securityLogger.warn('CORS origin blocked', {
        origin,
        userAgent: 'Unknown', // Will be set by request context
        timestamp: new Date().toISOString(),
        reason: 'not_in_allowed_list'
      });

      return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    }

    // In development, be more permissive but still log
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`CORS allowing development origin: ${origin}`);
      return callback(null, true);
    }

    // Default deny
    return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
  }

  /**
   * Create comprehensive CORS options
   */
  createCORSOptions() {
    return {
      origin: (origin, callback) => {
        this.validateOrigin(origin, callback);
      },
      
      credentials: true, // Allow cookies and auth headers
      
      methods: [
        'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'
      ],
      
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Device-ID',
        'X-Client-Version',
        'Cache-Control',
        'Pragma'
      ],
      
      exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
        'X-Cache'
      ],
      
      maxAge: process.env.NODE_ENV === 'production' ? 86400 : 300, // 24h prod, 5m dev
      
      optionsSuccessStatus: 200, // For legacy browser support
      
      preflightContinue: false // Handle preflight responses automatically
    };
  }

  /**
   * Create CORS middleware with enhanced logging
   */
  createMiddleware() {
    return cors({
      ...this.corsOptions,
      origin: (origin, callback) => {
        // Add request context to logging if available
        const startTime = Date.now();
        
        this.validateOrigin(origin, (error, allowed) => {
          const duration = Date.now() - startTime;
          
          if (error) {
            securityLogger.warn('CORS request blocked', {
              origin,
              error: error.message,
              duration,
              timestamp: new Date().toISOString()
            });
          } else if (allowed) {
            logger.debug('CORS request allowed', {
              origin,
              duration,
              allowed
            });
          }
          
          callback(error, allowed);
        });
      }
    });
  }

  /**
   * Create strict CORS for sensitive endpoints
   */
  createStrictCORSMiddleware() {
    const strictOptions = {
      ...this.corsOptions,
      origin: (origin, callback) => {
        // Only allow exact matches from allowed origins
        if (!origin || this.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        securityLogger.warn('Strict CORS request blocked', {
          origin,
          timestamp: new Date().toISOString(),
          reason: 'strict_mode'
        });
        
        return callback(new Error('CORS: Strict mode - origin not allowed'), false);
      },
      credentials: true,
      maxAge: 300 // Shorter cache for sensitive endpoints
    };

    return cors(strictOptions);
  }

  /**
   * Create public CORS for non-sensitive endpoints
   */
  createPublicCORSMiddleware() {
    const publicOptions = {
      origin: true, // Allow all origins
      credentials: false, // No credentials for public endpoints
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With', 
        'Content-Type',
        'Accept'
      ],
      maxAge: 3600, // 1 hour cache
      optionsSuccessStatus: 200
    };

    return cors(publicOptions);
  }

  /**
   * Get CORS configuration summary
   */
  getConfigurationSummary() {
    return {
      environment: process.env.NODE_ENV || 'development',
      allowedOrigins: this.allowedOrigins,
      trustedDomains: this.trustedDomains,
      corsSettings: {
        credentials: this.corsOptions.credentials,
        methods: this.corsOptions.methods,
        maxAge: this.corsOptions.maxAge
      }
    };
  }

  /**
   * Validate current CORS configuration
   */
  validateConfiguration() {
    const issues = [];
    
    // Check for production readiness
    if (process.env.NODE_ENV === 'production') {
      const hasHttpOrigins = this.allowedOrigins.some(origin => origin.startsWith('http://'));
      if (hasHttpOrigins) {
        issues.push('Production environment should not allow HTTP origins');
      }
      
      const hasLocalhostOrigins = this.allowedOrigins.some(origin => 
        origin.includes('localhost') || origin.includes('127.0.0.1')
      );
      if (hasLocalhostOrigins) {
        issues.push('Production environment should not allow localhost origins');
      }
    }
    
    // Check for wildcard origins
    const hasWildcards = this.allowedOrigins.some(origin => origin.includes('*'));
    if (hasWildcards && process.env.NODE_ENV === 'production') {
      issues.push('Wildcard origins should not be used in production');
    }
    
    // Check for minimum required origins
    if (this.allowedOrigins.length === 0) {
      issues.push('No allowed origins configured');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      summary: this.getConfigurationSummary()
    };
  }
}

// Create singleton instance
const secureCORSConfig = new SecureCORSConfig();

// Export different middleware configurations
module.exports = {
  SecureCORSConfig,
  secureCORSConfig,
  
  // Default secure CORS middleware
  secureCORS: secureCORSConfig.createMiddleware(),
  
  // Strict CORS for sensitive endpoints (auth, admin, payments)
  strictCORS: secureCORSConfig.createStrictCORSMiddleware(),
  
  // Public CORS for non-sensitive endpoints (health checks, public data)
  publicCORS: secureCORSConfig.createPublicCORSMiddleware(),
  
  // Configuration utilities
  getCORSConfig: () => secureCORSConfig.getConfigurationSummary(),
  validateCORSConfig: () => secureCORSConfig.validateConfiguration()
};