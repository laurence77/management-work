const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { auditService } = require('../services/audit-service');
const { errorHandler } = require('../utils/standard-error-handler');
const { adminAuditMiddleware } = require('../middleware/audit-middleware');
const { logger } = require('../utils/logger');
const router = express.Router();

/**
 * Audit Logs Management API
 * Provides endpoints for viewing, searching, and managing audit logs
 */

// GET /api/audit - Get audit logs with filtering and pagination
router.get('/', 
  authenticateToken,
  requirePermission('audit.view'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const {
      userId,
      action,
      resourceType,
      riskLevel,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Organization-based filtering for non-super admins
    const organizationId = req.user.role === 'super_admin' 
      ? req.query.organizationId 
      : req.user.organization_id;

    const filters = {
      userId,
      organizationId,
      action,
      resourceType,
      riskLevel,
      startDate,
      endDate
    };

    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 1000), // Max 1000 records per page
      sortBy,
      sortOrder
    };

    const result = await auditService.getAuditLogs(filters, pagination);

    res.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: result.pagination,
        filters
      }
    });
  })
);

// GET /api/audit/statistics - Get audit statistics
router.get('/statistics',
  authenticateToken,
  requirePermission('audit.view'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { timeRange = '24h' } = req.query;
    
    // Organization-based filtering for non-super admins
    const organizationId = req.user.role === 'super_admin' 
      ? req.query.organizationId 
      : req.user.organization_id;

    const stats = await auditService.getAuditStatistics(organizationId, timeRange);

    res.json({
      success: true,
      data: {
        statistics: stats,
        timeRange,
        organizationId
      }
    });
  })
);

// GET /api/audit/actions - Get available audit actions
router.get('/actions',
  authenticateToken,
  requirePermission('audit.view'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    res.json({
      success: true,
      data: {
        actions: Object.values(auditService.auditActions),
        resourceTypes: Object.values(auditService.resourceTypes),
        riskLevels: Object.values(auditService.riskLevels)
      }
    });
  })
);

// GET /api/audit/user/:userId - Get audit logs for specific user
router.get('/user/:userId',
  authenticateToken,
  requirePermission('audit.view'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 50, timeRange = '7d' } = req.query;

    // Check if user can view this user's audit logs
    if (req.user.role !== 'super_admin' && req.user.id !== userId) {
      // Check if user is in same organization
      const { data: targetUser } = await req.supabase
        .from('app_users')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (!targetUser || targetUser.organization_id !== req.user.organization_id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this user\'s audit logs'
        });
      }
    }

    const timeRanges = {
      '1d': new Date(Date.now() - 24 * 60 * 60 * 1000),
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };

    const startDate = timeRanges[timeRange]?.toISOString();

    const filters = {
      userId,
      startDate
    };

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await auditService.getAuditLogs(filters, pagination);

    res.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: result.pagination,
        userId,
        timeRange
      }
    });
  })
);

// GET /api/audit/export - Export audit logs
router.get('/export',
  authenticateToken,
  requirePermission('audit.export'),
  adminAuditMiddleware(),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const {
      format = 'json',
      userId,
      action,
      resourceType,
      riskLevel,
      startDate,
      endDate
    } = req.query;

    // Organization-based filtering for non-super admins
    const organizationId = req.user.role === 'super_admin' 
      ? req.query.organizationId 
      : req.user.organization_id;

    const filters = {
      userId,
      organizationId,
      action,
      resourceType,
      riskLevel,
      startDate,
      endDate
    };

    const exportData = await auditService.exportAuditLogs(filters, format);

    // Set appropriate headers based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(exportData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        data: {
          logs: exportData,
          exportedAt: new Date().toISOString(),
          filters
        }
      });
    }
  })
);

