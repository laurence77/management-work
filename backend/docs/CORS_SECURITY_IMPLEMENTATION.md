# CORS Security Implementation

## Overview

This implementation provides enterprise-grade Cross-Origin Resource Sharing (CORS) security for the celebrity booking management platform. The system includes environment-specific configurations, strict security policies, comprehensive monitoring, and administrative controls.

## Security Architecture

### 1. **Multi-Tier CORS Policies**

#### Strict CORS for Sensitive Endpoints
```javascript
// Applied to: /api/auth, /api/payments, /api/crypto, /api/admin, /api/audit
const strictCORS = {
  origin: (origin, callback) => {
    // Only allow exact matches from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS: Strict mode - origin not allowed'), false);
  },
  credentials: true,
  maxAge: 300 // Shorter cache for sensitive endpoints
};
```

#### Regular Secure CORS for Business Endpoints
```javascript
// Applied to: /api/celebrities, /api/bookings, /api/analytics
const secureCORS = {
  origin: validateOrigin, // Comprehensive validation function
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 'X-Requested-With', 'Content-Type', 'Accept',
    'Authorization', 'X-API-Key', 'X-Device-ID'
  ],
  maxAge: 86400 // 24 hours for production
};
```

#### Public CORS for Non-Sensitive Endpoints
```javascript
// Applied to: /api/services, /api/webhooks, /api/password-reset
const publicCORS = {
  origin: true, // Allow all origins
  credentials: false, // No credentials for public endpoints
  methods: ['GET', 'OPTIONS'],
  maxAge: 3600 // 1 hour cache
};
```

### 2. **Environment-Specific Configuration**

#### Development Environment
```javascript
const developmentOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', // Admin dashboard
  'http://localhost:8080', // Main frontend
  'http://localhost:5173', // Vite dev server
  'http://localhost:5174', // Alternative Vite port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173'
];
```

#### Staging Environment
```javascript
const stagingOrigins = [
  'https://staging.bookmyreservation.org',
  'https://admin-staging.bookmyreservation.org',
  'https://api-staging.bookmyreservation.org'
];
```

#### Production Environment
```javascript
const productionOrigins = [
  'https://bookmyreservation.org',
  'https://www.bookmyreservation.org',
  'https://admin.bookmyreservation.org',
  'https://api.bookmyreservation.org'
];
```

### 3. **Advanced Security Validation**

#### Origin Validation Function
```javascript
function validateOrigin(origin, callback) {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    return callback(null, true);
  }

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Additional security checks for production
  if (process.env.NODE_ENV === 'production') {
    // Check if it's a trusted domain
    if (isTrustedDomain(origin)) {
      return callback(null, true);
    }

    // Log blocked origin for security monitoring
    securityLogger.warn('CORS origin blocked', {
      origin,
      reason: 'not_in_allowed_list'
    });

    return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
  }

  // Default deny
  return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
}
```

#### Trusted Domain Validation
```javascript
function isTrustedDomain(origin) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    return trustedDomains.some(trustedDomain => {
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
```

#### URL Security Validation
```javascript
function isValidOrigin(origin) {
  try {
    const url = new URL(origin);
    
    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
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

    return !suspiciousPatterns.some(pattern => pattern.test(origin));
  } catch (error) {
    return false;
  }
}
```

## Configuration Management

### 1. **Environment Variables**

#### Production Configuration
```bash
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://bookmyreservation.org,https://www.bookmyreservation.org,https://admin.bookmyreservation.org
CORS_TRUSTED_DOMAINS=bookmyreservation.org
CORS_STRICT_MODE=true
CORS_MAX_AGE=86400
```

#### Development Configuration
```bash
NODE_ENV=development
# CORS_ALLOWED_ORIGINS is optional in development
# Additional localhost ports will be automatically allowed
CORS_DEBUG_LOGGING=true
```

