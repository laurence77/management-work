const helmet = require('helmet');

/**
 * Enhanced Security Headers Middleware
 * Implements comprehensive security headers for production and development
 */

const securityHeaders = (app) => {
  // Base helmet configuration
  app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", // Needed for styled-components
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        scriptSrc: [
          "'self'",
          process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : null, // Allow eval in development for hot reload
          "https://cdn.jsdelivr.net",
          "https://js.stripe.com"
        ].filter(Boolean),
        imgSrc: [
          "'self'", 
          "data:", 
          "https:",
          "https://images.unsplash.com",
          "https://cdn.jsdelivr.net"
        ],
        fontSrc: [
          "'self'", 
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net"
        ],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          process.env.SUPABASE_URL,
          process.env.NODE_ENV === 'development' ? "ws://localhost:*" : null, // WebSocket for dev
          process.env.NODE_ENV === 'development' ? "http://localhost:*" : null // Local APIs in dev
        ].filter(Boolean),
        frameSrc: [
          "'self'",
          "https://js.stripe.com"
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disable for compatibility

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: "same-origin"
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: "cross-origin" // Allow cross-origin requests for API
    },

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },

    // Frameguard (X-Frame-Options)
    frameguard: {
      action: 'deny'
    },

    // Hide Powered-By
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // IE No Open
    ieNoOpen: true,

    // No Sniff
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: false,

    // Referrer Policy
    referrerPolicy: {
      policy: "no-referrer-when-downgrade"
    },

    // X-XSS-Protection
    xssFilter: true
  }));

  // Additional custom security headers
  app.use((req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Feature Policy / Permissions Policy
    res.setHeader('Permissions-Policy', [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ].join(', '));
    
    // Cross-Origin Resource Sharing
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://bookmyreservation.org');
    }
    
    // Prevent caching of sensitive endpoints
    if (req.path.includes('/api/auth/') || 
        req.path.includes('/api/admin/') || 
        req.path.includes('/api/payments/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    
    // Security headers for API responses
    if (req.path.startsWith('/api/')) {
      res.setHeader('X-API-Version', '1.0');
      res.setHeader('X-Rate-Limited', 'true');
    }
    
    next();
  });

  // CORS configuration for production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.ADMIN_URL,
        'https://bookmyreservation.org',
        'https://admin.bookmyreservation.org'
      ].filter(Boolean);

      const origin = req.headers.origin;
      
      if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      
      next();
    });
  }
};

module.exports = securityHeaders;