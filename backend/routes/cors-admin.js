const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { getCORSConfig, validateCORSConfig } = require('../middleware/secure-cors');
const { errorHandler } = require('../utils/standard-error-handler');
const { logger } = require('../utils/logger');
const router = express.Router();

/**
 * CORS Administration API
 * Provides endpoints for monitoring and managing CORS configuration
 */

// GET /api/admin/cors/config - Get current CORS configuration
router.get('/config',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const config = getCORSConfig();
    
    res.json({
      success: true,
      data: {
        configuration: config,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// GET /api/admin/cors/validate - Validate CORS configuration
router.get('/validate',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const validation = validateCORSConfig();
    
    res.json({
      success: true,
      data: {
        validation,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// GET /api/admin/cors/test - Test CORS configuration
router.get('/test',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { testOrigin } = req.query;
    
    if (!testOrigin) {
      return res.status(400).json({
        success: false,
        error: 'testOrigin parameter is required'
      });
    }
    
    const config = getCORSConfig();
    const isAllowed = config.allowedOrigins.includes(testOrigin);
    
    // Test if origin would be allowed
    const testResult = {
      origin: testOrigin,
      allowed: isAllowed,
      reason: isAllowed ? 'origin_in_allowed_list' : 'origin_not_in_allowed_list',
      environment: config.environment,
      corsPolicy: 'secure'
    };
    
    // Additional checks
    try {
      const url = new URL(testOrigin);
      testResult.protocol = url.protocol;
      testResult.hostname = url.hostname;
      testResult.port = url.port || (url.protocol === 'https:' ? '443' : '80');
      
      // Check if it's a trusted domain
      const trustedDomains = config.trustedDomains || [];
      const isTrustedDomain = trustedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
      testResult.trustedDomain = isTrustedDomain;
      
    } catch (error) {
      testResult.error = 'Invalid URL format';
      testResult.allowed = false;
      testResult.reason = 'invalid_url';
    }
    
    res.json({
      success: true,
      data: {
        test: testResult,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// POST /api/admin/cors/test-request - Simulate CORS request
router.post('/test-request',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { origin, method = 'GET', headers = {} } = req.body;
    
    if (!origin) {
      return res.status(400).json({
        success: false,
        error: 'origin is required'
      });
    }
    
    const config = getCORSConfig();
    
    // Simulate CORS validation
    const simulation = {
      request: {
        origin,
        method,
        headers
      },
      response: {
        allowed: false,
        corsHeaders: {},
        reason: ''
      }
    };
    
    try {
      // Check if origin is allowed
      const isAllowed = config.allowedOrigins.includes(origin);
      
      if (isAllowed) {
        simulation.response.allowed = true;
        simulation.response.reason = 'origin_allowed';
        simulation.response.corsHeaders = {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': config.corsSettings.methods.join(', '),
          'Access-Control-Max-Age': config.corsSettings.maxAge.toString()
        };
        
        // Check if it's a preflight request
        if (method === 'OPTIONS') {
          simulation.response.corsHeaders['Access-Control-Allow-Headers'] = 
            'Origin, X-Requested-With, Content-Type, Accept, Authorization';
        }
      } else {
        simulation.response.reason = 'origin_not_allowed';
        simulation.response.error = `CORS: Origin ${origin} not allowed`;
      }
      
    } catch (error) {
      simulation.response.reason = 'validation_error';
      simulation.response.error = error.message;
    }
    
    res.json({
      success: true,
      data: {
        simulation,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// GET /api/admin/cors/security-report - Get CORS security report
router.get('/security-report',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const config = getCORSConfig();
    const validation = validateCORSConfig();
    
    // Generate security assessment
    const securityReport = {
      overall_security_score: 0,
      security_issues: [],
      recommendations: [],
      configuration_analysis: {}
    };
    
    let securityScore = 100;
    
    // Analyze origins
    const httpOrigins = config.allowedOrigins.filter(origin => origin.startsWith('http://'));
    if (httpOrigins.length > 0 && config.environment === 'production') {
      securityReport.security_issues.push({
        severity: 'high',
        issue: 'HTTP origins in production',
        description: 'HTTP origins are not secure in production environment',
        affected_origins: httpOrigins
      });
      securityScore -= 20;
    }
    
    const localhostOrigins = config.allowedOrigins.filter(origin => 
      origin.includes('localhost') || origin.includes('127.0.0.1')
    );
    if (localhostOrigins.length > 0 && config.environment === 'production') {
      securityReport.security_issues.push({
        severity: 'medium',
        issue: 'Localhost origins in production',
        description: 'Localhost origins should not be allowed in production',
        affected_origins: localhostOrigins
      });
      securityScore -= 10;
    }
    
    // Check credentials setting
    if (config.corsSettings.credentials) {
      securityReport.configuration_analysis.credentials_enabled = {
        status: 'enabled',
        security_impact: 'medium',
        description: 'Credentials are enabled, ensure origins are strictly controlled'
      };
    }
    
    // Check max age
    if (config.corsSettings.maxAge > 86400) { // > 24 hours
      securityReport.security_issues.push({
        severity: 'low',
        issue: 'Long preflight cache time',
        description: 'MaxAge is set to more than 24 hours, consider reducing for better security',
        current_value: config.corsSettings.maxAge
      });
      securityScore -= 5;
    }
    
    // Generate recommendations
    if (config.environment === 'production') {
      securityReport.recommendations.push({
        priority: 'high',
        recommendation: 'Ensure all production origins use HTTPS',
        current_status: httpOrigins.length === 0 ? 'compliant' : 'non_compliant'
      });
      
      securityReport.recommendations.push({
        priority: 'medium',
        recommendation: 'Remove development origins from production',
        current_status: localhostOrigins.length === 0 ? 'compliant' : 'non_compliant'
      });
    }
    
    securityReport.recommendations.push({
      priority: 'medium',
      recommendation: 'Regularly review and audit allowed origins',
      current_status: 'manual_review_required'
    });
    
    securityReport.overall_security_score = Math.max(0, securityScore);
    
    res.json({
      success: true,
      data: {
        security_report: securityReport,
        configuration: config,
        validation: validation,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// GET /api/admin/cors/logs - Get CORS-related logs (if available)
router.get('/logs',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { limit = 100, level = 'all' } = req.query;
    
    // This would integrate with your logging system
    // For now, return a placeholder response
    const corsLogs = {
      message: 'CORS logs integration not implemented',
      note: 'Would show recent CORS-related security events, blocked origins, etc.',
      placeholder_data: [
        {
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'CORS origin blocked',
          origin: 'https://malicious-site.com',
          reason: 'not_in_allowed_list'
        }
      ]
    };
    
    res.json({
      success: true,
      data: {
        logs: corsLogs,
        limit: parseInt(limit),
        level,
        timestamp: new Date().toISOString()
      }
    });
  })
);

module.exports = router;