const { auditService } = require('../services/audit-service');
const { logger } = require('../utils/logger');

/**
 * Audit Logging Middleware
 * Automatically captures and logs sensitive operations
 */

/**
 * General audit logging middleware
 */
function auditMiddleware(options = {}) {
  const {
    action,
    resourceType,
    extractResourceId = () => null,
    extractOldValues = () => null,
    extractNewValues = () => null,
    extractMetadata = () => ({}),
    riskLevel = 'low',
    skipCondition = () => false
  } = options;

  return async (req, res, next) => {
    // Skip if condition is met
    if (skipCondition(req)) {
      return next();
    }

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Flag to track if audit has been logged
    let auditLogged = false;

    // Function to log audit event
    const logAuditEvent = async (responseData = null) => {
      if (auditLogged) return;
      auditLogged = true;

      try {
        const resourceId = extractResourceId(req, responseData);
        const oldValues = extractOldValues(req, responseData);
        const newValues = extractNewValues(req, responseData);
        const metadata = extractMetadata(req, responseData);

        await auditService.logEvent({
          action: typeof action === 'function' ? action(req) : action,
          resourceType: typeof resourceType === 'function' ? resourceType(req) : resourceType,
          resourceId,
          userId: req.user?.id,
          organizationId: req.user?.organization_id,
          oldValues,
          newValues,
          request: req,
          metadata,
          riskLevel
        });
      } catch (error) {
        logger.error('Audit middleware error:', error);
      }
    };

    // Override response methods to capture successful operations
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAuditEvent(data).catch(error => {
          logger.error('Audit logging failed in send:', error);
        });
      }
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && data?.success !== false) {
        logAuditEvent(data).catch(error => {
          logger.error('Audit logging failed in json:', error);
        });
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Authentication audit middleware
 */
function authAuditMiddleware() {
  return auditMiddleware({
    action: (req) => {
      const path = req.path.toLowerCase();
      if (path.includes('login')) return auditService.auditActions.USER_LOGIN;
      if (path.includes('logout')) return auditService.auditActions.USER_LOGOUT;
      if (path.includes('register')) return auditService.auditActions.USER_REGISTER;
      if (path.includes('password')) return auditService.auditActions.PASSWORD_CHANGE;
      return 'auth_operation';
    },
    resourceType: auditService.resourceTypes.USER,
    extractResourceId: (req, responseData) => {
      return req.user?.id || responseData?.data?.user?.id || responseData?.user?.id;
    },
    extractNewValues: (req, responseData) => {
      if (req.path.includes('login')) {
        return { email: req.body.email, loginTime: new Date().toISOString() };
      }
      if (req.path.includes('register')) {
        return { 
          email: req.body.email, 
          role: req.body.role || 'customer',
          registrationTime: new Date().toISOString()
        };
      }
      return null;
    },
    extractMetadata: (req) => ({
      endpoint: req.path,
      method: req.method,
      loginAttempt: req.path.includes('login')
    }),
    riskLevel: 'medium'
  });
}

/**
 * Celebrity operations audit middleware
 */
function celebrityAuditMiddleware() {
  return auditMiddleware({
    action: (req) => {
      const method = req.method.toUpperCase();
      switch (method) {
        case 'POST': return auditService.auditActions.CELEBRITY_CREATE;
        case 'PUT':
        case 'PATCH': return auditService.auditActions.CELEBRITY_UPDATE;
        case 'DELETE': return auditService.auditActions.CELEBRITY_DELETE;
        case 'GET': return auditService.auditActions.CELEBRITY_VIEW;
        default: return 'celebrity_operation';
      }
    },
    resourceType: auditService.resourceTypes.CELEBRITY,
    extractResourceId: (req) => req.params.id,
    extractOldValues: (req) => req.celebrityOldValues || null,
    extractNewValues: (req, responseData) => {
      if (req.method === 'POST') {
        return responseData?.data || req.body;
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        return req.body;
      }
      return null;
    },
    extractMetadata: (req) => ({
      operation: req.method,
      endpoint: req.path
    }),
    riskLevel: 'low',
    skipCondition: (req) => req.method === 'GET' && !req.params.id // Skip list operations
  });
}

/**
 * Booking operations audit middleware
 */
function bookingAuditMiddleware() {
  return auditMiddleware({
    action: (req) => {
      const method = req.method.toUpperCase();
      const path = req.path.toLowerCase();
      
      if (method === 'POST') return auditService.auditActions.BOOKING_CREATE;
      if (method === 'PUT' || method === 'PATCH') {
        if (path.includes('approve')) return auditService.auditActions.BOOKING_APPROVE;
        if (path.includes('reject')) return auditService.auditActions.BOOKING_REJECT;
        if (path.includes('cancel')) return auditService.auditActions.BOOKING_CANCEL;
        return auditService.auditActions.BOOKING_UPDATE;
      }
      if (method === 'DELETE') return auditService.auditActions.BOOKING_CANCEL;
      
      return 'booking_operation';
    },
    resourceType: auditService.resourceTypes.BOOKING,
    extractResourceId: (req) => req.params.id || req.params.bookingId,
    extractOldValues: (req) => req.bookingOldValues || null,
    extractNewValues: (req, responseData) => {
      if (req.method === 'POST') {
        return responseData?.data || req.body;
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        return req.body;
      }
      return null;
    },
    extractMetadata: (req) => ({
      operation: req.method,
      endpoint: req.path,
      bookingStatus: req.body?.status
    }),
    riskLevel: 'medium'
  });
}

/**
 * Payment operations audit middleware
 */
function paymentAuditMiddleware() {
  return auditMiddleware({
    action: (req) => {
      const path = req.path.toLowerCase();
      if (path.includes('refund')) return auditService.auditActions.PAYMENT_REFUND;
      if (path.includes('crypto')) return auditService.auditActions.CRYPTO_PAYMENT;
      return auditService.auditActions.PAYMENT_PROCESS;
    },
    resourceType: auditService.resourceTypes.PAYMENT,
    extractResourceId: (req, responseData) => {
      return req.params.id || responseData?.data?.paymentId || responseData?.paymentId;
    },
    extractNewValues: (req, responseData) => ({
      amount: req.body.amount || responseData?.data?.amount,
      currency: req.body.currency || responseData?.data?.currency,
      paymentMethod: req.body.paymentMethod || req.body.method,
      status: responseData?.data?.status
    }),
    extractMetadata: (req, responseData) => ({
      operation: req.method,
      endpoint: req.path,
      paymentProvider: req.body.provider,
      transactionId: responseData?.data?.transactionId
    }),
    riskLevel: 'high'
  });
}

/**
 * Admin operations audit middleware
 */
function adminAuditMiddleware() {
  return auditMiddleware({
    action: (req) => {
      const path = req.path.toLowerCase();
      const method = req.method.toUpperCase();
      
      if (path.includes('user')) {
        if (method === 'POST') return auditService.auditActions.ADMIN_USER_CREATE;
        if (method === 'DELETE') return auditService.auditActions.ADMIN_USER_DELETE;
        return 'admin_user_operation';
      }
      
      if (path.includes('settings')) return auditService.auditActions.ADMIN_SETTINGS_CHANGE;
      if (path.includes('cache')) return auditService.auditActions.ADMIN_CACHE_CLEAR;
      if (path.includes('config')) return auditService.auditActions.ADMIN_SYSTEM_CONFIG;
      
      return 'admin_operation';
    },
    resourceType: (req) => {
      const path = req.path.toLowerCase();
      if (path.includes('user')) return auditService.resourceTypes.USER;
      if (path.includes('settings')) return auditService.resourceTypes.SETTING;
      return auditService.resourceTypes.SYSTEM;
    },
    extractResourceId: (req, responseData) => {
      return req.params.id || req.params.userId || responseData?.data?.id;
    },
    extractOldValues: (req) => req.adminOldValues || null,
    extractNewValues: (req, responseData) => {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        return req.body;
      }
      return responseData?.data || null;
    },
    extractMetadata: (req) => ({
      operation: req.method,
      endpoint: req.path,
      adminId: req.user?.id,
      adminRole: req.user?.role
    }),
    riskLevel: 'high'
  });
}