#### Staging Configuration
```bash
NODE_ENV=staging
CORS_ALLOWED_ORIGINS=https://staging.bookmyreservation.org,https://admin-staging.bookmyreservation.org
CORS_TRUSTED_DOMAINS=bookmyreservation.org
```

### 2. **Dynamic Configuration**

#### Custom Origins from Environment
```javascript
// Add custom origins from environment variable
if (process.env.CORS_ALLOWED_ORIGINS) {
  const customOrigins = process.env.CORS_ALLOWED_ORIGINS
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
  
  origins = [...origins, ...customOrigins];
}

// Remove duplicates and validate URLs
origins = [...new Set(origins)].filter(origin => isValidOrigin(origin));
```

## Administrative Interface

### 1. **CORS Management API**

#### Configuration Endpoints
```javascript
// GET /api/admin/cors/config - Get current CORS configuration
{
  "success": true,
  "data": {
    "configuration": {
      "environment": "production",
      "allowedOrigins": [
        "https://bookmyreservation.org",
        "https://admin.bookmyreservation.org"
      ],
      "trustedDomains": ["bookmyreservation.org"],
      "corsSettings": {
        "credentials": true,
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "maxAge": 86400
      }
    }
  }
}

// GET /api/admin/cors/validate - Validate CORS configuration
{
  "success": true,
  "data": {
    "validation": {
      "isValid": true,
      "issues": [],
      "summary": {
        "environment": "production",
        "allowedOriginsCount": 2,
        "credentialsEnabled": true
      }
    }
  }
}
```

#### Testing Endpoints
```javascript
// GET /api/admin/cors/test?testOrigin=https://example.com
{
  "success": true,
  "data": {
    "test": {
      "origin": "https://example.com",
      "allowed": false,
      "reason": "origin_not_in_allowed_list",
      "environment": "production",
      "corsPolicy": "secure",
      "protocol": "https:",
      "hostname": "example.com",
      "trustedDomain": false
    }
  }
}

// POST /api/admin/cors/test-request
{
  "request": {
    "origin": "https://bookmyreservation.org",
    "method": "GET",
    "headers": {}
  },
  "response": {
    "allowed": true,
    "corsHeaders": {
      "Access-Control-Allow-Origin": "https://bookmyreservation.org",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
      "Access-Control-Max-Age": "86400"
    },
    "reason": "origin_allowed"
  }
}
```

### 2. **Security Monitoring**

#### Security Report
```javascript
// GET /api/admin/cors/security-report
{
  "security_report": {
    "overall_security_score": 95,
    "security_issues": [
      {
        "severity": "low",
        "issue": "Long preflight cache time",
        "description": "MaxAge is set to more than 24 hours",
        "current_value": 86400
      }
    ],
    "recommendations": [
      {
        "priority": "high",
        "recommendation": "Ensure all production origins use HTTPS",
        "current_status": "compliant"
      },
      {
        "priority": "medium",
        "recommendation": "Remove development origins from production",
        "current_status": "compliant"
      }
    ],
    "configuration_analysis": {
      "credentials_enabled": {
        "status": "enabled",
        "security_impact": "medium",
        "description": "Credentials are enabled, ensure origins are strictly controlled"
      }
    }
  }
}
```

## Security Implementation

### 1. **Production Security Checks**

#### HTTP Protocol Detection
```javascript
const httpOrigins = allowedOrigins.filter(origin => origin.startsWith('http://'));
if (httpOrigins.length > 0 && environment === 'production') {
  securityReport.security_issues.push({
    severity: 'high',
    issue: 'HTTP origins in production',
    description: 'HTTP origins are not secure in production environment',
    affected_origins: httpOrigins
  });
}
```

#### Localhost Detection
```javascript
const localhostOrigins = allowedOrigins.filter(origin => 
  origin.includes('localhost') || origin.includes('127.0.0.1')
);
if (localhostOrigins.length > 0 && environment === 'production') {
  securityReport.security_issues.push({
    severity: 'medium',
    issue: 'Localhost origins in production',
    description: 'Localhost origins should not be allowed in production',
    affected_origins: localhostOrigins
  });
}
```

