const { EnvValidator } = require('../utils/env-validator');
const { logger } = require('../utils/logger');

/**
 * Environment Validation Middleware
 * Provides runtime environment validation capabilities
 */

class EnvMiddleware {
  constructor() {
    this.validator = new EnvValidator();
    this.lastValidation = null;
    this.validationInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Middleware to validate environment on critical endpoints
   */
  validateOnCriticalEndpoints() {
    return (req, res, next) => {
      // Only validate on sensitive endpoints
      const criticalPaths = [
        '/api/auth/',
        '/api/admin/',
        '/api/payments/',
        '/api/users/admin'
      ];

      const isCritical = criticalPaths.some(path => req.path.startsWith(path));
      
      if (isCritical) {
        // Check if we need to revalidate (every 5 minutes for critical paths)
        const now = Date.now();
        if (!this.lastValidation || (now - this.lastValidation) > this.validationInterval) {
          const result = this.validator.validate();
          
          if (!result.isValid) {
            logger.error('Environment validation failed on critical endpoint', {
              path: req.path,
              errors: result.errors,
              ip: req.ip
            });
            
            return res.status(503).json({
              success: false,
              error: 'Service temporarily unavailable due to configuration issues',
              code: 'ENV_VALIDATION_FAILED'
            });
          }
          
          this.lastValidation = now;
        }
      }
      
      next();
    };
  }

  /**
   * Health check endpoint for environment validation
   */
  healthCheck() {
    return (req, res) => {
      const result = this.validator.validate();
      const summary = this.validator.getValidationSummary();
      
      const healthStatus = {
        status: result.isValid ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        validation: {
          isValid: result.isValid,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
          summary: {
            totalVariables: summary.total,
            setVariables: summary.set,
            requiredVariables: summary.required
          }
        }
      };

      // Include errors and warnings only for admin users or development
      if (req.user?.role === 'admin' || process.env.NODE_ENV === 'development') {
        healthStatus.validation.errors = result.errors;
        healthStatus.validation.warnings = result.warnings;
      }

      const statusCode = result.isValid ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    };
  }

  /**
   * Admin endpoint to force environment validation
   */
  adminValidate() {
    return (req, res) => {
      // Require admin privileges
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required'
        });
      }

      const result = this.validator.validate();
      const summary = this.validator.getValidationSummary();

      logger.info('Admin-triggered environment validation', {
        adminUser: req.user.email,
        result: result.isValid ? 'valid' : 'invalid',
        errorCount: result.errors.length
      });

      res.json({
        success: true,
        validation: {
          isValid: result.isValid,
          errors: result.errors,
          warnings: result.warnings,
          summary,
          timestamp: new Date().toISOString(),
          validatedBy: req.user.email
        }
      });
    };
  }

  /**
   * Middleware to validate specific environment variables for an endpoint
   */
  requireEnvVars(requiredVars) {
    return (req, res, next) => {
      const missing = [];
      const invalid = [];

      for (const varName of requiredVars) {
        const value = process.env[varName];
        
        if (!value || value.trim() === '') {
          missing.push(varName);
        } else {
          // Validate against defined rules if available
          const rules = this.validator.validationRules[varName];
          if (rules) {
            const errors = this.validator.validateVariable(varName, rules);
            if (errors.length > 0) {
              invalid.push({ variable: varName, errors });
            }
          }
        }
      }

      if (missing.length > 0 || invalid.length > 0) {
        logger.error('Required environment variables validation failed', {
          endpoint: req.path,
          missing,
          invalid: invalid.map(i => ({ variable: i.variable, errorCount: i.errors.length })),
          ip: req.ip
        });

        return res.status(503).json({
          success: false,
          error: 'Service configuration error',
          code: 'REQUIRED_ENV_VARS_MISSING'
        });
      }

      next();
    };
  }

  /**
   * Periodic validation for background monitoring
   */
  startPeriodicValidation(intervalMs = 60000) { // Default: 1 minute
    setInterval(() => {
      const result = this.validator.validate();
      
      if (!result.isValid) {
        logger.error('Periodic environment validation failed', {
          errors: result.errors,
          timestamp: new Date().toISOString()
        });
      } else if (result.warnings.length > 0) {
        logger.warn('Periodic environment validation warnings', {
          warnings: result.warnings,
          timestamp: new Date().toISOString()
        });
      }
    }, intervalMs);
  }
}

// Export singleton instance
module.exports = new EnvMiddleware();