/**
 * File operations audit middleware
 */
function fileAuditMiddleware() {
  return auditMiddleware({
    action: (req) => {
      const method = req.method.toUpperCase();
      if (method === 'POST') return auditService.auditActions.FILE_UPLOAD;
      if (method === 'DELETE') return auditService.auditActions.FILE_DELETE;
      if (method === 'GET') return auditService.auditActions.FILE_ACCESS;
      return 'file_operation';
    },
    resourceType: auditService.resourceTypes.FILE,
    extractResourceId: (req, responseData) => {
      return req.params.fileId || responseData?.data?.fileId || responseData?.fileId;
    },
    extractNewValues: (req, responseData) => {
      if (req.file) {
        return {
          fileName: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        };
      }
      return null;
    },
    extractMetadata: (req) => ({
      operation: req.method,
      endpoint: req.path,
      fileType: req.file?.mimetype,
      uploadPath: req.file?.path
    }),
    riskLevel: 'low'
  });
}

/**
 * Data operations audit middleware
 */
function dataOperationAuditMiddleware() {
  return auditMiddleware({
    action: (req) => {
      const path = req.path.toLowerCase();
      if (path.includes('export')) return auditService.auditActions.DATA_EXPORT;
      if (path.includes('import')) return auditService.auditActions.DATA_IMPORT;
      if (path.includes('backup')) return auditService.auditActions.BACKUP_CREATE;
      return 'data_operation';
    },
    resourceType: auditService.resourceTypes.SYSTEM,
    extractNewValues: (req, responseData) => ({
      dataType: req.query.type || req.body.type,
      format: req.query.format || req.body.format,
      recordCount: responseData?.data?.recordCount
    }),
    extractMetadata: (req, responseData) => ({
      operation: req.method,
      endpoint: req.path,
      filters: req.query,
      exportSize: responseData?.data?.size
    }),
    riskLevel: 'high'
  });
}

