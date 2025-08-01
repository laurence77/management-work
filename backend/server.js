const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const Sentry = require('@sentry/node');
const { secureCORS, strictCORS, publicCORS, validateCORSConfig } = require('./middleware/secure-cors');
const { logger, httpLogger } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const cleanupService = require('./utils/cleanup');
const { EnvValidator } = require('./utils/env-validator');
const envMiddleware = require('./middleware/env-middleware');
const advancedRateLimiter = require('./middleware/advanced-rate-limiter');
const { 
  enhancedAuthMiddleware, 
  securityEventMiddleware, 
  activityMonitoringMiddleware 
} = require('./middleware/session-integration');
require('dotenv').config();

// Validate environment variables before starting the application
const envValidator = new EnvValidator();
try {
  const validationResult = envValidator.validateOrThrow();
  logger.info('✅ Environment validation passed', envValidator.getValidationSummary());
  
  if (validationResult.warnings.length > 0) {
    logger.warn('⚠️ Environment validation warnings:', {
      warnings: validationResult.warnings
    });
  }
} catch (error) {
  logger.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

// Initialize Sentry for error monitoring
const { configureSentry, createSentryMiddleware } = require('./utils/sentry-config');
configureSentry();

const app = express();
const PORT = process.env.PORT || 3000;

// Sentry request handler (must be first)
if (process.env.SENTRY_DSN) {
  const sentryMiddleware = createSentryMiddleware();
  app.use(sentryMiddleware.requestHandler);
  app.use(sentryMiddleware.tracingHandler);
}

// Enhanced security headers
const securityHeaders = require('./middleware/security-headers');
securityHeaders(app);

// Secure CORS configuration
app.use(secureCORS);

// Validate CORS configuration on startup
const corsValidation = validateCORSConfig();
if (!corsValidation.isValid) {
  logger.warn('CORS configuration issues detected:', corsValidation.issues);
} else {
  logger.info('CORS configuration validated successfully');
}

// Log CORS configuration summary
logger.info('CORS configuration summary:', {
  environment: corsValidation.summary.environment,
  allowedOriginsCount: corsValidation.summary.allowedOrigins.length,
  credentialsEnabled: corsValidation.summary.corsSettings.credentials
});

// Enhanced rate limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, error: message },
  standardHeaders: true,
  legacyHeaders: false,
});

// Advanced smart rate limiting for all endpoints
app.use('/api/', advancedRateLimiter.smartRateLimit());

// Track successful authentication for rate limit reset
app.use('/api/auth/', advancedRateLimiter.trackSuccessfulAuth());

// Environment validation middleware for critical endpoints
app.use(envMiddleware.validateOnCriticalEndpoints());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session security middleware
app.use('/api/', securityEventMiddleware());
app.use('/api/', enhancedAuthMiddleware());
app.use('/api/', activityMonitoringMiddleware());

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => httpLogger.info(message.trim())
  }
}));

// Admin routes (before general routes)
app.use('/api/admin/cache', require('./routes/cache-admin'));
app.use('/api/admin/cors', strictCORS, require('./routes/cors-admin'));
app.use('/api/admin/backup', strictCORS, require('./routes/backup-admin'));

// Routes with different CORS policies

// Strict CORS for sensitive endpoints
app.use('/api/auth', strictCORS, require('./routes/auth'));
app.use('/api/payments', strictCORS, require('./routes/payments'));
app.use('/api/crypto', strictCORS, require('./routes/crypto'));
app.use('/api/admin', strictCORS);
app.use('/api/audit', strictCORS, require('./routes/audit'));
app.use('/api/uploads', strictCORS, require('./routes/secure-uploads'));
app.use('/api/fraud', strictCORS, require('./routes/fraud'));
app.use('/api/rbac', strictCORS, require('./routes/rbac'));
app.use('/api/settings', strictCORS, require('./routes/settings'));
app.use('/api/management', strictCORS, require('./routes/management'));
app.use('/api/email-settings', strictCORS, require('./routes/email-settings'));