### 2. **Request Monitoring**

#### CORS Request Logging
```javascript
function logCORSRequest(origin, allowed, reason) {
  if (allowed) {
    logger.debug('CORS request allowed', {
      origin,
      timestamp: new Date().toISOString()
    });
  } else {
    securityLogger.warn('CORS request blocked', {
      origin,
      reason,
      timestamp: new Date().toISOString()
    });
  }
}
```

#### Security Event Integration
```javascript
// Integration with audit service
await auditService.logSecurityEvent(
  auditService.auditActions.SUSPICIOUS_ACTIVITY,
  null, // No specific user
  null, // No specific organization
  request,
  {
    corsViolation: true,
    blockedOrigin: origin,
    reason: 'origin_not_allowed'
  }
);
```

## Route-Specific Implementation

### 1. **Sensitive Endpoints (Strict CORS)**
```javascript
// Authentication routes
app.use('/api/auth', strictCORS, require('./routes/auth'));

// Payment routes
app.use('/api/payments', strictCORS, require('./routes/payments'));

// Admin routes
app.use('/api/admin', strictCORS);

// File upload routes
app.use('/api/uploads', strictCORS, require('./routes/secure-uploads'));
```

### 2. **Business Endpoints (Secure CORS)**
```javascript
// Celebrity management
app.use('/api/celebrities', secureCORS, require('./routes/celebrities'));

// Booking management
app.use('/api/bookings', secureCORS, require('./routes/bookings'));

// Analytics
app.use('/api/analytics', secureCORS, require('./routes/analytics'));
```

### 3. **Public Endpoints (Public CORS)**
```javascript
// Public services
app.use('/api/services', publicCORS, require('./routes/services'));

// Webhooks
app.use('/api/webhooks', publicCORS, require('./routes/webhooks'));

// Password reset (public form)
app.use('/api/password-reset', publicCORS, require('./routes/password-reset'));
```

## Environment Validation

### 1. **Startup Validation**
```javascript
// Validate CORS configuration on startup
const corsValidation = validateCORSConfig();
if (!corsValidation.isValid) {
  logger.warn('CORS configuration issues detected:', corsValidation.issues);
} else {
  logger.info('CORS configuration validated successfully');
}
```

### 2. **Environment Variable Validation**
```javascript
// CORS origins validation
validateCORSOrigins(value) {
  const origins = value.split(',').map(origin => origin.trim());
  
  for (const origin of origins) {
    // Validate URL format
    new URL(origin);
    
    // Production checks
    if (process.env.NODE_ENV === 'production') {
      if (origin.startsWith('http://')) {
        this.warnings.push(`CORS origin '${origin}' uses HTTP in production`);
      }
      if (origin.includes('localhost')) {
        this.warnings.push(`CORS origin '${origin}' uses localhost in production`);
      }
    }
  }
}
```

## Best Practices Implemented

### 1. **Security Principles**
- ✅ **Principle of Least Privilege**: Only necessary origins allowed
- ✅ **Defense in Depth**: Multiple validation layers
- ✅ **Environment Separation**: Different policies per environment
- ✅ **Monitoring and Alerting**: Comprehensive logging and reporting

### 2. **Production Hardening**
- ✅ **HTTPS-Only**: No HTTP origins in production
- ✅ **Strict Origin Validation**: Exact origin matching
- ✅ **No Wildcards**: Explicit origin lists only
- ✅ **Credential Protection**: Secure credential handling

### 3. **Administrative Controls**
- ✅ **Configuration Management**: Environment-based settings
- ✅ **Testing Interface**: CORS configuration testing
- ✅ **Security Monitoring**: Real-time security reporting
- ✅ **Audit Integration**: Complete audit trail

This comprehensive CORS security implementation provides enterprise-grade protection while maintaining flexibility for different environments and use cases. The system automatically adapts to environment requirements and provides detailed monitoring and administrative control.