// POST /api/audit/manual - Manually log an audit event (admin only)
router.post('/manual',
  authenticateToken,
  requirePermission('audit.create'),
  adminAuditMiddleware(),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const {
      action,
      resourceType,
      resourceId,
      targetUserId,
      oldValues,
      newValues,
      metadata,
      riskLevel = 'medium'
    } = req.body;

    // Validation
    if (!action || !resourceType) {
      return res.status(400).json({
        success: false,
        error: 'Action and resourceType are required'
      });
    }

    const auditRecord = await auditService.logEvent({
      action,
      resourceType,
      resourceId,
      userId: targetUserId || req.user.id,
      organizationId: req.user.organization_id,
      oldValues,
      newValues,
      request: req,
      metadata: {
        ...metadata,
        manualEntry: true,
        createdBy: req.user.id,
        createdByEmail: req.user.email
      },
      riskLevel
    });

    res.json({
      success: true,
      message: 'Audit event logged successfully',
      data: auditRecord
    });
  })
);

// DELETE /api/audit/cleanup - Clean up old audit logs (super admin only)
router.delete('/cleanup',
  authenticateToken,
  requirePermission('audit.delete'),
  adminAuditMiddleware(),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admins can perform audit cleanup'
      });
    }

    const { retentionDays = 90 } = req.query;

    await auditService.cleanupOldLogs(parseInt(retentionDays));

    res.json({
      success: true,
      message: `Audit logs older than ${retentionDays} days have been cleaned up`
    });
  })
);

// GET /api/audit/search - Advanced search in audit logs
router.get('/search',
  authenticateToken,
  requirePermission('audit.view'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const {
      query,
      searchFields = 'action,resource_type,metadata',
      page = 1,
      limit = 50
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Organization-based filtering for non-super admins
    const organizationId = req.user.role === 'super_admin' 
      ? req.query.organizationId 
      : req.user.organization_id;

    try {
      // This would require a more sophisticated search implementation
      // For now, we'll do a basic text search on specified fields
      let searchQuery = supabaseAdmin
        .from('audit_logs')
        .select(`
          *,
          app_users(id, email, first_name, last_name)
        `)
        .or(`action.ilike.%${query}%,resource_type.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (organizationId) {
        searchQuery = searchQuery.eq('organization_id', organizationId);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      searchQuery = searchQuery.range(offset, offset + parseInt(limit) - 1);

      const { data: logs, error } = await searchQuery;

      if (error) throw error;

      res.json({
        success: true,
        data: {
          logs: logs || [],
          query,
          searchFields: searchFields.split(','),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Audit search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  })
);

// GET /api/audit/summary - Get audit summary for dashboard
router.get('/summary',
  authenticateToken,
  requirePermission('audit.view'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { timeRange = '24h' } = req.query;
    
    // Organization-based filtering for non-super admins
    const organizationId = req.user.role === 'super_admin' 
      ? req.query.organizationId 
      : req.user.organization_id;

    const stats = await auditService.getAuditStatistics(organizationId, timeRange);

    // Calculate key metrics
    const summary = {
      totalEvents: stats.totalEvents,
      criticalEvents: stats.riskLevelBreakdown.critical || 0,
      highRiskEvents: stats.riskLevelBreakdown.high || 0,
      securityEvents: (stats.actionBreakdown.failed_login || 0) + 
                      (stats.actionBreakdown.suspicious_activity || 0) +
                      (stats.actionBreakdown.fraud_detection || 0),
      authEvents: (stats.actionBreakdown.user_login || 0) + 
                  (stats.actionBreakdown.user_logout || 0) +
                  (stats.actionBreakdown.password_change || 0),
      adminEvents: Object.keys(stats.actionBreakdown)
                    .filter(action => action.startsWith('admin_'))
                    .reduce((sum, action) => sum + stats.actionBreakdown[action], 0),
      paymentEvents: (stats.actionBreakdown.payment_process || 0) +
                     (stats.actionBreakdown.payment_refund || 0) +
                     (stats.actionBreakdown.crypto_payment || 0),
      timeRange,
      organizationId
    };

    res.json({
      success: true,
      data: summary
    });
  })
);

module.exports = router;