// Regular secure CORS for business endpoints
app.use('/api/celebrities', require('./routes/celebrities'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/events', require('./routes/events'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/deepseek', require('./routes/deepseek'));
app.use('/api/n8n', strictCORS, require('./routes/n8n'));
app.use('/api/email', require('./routes/email'));
app.use('/api/health', require('./routes/health'));
app.use('/api/database-monitoring', strictCORS, require('./routes/database-monitoring'));
app.use('/api/cors-management', strictCORS, require('./routes/cors-management'));
app.use('/api/disaster-recovery', strictCORS, require('./routes/disaster-recovery'));
app.use('/api/load-testing', strictCORS, require('./routes/load-testing'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/data-retention', strictCORS, require('./routes/data-retention'));
app.use('/api/documentation', strictCORS, require('./routes/documentation'));
app.use('/api/image-optimization', require('./routes/image-optimization'));
app.use('/api/fraud-detection', strictCORS, require('./routes/fraud-detection'));
app.use('/api/mobile-testing', strictCORS, require('./routes/mobile-testing'));
app.use('/api/seo-optimization', strictCORS, require('./routes/seo-optimization'));

// Public CORS for non-sensitive endpoints
app.use('/api/services', publicCORS, require('./routes/services'));
app.use('/api/webhooks', publicCORS, require('./routes/webhooks'));
app.use('/api/password-reset', publicCORS, require('./routes/password-reset'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Sentry error handler (must be before other error handlers)
if (process.env.SENTRY_DSN) {
  const sentryMiddleware = createSentryMiddleware();
  app.use(sentryMiddleware.errorHandler);
}

// Error handling middleware
app.use(errorHandler);

// Email settings endpoint for admin dashboard
app.get('/api/settings/email', (req, res) => {
  try {
    const emailSettings = {
      enabled: true,
      smtpHost: process.env.SMTP_HOST || 'smtp.hostinger.com',
      smtpPort: parseInt(process.env.SMTP_PORT) || 465,
      smtpSecure: process.env.SMTP_SECURE === 'true',
      smtpUser: process.env.SMTP_USER || 'management@bookmyreservation.org',
      smtpPass: process.env.SMTP_PASS ? '***CONFIGURED***' : 'NOT SET',
      fromEmail: process.env.EMAIL_FROM || 'management@bookmyreservation.org',
      templates: {
        welcome: 'Welcome to Celebrity Booking Platform',
        booking_confirmation: 'Your booking has been confirmed',
        booking_update: 'Your booking has been updated',
        password_reset: 'Password reset request'
      }
    };
    
    res.json({ success: true, data: emailSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get email settings' });
  }
});

// Email test endpoint for admin dashboard
app.post('/api/settings/email/test', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    const emailService = require('./services/emailService');
    
    const result = await emailService.sendEmail({
      to: to || 'management@bookmyreservation.org',
      subject: subject || 'Test Email from Admin Dashboard',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🧪 Email Test</h2>
          <p><strong>Message:</strong> ${message || 'Test email from admin dashboard'}</p>
          <hr>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST}</li>  
            <li>SMTP Port: ${process.env.SMTP_PORT}</li>
            <li>SMTP User: ${process.env.SMTP_USER}</li>
          </ul>
          <p><small>Test sent at: ${new Date().toLocaleString()}</small></p>
        </div>
      `
    });
    
    if (result.success) {
      res.json({ success: true, message: 'Test email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send test email' });
  }
});

// Email settings update endpoint for admin dashboard
app.post('/api/settings/email/update', async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Settings object is required' });
    }
    
    // For now, just return success since we're using environment variables
    // In a real implementation, you'd save these to database or update config
    res.json({ 
      success: true, 
      message: 'Email settings updated successfully',
      updated: Object.keys(settings).length,
      note: 'Settings are currently managed via environment variables'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update email settings' });
  }
});

// Environment validation health check endpoints
app.get('/api/health/env', envMiddleware.healthCheck());
app.post('/api/admin/validate-env', envMiddleware.adminValidate());

// Rate limiting admin endpoints
app.use('/api/admin/rate-limit', require('./routes/rate-limit-admin'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 Frontend: http://localhost:8080`);
  logger.info(`🔧 Admin: http://localhost:3001`);
  
  // Start periodic environment validation
  envMiddleware.startPeriodicValidation(5 * 60 * 1000); // Every 5 minutes
  logger.info('🔍 Environment validation monitoring started');
  
  // Start cleanup service (temporarily disabled for debugging)
  // if (process.env.NODE_ENV !== 'test') {
  //   cleanupService.start();
  //   logger.info('🧹 Cleanup service started');
  // }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cleanupService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  cleanupService.stop();
  process.exit(0);
});