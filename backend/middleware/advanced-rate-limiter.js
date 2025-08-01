const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');
const { logger, securityLogger } = require('../utils/logger');

/**
 * Advanced Rate Limiting Middleware
 * Implements sophisticated rate limiting with multiple strategies
 */

class AdvancedRateLimiter {
  constructor() {
    this.redisClient = null;
    this.initRedis();
  }

  async initRedis() {
    try {
      // Only use Redis if available, fallback to memory store
      if (process.env.REDIS_URL) {
        this.redisClient = Redis.createClient({
          url: process.env.REDIS_URL,
          legacyMode: false
        });
        
        await this.redisClient.connect();
        logger.info('✅ Redis connected for rate limiting');
      }
    } catch (error) {
      logger.warn('⚠️ Redis not available, using memory store for rate limiting:', error.message);
    }
  }

  /**
   * Get Redis store or fallback to memory
   */
  getStore() {
    if (this.redisClient) {
      return new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args)
      });
    }
    return undefined; // Use default memory store
  }

  /**
   * Create rate limiter with advanced configuration
   */
  createRateLimit(config) {
    const {
      windowMs,
      max,
      message,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = null,
      handler = null,
      onLimitReached = null
    } = config;

    return rateLimit({
      windowMs,
      max,
      message: { success: false, error: message, code: 'RATE_LIMIT_EXCEEDED' },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getStore(),
      skipSuccessfulRequests,
      skipFailedRequests,
      skip: (req) => {
        // Skip rate limiting for localhost in development
        if (process.env.NODE_ENV === 'development') {
          const ip = req.ip || req.connection.remoteAddress;
          return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
        }
        return false;
      },
      keyGenerator: keyGenerator || this.defaultKeyGenerator.bind(this),
      handler: handler || this.defaultHandler.bind(this),
      onLimitReached: onLimitReached || this.defaultOnLimitReached.bind(this)
    });
  }

  /**
   * Default key generator with IP and user identification
   * Skip rate limiting for development localhost
   */
  defaultKeyGenerator(req) {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    const endpoint = req.route?.path || req.path;
    
    // Skip rate limiting for localhost in development
    if (process.env.NODE_ENV === 'development' && 
        (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1')) {
      return null; // Skip rate limiting
    }
    
    return `rate_limit:${ip}:${userId}:${endpoint}`;
  }

  /**
   * Default rate limit handler with security logging
   */
  defaultHandler(req, res, next, options) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const endpoint = req.path;
    
    securityLogger.warn('Rate limit exceeded', {
      ip,
      userAgent,
      endpoint,
      method: req.method,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    res.status(options.statusCode).json({
      success: false,
      error: options.message.error,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(options.windowMs / 1000)
    });
  }

  /**
   * Called when rate limit is reached
   */
  defaultOnLimitReached(req, res, options) {
    const ip = req.ip || req.connection.remoteAddress;
    
    securityLogger.error('Rate limit threshold reached', {
      ip,
      endpoint: req.path,
      method: req.method,
      userId: req.user?.id,
      limit: options.max,
      windowMs: options.windowMs
    });
  }

  /**
   * Authentication rate limiting with progressive delays
   */
  authRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: async (req) => {
        const ip = req.ip || req.connection.remoteAddress;
        
        // Check recent failed attempts for this IP
        const failedAttempts = await this.getFailedAttempts(ip);
        
        // Progressive rate limiting based on failed attempts
        if (failedAttempts >= 10) return 1; // Very strict after 10 failures
        if (failedAttempts >= 5) return 2;  // Strict after 5 failures
        if (failedAttempts >= 3) return 3;  // Moderate after 3 failures
        return 5; // Default: 5 attempts per 15 minutes
      },
      message: 'Too many authentication attempts. Please try again later.',
      skipSuccessfulRequests: true, // Don't count successful logins
      onLimitReached: this.onAuthLimitReached.bind(this)
    });
  }

  /**
   * Payment endpoint rate limiting
   */
  paymentRateLimit() {
    return this.createRateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 3, // Very strict for payments
      message: 'Too many payment requests. Please wait before trying again.',
      keyGenerator: (req) => {
        // Rate limit by both IP and user for payments
        const ip = req.ip || req.connection.remoteAddress;
        const userId = req.user?.id || 'anonymous';
        return `payment_limit:${ip}:${userId}`;
      },
      onLimitReached: this.onPaymentLimitReached.bind(this)
    });
  }

  /**
   * Admin endpoint rate limiting
   */
  adminRateLimit() {
    return this.createRateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 50, // Moderate limit for admin operations
      message: 'Too many admin requests. Please slow down.',
      keyGenerator: (req) => {
        const userId = req.user?.id || 'anonymous';
        return `admin_limit:${userId}`;
      }
    });
  }

  /**
   * API endpoint rate limiting with user tiers
   */
  apiRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: async (req) => {
        const userRole = req.user?.role || 'guest';
        
        // Different limits based on user role
        switch (userRole) {
          case 'admin': return 1000;
          case 'moderator': return 500;
          case 'user': return 200;
          default: return 100;
        }
      },
      message: 'API rate limit exceeded. Upgrade your account for higher limits.',
      skipSuccessfulRequests: false
    });
  }

  /**
   * Registration rate limiting with IP tracking
   */
  registrationRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Max 3 registrations per hour per IP
      message: 'Too many registration attempts. Please try again later.',
      skipFailedRequests: true, // Don't count failed validations
      onLimitReached: this.onRegistrationLimitReached.bind(this)
    });
  }

  /**
   * Search rate limiting to prevent abuse
   */
  searchRateLimit() {
    return this.createRateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // 30 searches per minute
      message: 'Too many search requests. Please slow down.'
    });
  }

  /**
   * File upload rate limiting
   */
  uploadRateLimit() {
    return this.createRateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 20, // 20 uploads per 10 minutes
      message: 'Too many file uploads. Please wait before uploading more files.',
      keyGenerator: (req) => {
        const userId = req.user?.id || req.ip;
        return `upload_limit:${userId}`;
      }
    });
  }

  /**
   * Contact form rate limiting
   */
  contactRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 contact form submissions per hour
      message: 'Too many contact form submissions. Please try again later.'
    });
  }

  /**
   * Booking request rate limiting
   */
  bookingRateLimit() {
    return this.createRateLimit({
      windowMs: 30 * 60 * 1000, // 30 minutes
      max: 10, // 10 booking requests per 30 minutes
      message: 'Too many booking requests. Please wait before submitting another request.',
      keyGenerator: (req) => {
        const userId = req.user?.id || req.ip;
        return `booking_limit:${userId}`;
      }
    });
  }

  /**
   * Get failed authentication attempts for an IP
   */
  async getFailedAttempts(ip) {
    if (!this.redisClient) return 0;
    
    try {
      const key = `failed_auth:${ip}`;
      const attempts = await this.redisClient.get(key);
      return parseInt(attempts || '0', 10);
    } catch (error) {
      logger.error('Error getting failed attempts:', error);
      return 0;
    }
  }

  /**
   * Increment failed authentication attempts
   */
  async incrementFailedAttempts(ip) {
    if (!this.redisClient) return;

    try {
      const key = `failed_auth:${ip}`;
      const current = await this.redisClient.incr(key);
      
      // Set expiry on first failure
      if (current === 1) {
        await this.redisClient.expire(key, 24 * 60 * 60); // 24 hours
      }
      
      return current;
    } catch (error) {
      logger.error('Error incrementing failed attempts:', error);
    }
  }

  /**
   * Reset failed authentication attempts (on successful login)
   */
  async resetFailedAttempts(ip) {
    if (!this.redisClient) return;

    try {
      const key = `failed_auth:${ip}`;
      await this.redisClient.del(key);
    } catch (error) {
      logger.error('Error resetting failed attempts:', error);
    }
  }

  /**
   * Authentication limit reached handler
   */
  async onAuthLimitReached(req, res, options) {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Increment failed attempts counter
    const failedCount = await this.incrementFailedAttempts(ip);
    
    securityLogger.error('Authentication rate limit reached', {
      ip,
      failedAttempts: failedCount,
      endpoint: req.path,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Trigger security alert for excessive attempts
    if (failedCount >= 15) {
      securityLogger.error('SECURITY ALERT: Possible brute force attack', {
        ip,
        failedAttempts: failedCount,
        timeWindow: '24 hours'
      });
    }
  }

  /**
   * Payment limit reached handler
   */
  onPaymentLimitReached(req, res, options) {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id;
    
    securityLogger.error('Payment rate limit reached - possible fraud attempt', {
      ip,
      userId,
      endpoint: req.path,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Registration limit reached handler
   */
  onRegistrationLimitReached(req, res, options) {
    const ip = req.ip || req.connection.remoteAddress;
    
    securityLogger.warn('Registration rate limit reached', {
      ip,
      endpoint: req.path,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Middleware to track successful authentication
   */
  trackSuccessfulAuth() {
    return async (req, res, next) => {
      const originalSend = res.send;
      
      res.send = async function(data) {
        // Check if this is a successful authentication response
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (responseData && responseData.success && req.path.includes('/auth/')) {
          const ip = req.ip || req.connection.remoteAddress;
          await rateLimiter.resetFailedAttempts(ip);
        }
        
        return originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Get rate limiting statistics
   */
  async getStats() {
    if (!this.redisClient) {
      return { error: 'Redis not available' };
    }

    try {
      const keys = await this.redisClient.keys('rate_limit:*');
      const stats = {
        totalKeys: keys.length,
        activeRateLimits: keys.length,
        timestamp: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      logger.error('Error getting rate limit stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Middleware to apply different rate limits based on endpoint
   */
  smartRateLimit() {
    return (req, res, next) => {
      const path = req.path.toLowerCase();
      
      // Apply specific rate limits based on endpoint
      if (path.includes('/auth/login') || path.includes('/auth/signin')) {
        return this.authRateLimit()(req, res, next);
      }
      
      if (path.includes('/auth/register') || path.includes('/auth/signup')) {
        return this.registrationRateLimit()(req, res, next);
      }
      
      if (path.includes('/payment') || path.includes('/checkout')) {
        return this.paymentRateLimit()(req, res, next);
      }
      
      if (path.includes('/admin/')) {
        return this.adminRateLimit()(req, res, next);
      }
      
      if (path.includes('/search')) {
        return this.searchRateLimit()(req, res, next);
      }
      
      if (path.includes('/upload')) {
        return this.uploadRateLimit()(req, res, next);
      }
      
      if (path.includes('/contact')) {
        return this.contactRateLimit()(req, res, next);
      }
      
      if (path.includes('/booking')) {
        return this.bookingRateLimit()(req, res, next);
      }
      
      // Default API rate limit
      return this.apiRateLimit()(req, res, next);
    };
  }
}

// Export singleton instance
const rateLimiter = new AdvancedRateLimiter();
module.exports = rateLimiter;