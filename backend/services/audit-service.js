const { supabaseAdmin } = require('../config/supabase');
const { logger, securityLogger } = require('../utils/logger');
const { cacheManager } = require('../middleware/cache-manager');

/**
 * Comprehensive Audit Logging Service
 * Tracks all sensitive operations with detailed context and metadata
 */

class AuditService {
  constructor() {
    this.auditActions = {
      // Authentication & Authorization
      USER_LOGIN: 'user_login',
      USER_LOGOUT: 'user_logout',
      USER_REGISTER: 'user_register',
      PASSWORD_CHANGE: 'password_change',
      PASSWORD_RESET: 'password_reset',
      ROLE_CHANGE: 'role_change',
      PERMISSION_CHANGE: 'permission_change',
      SESSION_INVALIDATION: 'session_invalidation',

      // Celebrity Management
      CELEBRITY_CREATE: 'celebrity_create',
      CELEBRITY_UPDATE: 'celebrity_update',
      CELEBRITY_DELETE: 'celebrity_delete',
      CELEBRITY_VIEW: 'celebrity_view',
      CELEBRITY_SEARCH: 'celebrity_search',

      // Booking Operations
      BOOKING_CREATE: 'booking_create',
      BOOKING_UPDATE: 'booking_update',
      BOOKING_CANCEL: 'booking_cancel',
      BOOKING_APPROVE: 'booking_approve',
      BOOKING_REJECT: 'booking_reject',
      BOOKING_PAYMENT: 'booking_payment',

      // Financial Operations
      PAYMENT_PROCESS: 'payment_process',
      PAYMENT_REFUND: 'payment_refund',
      INVOICE_GENERATE: 'invoice_generate',
      CRYPTO_PAYMENT: 'crypto_payment',

      // Admin Operations
      ADMIN_LOGIN: 'admin_login',
      ADMIN_USER_CREATE: 'admin_user_create',
      ADMIN_USER_DELETE: 'admin_user_delete',
      ADMIN_SETTINGS_CHANGE: 'admin_settings_change',
      ADMIN_CACHE_CLEAR: 'admin_cache_clear',
      ADMIN_SYSTEM_CONFIG: 'admin_system_config',

      // Security Events
      SECURITY_BREACH: 'security_breach',
      FRAUD_DETECTION: 'fraud_detection',
      SUSPICIOUS_ACTIVITY: 'suspicious_activity',
      ACCOUNT_LOCKOUT: 'account_lockout',
      FAILED_LOGIN: 'failed_login',

      // Data Operations
      DATA_EXPORT: 'data_export',
      DATA_IMPORT: 'data_import',
      DATA_DELETION: 'data_deletion',
      BACKUP_CREATE: 'backup_create',
      BACKUP_RESTORE: 'backup_restore',

      // Communication
      EMAIL_SEND: 'email_send',
      NOTIFICATION_SEND: 'notification_send',
      CHAT_MESSAGE: 'chat_message',

      // File Operations
      FILE_UPLOAD: 'file_upload',
      FILE_DELETE: 'file_delete',
      FILE_ACCESS: 'file_access'
    };

    this.resourceTypes = {
      USER: 'user',
      CELEBRITY: 'celebrity',
      BOOKING: 'booking',
      PAYMENT: 'payment',
      INVOICE: 'invoice',
      ORGANIZATION: 'organization',
      ROLE: 'role',
      PERMISSION: 'permission',
      SESSION: 'session',
      FILE: 'file',
      SETTING: 'setting',
      EMAIL: 'email',
      NOTIFICATION: 'notification',
      CHAT: 'chat',
      SYSTEM: 'system'
    };

    this.riskLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * Log an audit event
   */
  async logEvent(auditData) {
    try {
      const {
        action,
        resourceType,
        resourceId,
        userId,
        organizationId,
        oldValues = null,
        newValues = null,
        metadata = {},
        request = null,
        riskLevel = this.riskLevels.LOW
      } = auditData;

      // Validate required fields
      if (!action || !resourceType) {
        throw new Error('Action and resourceType are required for audit logging');
      }

      // Extract request context if available
      const requestContext = this.extractRequestContext(request);

      // Create audit record
      const auditRecord = {
        user_id: userId || null,
        action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        old_values: oldValues,
        new_values: newValues,
        ip_address: requestContext.ipAddress,
        user_agent: requestContext.userAgent,
        organization_id: organizationId || null,
        metadata: {
          ...metadata,
          ...requestContext.metadata,
          risk_level: riskLevel,
          timestamp: new Date().toISOString(),
          session_id: requestContext.sessionId
        },
        created_at: new Date().toISOString()
      };

      // Insert into database
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .insert([auditRecord])
        .select()
        .single();

      if (error) {
        logger.error('Failed to insert audit log:', error);
        throw error;
      }

      // Log to security logger for high/critical risk events
      if (riskLevel === this.riskLevels.HIGH || riskLevel === this.riskLevels.CRITICAL) {
        securityLogger.warn('High-risk audit event', {
          auditId: data.id,
          action,
          resourceType,
          userId,
          riskLevel,
          metadata
        });
      }

      // Cache frequently accessed audit data
      if (userId) {
        await this.cacheUserActivity(userId, auditRecord);
      }

      return data;

    } catch (error) {
      logger.error('Audit logging failed:', error);
      // Don't throw - audit logging failure shouldn't break business operations
      return null;
    }
  }

  /**
   * Extract request context for audit logging
   */
  extractRequestContext(request) {
    if (!request) {
      return {
        ipAddress: null,
        userAgent: null,
        sessionId: null,
        metadata: {}
      };
    }

    return {
      ipAddress: request.ip || request.connection?.remoteAddress,
      userAgent: request.get ? request.get('User-Agent') : request.headers?.['user-agent'],
      sessionId: request.sessionId || null,
      metadata: {
        method: request.method,
        path: request.path,
        query: request.query,
        headers: this.sanitizeHeaders(request.headers),
        referrer: request.get ? request.get('Referrer') : request.headers?.referrer
      }
    };
  }

  /**
   * Sanitize headers for audit logging (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    if (!headers) return {};

    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    delete sanitized['x-access-token'];
    
    return sanitized;
  }

  /**
   * Cache recent user activity for performance
   */
  async cacheUserActivity(userId, auditRecord) {
    try {
      const cacheKey = `user_activity:${userId}`;
      let userActivity = await cacheManager.get(cacheKey) || [];
      
      // Add new activity
      userActivity.unshift({
        action: auditRecord.action,
        resourceType: auditRecord.resource_type,
        timestamp: auditRecord.created_at,
        riskLevel: auditRecord.metadata.risk_level
      });
      
      // Keep only last 50 activities
      userActivity = userActivity.slice(0, 50);
      
      // Cache for 1 hour
      await cacheManager.set(cacheKey, userActivity, 3600);
      
    } catch (error) {
      logger.error('Failed to cache user activity:', error);
    }
  }

  /**
   * Authentication event logging
   */
  async logAuthentication(action, userId, request, metadata = {}) {
    return await this.logEvent({
      action,
      resourceType: this.resourceTypes.USER,
      resourceId: userId,
      userId,
      request,
      metadata,
      riskLevel: this.riskLevels.MEDIUM
    });
  }

  /**
   * Celebrity management event logging
   */
  async logCelebrityOperation(action, celebrityId, userId, organizationId, oldValues, newValues, request, metadata = {}) {
    return await this.logEvent({
      action,
      resourceType: this.resourceTypes.CELEBRITY,
      resourceId: celebrityId,
      userId,
      organizationId,
      oldValues,
      newValues,
      request,
      metadata,
      riskLevel: this.riskLevels.LOW
    });
  }

  /**
   * Booking operation event logging
   */
  async logBookingOperation(action, bookingId, userId, organizationId, oldValues, newValues, request, metadata = {}) {
    return await this.logEvent({
      action,
      resourceType: this.resourceTypes.BOOKING,
      resourceId: bookingId,
      userId,
      organizationId,
      oldValues,
      newValues,
      request,
      metadata,
      riskLevel: this.riskLevels.MEDIUM
    });
  }

  /**
   * Payment operation event logging
   */
  async logPaymentOperation(action, paymentId, userId, organizationId, amount, currency, request, metadata = {}) {
    return await this.logEvent({
      action,
      resourceType: this.resourceTypes.PAYMENT,
      resourceId: paymentId,
      userId,
      organizationId,
      newValues: { amount, currency },
      request,
      metadata,
      riskLevel: this.riskLevels.HIGH
    });
  }

  /**
   * Admin operation event logging
   */
  async logAdminOperation(action, resourceType, resourceId, userId, oldValues, newValues, request, metadata = {}) {
    return await this.logEvent({
      action,
      resourceType,
      resourceId,
      userId,
      oldValues,
      newValues,
      request,
      metadata,
      riskLevel: this.riskLevels.HIGH
    });
  }

  /**
   * Security event logging
   */
  async logSecurityEvent(action, userId, organizationId, request, metadata = {}) {
    return await this.logEvent({
      action,
      resourceType: this.resourceTypes.SYSTEM,
      userId,
      organizationId,
      request,
      metadata,
      riskLevel: this.riskLevels.CRITICAL
    });
  }

  /**
   * File operation event logging
   */
  async logFileOperation(action, fileId, userId, organizationId, fileName, fileSize, request, metadata = {}) {
    return await this.logEvent({
      action,
      resourceType: this.resourceTypes.FILE,
      resourceId: fileId,
      userId,
      organizationId,
      newValues: { fileName, fileSize },
      request,
      metadata,
      riskLevel: this.riskLevels.LOW
    });
  }

  /**
   * Data operation event logging
   */
  async logDataOperation(action, resourceType, userId, organizationId, dataCount, request, metadata = {}) {
    return await this.logEvent({
      action,
      resourceType,
      userId,
      organizationId,
      newValues: { dataCount },
      request,
      metadata,
      riskLevel: this.riskLevels.HIGH
    });
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters = {}, pagination = {}) {
    try {
      const {
        userId,
        organizationId,
        action,
        resourceType,
        riskLevel,
        startDate,
        endDate
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = pagination;

      let query = supabaseAdmin
        .from('audit_logs')
        .select(`
          *,
          app_users(id, email, first_name, last_name)
        `);

      // Apply filters
      if (userId) query = query.eq('user_id', userId);
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (action) query = query.eq('action', action);
      if (resourceType) query = query.eq('resource_type', resourceType);
      if (riskLevel) query = query.eq('metadata->risk_level', riskLevel);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      // Apply pagination and sorting
      const offset = (page - 1) * limit;
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data: logs, error } = await query;

      if (error) throw error;

      // Get total count for pagination
      let countQuery = supabaseAdmin
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      // Apply same filters for count
      if (userId) countQuery = countQuery.eq('user_id', userId);
      if (organizationId) countQuery = countQuery.eq('organization_id', organizationId);
      if (action) countQuery = countQuery.eq('action', action);
      if (resourceType) countQuery = countQuery.eq('resource_type', resourceType);
      if (startDate) countQuery = countQuery.gte('created_at', startDate);
      if (endDate) countQuery = countQuery.lte('created_at', endDate);

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;

      return {
        logs: logs || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };

    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(organizationId = null, timeRange = '24h') {
    try {
      const timeRanges = {
        '1h': new Date(Date.now() - 60 * 60 * 1000),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };

      const startDate = timeRanges[timeRange] || timeRanges['24h'];

      let query = supabaseAdmin
        .from('audit_logs')
        .select('action, resource_type, metadata')
        .gte('created_at', startDate.toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const stats = {
        totalEvents: logs?.length || 0,
        actionBreakdown: {},
        resourceBreakdown: {},
        riskLevelBreakdown: {},
        timeline: {}
      };

      logs?.forEach(log => {
        // Action breakdown
        stats.actionBreakdown[log.action] = (stats.actionBreakdown[log.action] || 0) + 1;

        // Resource breakdown
        stats.resourceBreakdown[log.resource_type] = (stats.resourceBreakdown[log.resource_type] || 0) + 1;

        // Risk level breakdown
        const riskLevel = log.metadata?.risk_level || 'low';
        stats.riskLevelBreakdown[riskLevel] = (stats.riskLevelBreakdown[riskLevel] || 0) + 1;

        // Timeline (hourly buckets)
        const hour = new Date(log.created_at).getHours();
        stats.timeline[hour] = (stats.timeline[hour] || 0) + 1;
      });

      return stats;

    } catch (error) {
      logger.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(filters = {}, format = 'json') {
    try {
      const result = await this.getAuditLogs(filters, { limit: 10000 });
      
      if (format === 'csv') {
        return this.convertToCSV(result.logs);
      }
      
      return result.logs;

    } catch (error) {
      logger.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  convertToCSV(logs) {
    if (!logs || logs.length === 0) return '';

    const headers = [
      'ID', 'User ID', 'User Email', 'Action', 'Resource Type', 'Resource ID',
      'IP Address', 'User Agent', 'Organization ID', 'Risk Level', 'Created At'
    ];

    const rows = logs.map(log => [
      log.id,
      log.user_id || '',
      log.app_users?.email || '',
      log.action,
      log.resource_type,
      log.resource_id || '',
      log.ip_address || '',
      log.user_agent || '',
      log.organization_id || '',
      log.metadata?.risk_level || 'low',
      log.created_at
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(retentionDays = 90) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const { error } = await supabaseAdmin
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      logger.info(`Cleaned up audit logs older than ${retentionDays} days`);

    } catch (error) {
      logger.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  }
}

// Create singleton instance
const auditService = new AuditService();

module.exports = {
  AuditService,
  auditService
};