/**
 * Security events audit middleware
 */
function securityAuditMiddleware() {
  return async (req, res, next) => {
    // Track security-related request patterns
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(data) {
      // Log failed authentication attempts
      if (res.statusCode === 401 || res.statusCode === 403) {
        auditService.logSecurityEvent(
          auditService.auditActions.FAILED_LOGIN,
          req.user?.id,
          req.user?.organization_id,
          req,
          {
            statusCode: res.statusCode,
            endpoint: req.path,
            attempt: req.body?.email || 'unknown'
          }
        ).catch(error => {
          logger.error('Security audit logging failed:', error);
        });
      }
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      // Log security events based on response content
      if (data && !data.success && data.error) {
        const errorType = data.error.toLowerCase();
        if (errorType.includes('unauthorized') || errorType.includes('forbidden')) {
          auditService.logSecurityEvent(
            auditService.auditActions.SUSPICIOUS_ACTIVITY,
            req.user?.id,
            req.user?.organization_id,
            req,
            {
              errorType: data.error,
              endpoint: req.path,
              statusCode: res.statusCode
            }
          ).catch(error => {
            logger.error('Security audit logging failed:', error);
          });
        }
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Middleware to store old values before update operations
 */
function storeOldValuesMiddleware(resourceType, idParam = 'id') {
  return async (req, res, next) => {
    if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      try {
        const resourceId = req.params[idParam];
        if (resourceId) {
          // This would need to be customized per resource type
          // For now, store in request for use by audit middleware
          req.oldValuesResourceId = resourceId;
        }
      } catch (error) {
        logger.error('Error storing old values:', error);
      }
    }
    next();
  };
}

module.exports = {
  auditMiddleware,
  authAuditMiddleware,
  celebrityAuditMiddleware,
  bookingAuditMiddleware,
  paymentAuditMiddleware,
  adminAuditMiddleware,
  fileAuditMiddleware,
  dataOperationAuditMiddleware,
  securityAuditMiddleware,
  storeOldValuesMiddleware
};