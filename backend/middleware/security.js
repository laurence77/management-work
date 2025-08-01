const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const slowDown = require('express-slow-down');
const { logger } = require('../services/LoggingService');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: `Too many requests. Please try again later.`,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const rateLimits = {
  // Very strict for auth endpoints
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // max 5 attempts
    'Too many authentication attempts. Please try again in 15 minutes.'
  ),
  
  // Strict for password-related endpoints
  password: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // max 3 attempts
    'Too many password change attempts. Please try again in 1 hour.'
  ),
  
  // Moderate for API endpoints
  api: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // max 100 requests
    'Too many requests. Please try again later.'
  ),
  
  // Strict for file uploads
  upload: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    50, // max 50 uploads per hour
    'Too many file uploads. Please try again later.'
  ),
  
  // Lenient for public endpoints
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    200, // max 200 requests
    'Too many requests. Please try again later.'
  )
};

// Enhanced security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline styles for admin interface
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline scripts for admin interface
        "https://cdnjs.cloudflare.com",
        "https://code.jquery.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://res.cloudinary.com", // Cloudinary CDN
        "https://images.unsplash.com" // Image sources
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com", // Payment processing
        "https://uploads.stripe.com",
        "https://sentry.io" // Error tracking
      ],
      frameSrc: [
        "'self'",
        "https://js.stripe.com", // Stripe payment forms
        "https://hooks.stripe.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
    reportOnly: process.env.NODE_ENV === 'development'
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'sameorigin'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  permissionsPolicy: {
    features: {
      camera: ['none'],
      microphone: ['none'],
      geolocation: ['none'],
      gyroscope: ['none'],
      magnetometer: ['none'],
      payment: ['self'],
      usb: ['none']
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: {
    policy: 'same-origin-allow-popups'
  },
  crossOriginResourcePolicy: {
    policy: 'cross-origin'
  },
  expectCt: {
    maxAge: 86400, // 24 hours
    enforce: process.env.NODE_ENV === 'production'
  }
});

// Speed limiting for additional protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  
  onLimitReached: (req, res, options) => {
    logger.warn('Speed limit reached', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      delay: options.delay
    });
  }
});

// HTTPS enforcement middleware
const enforceHTTPS = (req, res, next) => {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Check if request is already HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }
  
  // Redirect to HTTPS
  const httpsUrl = `https://${req.get('Host')}${req.url}`;
  logger.info('Redirecting to HTTPS', { originalUrl: req.url, httpsUrl });
  
  return res.redirect(301, httpsUrl);
};

// Security monitoring middleware
const securityMonitoring = (req, res, next) => {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /eval\(/i,  // Code injection
    /cmd\s*=/i,  // Command injection
    /exec\s*\(/i  // Command execution
  ];
  
  const fullUrl = req.url;
  const userAgent = req.get('User-Agent') || '';
  
  // Check URL and user agent for suspicious patterns
  const suspicious = suspiciousPatterns.some(pattern => 
    pattern.test(fullUrl) || pattern.test(userAgent)
  );
  
  if (suspicious) {
    logger.warn('Suspicious request detected', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent,
      suspicious: true
    });
  }
  
  next();
};

// Password security utilities
const passwordSecurity = {
  // Hash password with salt
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  },
  
  // Verify password
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  },
  
  // Check password strength
  checkPasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?\":{}|<>]/.test(password);
    const hasNoCommonPatterns = !/(123|abc|password|qwerty)/i.test(password);
    
    const score = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      hasNoCommonPatterns
    ].filter(Boolean).length;
    
    return {
      score,
      isStrong: score >= 5,
      feedback: {
        length: password.length >= minLength,
        upperCase: hasUpperCase,
        lowerCase: hasLowerCase,
        numbers: hasNumbers,
        specialChar: hasSpecialChar,
        noCommonPatterns: hasNoCommonPatterns
      }
    };
  }
};

// JWT security utilities
const jwtSecurity = {
  // Generate secure JWT
  generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn,
      issuer: 'celebrity-booking-platform',
      audience: 'celebrity-booking-users'
    });
  },
  
  // Verify JWT with additional checks
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'celebrity-booking-platform',
        audience: 'celebrity-booking-users'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },
  
  // Generate refresh token
  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
};

// Input sanitization
const sanitizeInput = (req, res, next) => {
  // Remove potentially dangerous characters
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        obj[key] = sanitize(obj[key]);
      });
    }
    return obj;
  };
  
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};

// CORS security
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Session security
const sessionSecurity = {
  // Check if session is valid
  isSessionValid(session) {
    if (!session || !session.createdAt) return false;
    
    const maxAge = process.env.SESSION_TIMEOUT || 24 * 60 * 60 * 1000; // 24 hours
    const sessionAge = Date.now() - new Date(session.createdAt).getTime();
    
    return sessionAge < maxAge;
  },
  
  // Generate session ID
  generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
  }
};

// IP blocking middleware
const ipBlocking = {
  blockedIPs: new Set(),
  suspiciousActivity: new Map(),
  
  blockIP(ip, duration = 24 * 60 * 60 * 1000) { // 24 hours default
    this.blockedIPs.add(ip);
    setTimeout(() => {
      this.blockedIPs.delete(ip);
    }, duration);
  },
  
  trackSuspiciousActivity(ip) {
    const current = this.suspiciousActivity.get(ip) || 0;
    this.suspiciousActivity.set(ip, current + 1);
    
    // Block IP after 10 suspicious activities
    if (current >= 10) {
      this.blockIP(ip);
      this.suspiciousActivity.delete(ip);
    }
  },
  
  middleware: (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (ipBlocking.blockedIPs.has(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. IP address is blocked.'
      });
    }
    
    next();
  }
};

// Content validation
const validateContent = {
  // Check for malicious content
  containsMaliciousContent(content) {
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /eval\(/i,
      /expression\(/i
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(content));
  }
};

module.exports = {
  rateLimits,
  securityHeaders,
  speedLimiter,
  enforceHTTPS,
  securityMonitoring,
  passwordSecurity,
  jwtSecurity,
  sanitizeInput,
  corsOptions,
  sessionSecurity,
  ipBlocking,
  validateContent,
  
  // Convenience method to apply all security middleware
  applySecurityMiddleware: (app) => {
    // HTTPS enforcement (must be first)
    app.use(enforceHTTPS);
    
    // Security headers
    app.use(securityHeaders);
    
    // Request sanitization
    app.use(sanitizeInput);
    
    // Security monitoring
    app.use(securityMonitoring);
    
    // Speed limiting
    app.use(speedLimiter);
    
    // General rate limiting
    app.use(rateLimits.general);
    
    logger.info('🔒 Security middleware applied');
  }
};