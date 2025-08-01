const express = require('express');
const router = express.Router();
const { DatabaseBackupService } = require('../services/database-backup-service');
const { requireAuth, requireRole } = require('../middleware/auth-middleware');
const { auditService } = require('../services/audit-service');
const { logger } = require('../utils/logger');

// Initialize backup service
const backupService = new DatabaseBackupService();

/**
 * Backup Management API Routes
 * Administrative interface for database backup operations
 */

/**
 * @route GET /api/admin/backup/status
 * @desc Get backup service status and statistics
 * @access Admin
 */
router.get('/status', requireAuth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const status = await backupService.getBackupStatus();
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_ACCESS,
      req.user?.id,
      req.user?.organization_id,
      req,
      { backupStatusAccessed: true }
    );
    
    res.json({
      success: true,
      data: { status }
    });
    
  } catch (error) {
    logger.error('Failed to get backup status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve backup status'
    });
  }
});

/**
 * @route GET /api/admin/backup/list
 * @desc List all available backups with optional filtering
 * @access Admin
 */
router.get('/list', requireAuth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      status: req.query.status,
      since: req.query.since,
      until: req.query.until
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );
    
    const backups = await backupService.listBackups(filters);
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_ACCESS,
      req.user?.id,
      req.user?.organization_id,
      req,
      { backupListAccessed: true, filters }
    );
    
    res.json({
      success: true,
      data: {
        backups,
        total: backups.length,
        filters: filters
      }
    });
    
  } catch (error) {
    logger.error('Failed to list backups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve backup list'
    });
  }
});

/**
 * @route POST /api/admin/backup/create
 * @desc Create a new manual backup
 * @access Admin
 */
router.post('/create', requireAuth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { type = 'manual', description, options = {} } = req.body;
    
    // Add request metadata to options
    options.requestedBy = req.user?.id;
    options.requestedByEmail = req.user?.email;
    options.description = description;
    
    const result = await backupService.createBackup(type, options);
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_BACKUP,
      req.user?.id,
      req.user?.organization_id,
      req,
      {
        backupCreated: true,
        backupId: result.backupId,
        backupType: type,
        description
      }
    );
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to create backup:', error);
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_ERROR,
      req.user?.id,
      req.user?.organization_id,
      req,
      {
        backupCreationFailed: true,
        error: error.message
      }
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to create backup',
      details: error.message
    });
  }
});

/**
 * @route POST /api/admin/backup/restore/:backupId
 * @desc Restore database from backup
 * @access Super Admin only
 */
router.post('/restore/:backupId', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { backupId } = req.params;
    const { targetDatabase, clean = false, createDatabase = false } = req.body;
    
    const options = {
      targetDatabase,
      clean,
      createDatabase,
      restoredBy: req.user?.id,
      restoredByEmail: req.user?.email
    };
    
    const result = await backupService.restoreBackup(backupId, options);
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_RESTORE,
      req.user?.id,
      req.user?.organization_id,
      req,
      {
        backupRestored: true,
        backupId,
        targetDatabase,
        options
      }
    );
    
    res.json({
      success: true,
      message: 'Database restored successfully',
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to restore backup:', error);
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_ERROR,
      req.user?.id,
      req.user?.organization_id,
      req,
      {
        backupRestoreFailed: true,
        backupId: req.params.backupId,
        error: error.message
      }
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to restore backup',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/admin/backup/:backupId
 * @desc Delete a specific backup
 * @access Admin
 */
router.delete('/:backupId', requireAuth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { backupId } = req.params;
    
    await backupService.deleteBackup(backupId);
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_DELETE,
      req.user?.id,
      req.user?.organization_id,
      req,
      {
        backupDeleted: true,
        backupId
      }
    );
    
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
    
  } catch (error) {
    logger.error('Failed to delete backup:', error);
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_ERROR,
      req.user?.id,
      req.user?.organization_id,
      req,
      {
        backupDeletionFailed: true,
        backupId: req.params.backupId,
        error: error.message
      }
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete backup',
      details: error.message
    });
  }
});

/**
 * @route POST /api/admin/backup/cleanup
 * @desc Manually trigger backup cleanup based on retention policy
 * @access Admin
 */
router.post('/cleanup', requireAuth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    await backupService.cleanupOldBackups();
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_MAINTENANCE,
      req.user?.id,
      req.user?.organization_id,
      req,
      { backupCleanupTriggered: true }
    );
    
    res.json({
      success: true,
      message: 'Backup cleanup completed successfully'
    });
    
  } catch (error) {
    logger.error('Failed to cleanup backups:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup backups',
      details: error.message
    });
  }
});

/**
 * @route GET /api/admin/backup/download/:backupId
 * @desc Download a backup file
 * @access Admin
 */
router.get('/download/:backupId', requireAuth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { backupId } = req.params;
    const backupPath = await backupService.findBackupFile(backupId);
    
    if (!backupPath) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_ACCESS,
      req.user?.id,
      req.user?.organization_id,
      req,
      {
        backupDownloaded: true,
        backupId
      }
    );
    
    const fs = require('fs');
    const path = require('path');
    
    const fileName = path.basename(backupPath);
    
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    const fileStream = fs.createReadStream(backupPath);
    fileStream.pipe(res);
    
  } catch (error) {
    logger.error('Failed to download backup:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to download backup',
      details: error.message
    });
  }
});

/**
 * @route POST /api/admin/backup/schedule/start
 * @desc Start scheduled backup jobs
 * @access Super Admin only
 */
router.post('/schedule/start', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    backupService.startScheduledBackups();
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_CONFIG,
      req.user?.id,
      req.user?.organization_id,
      req,
      { scheduledBackupsStarted: true }
    );
    
    res.json({
      success: true,
      message: 'Scheduled backup jobs started successfully'
    });
    
  } catch (error) {
    logger.error('Failed to start scheduled backups:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduled backups',
      details: error.message
    });
  }
});

/**
 * @route POST /api/admin/backup/schedule/stop
 * @desc Stop scheduled backup jobs
 * @access Super Admin only
 */
router.post('/schedule/stop', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    backupService.stopScheduledBackups();
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_CONFIG,
      req.user?.id,
      req.user?.organization_id,
      req,
      { scheduledBackupsStopped: true }
    );
    
    res.json({
      success: true,
      message: 'Scheduled backup jobs stopped successfully'
    });
    
  } catch (error) {
    logger.error('Failed to stop scheduled backups:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduled backups',
      details: error.message
    });
  }
});

/**
 * @route GET /api/admin/backup/validate/:backupId
 * @desc Validate backup integrity
 * @access Admin
 */
router.get('/validate/:backupId', requireAuth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { backupId } = req.params;
    
    // Load backup metadata
    const backups = await backupService.listBackups();
    const backup = backups.find(b => b.backupId === backupId);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }
    
    // Find backup file
    const backupPath = await backupService.findBackupFile(backupId);
    if (!backupPath) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }
    
    // Validate backup
    await backupService.validateBackup(backupPath, backup);
    
    await auditService.logEvent(
      auditService.auditActions.SYSTEM_ACCESS,
      req.user?.id,
      req.user?.organization_id,
      req,
      {
        backupValidated: true,
        backupId
      }
    );
    
    res.json({
      success: true,
      message: 'Backup validation passed',
      data: {
        backupId,
        valid: true,
        metadata: backup
      }
    });
    
  } catch (error) {
    logger.error('Backup validation failed:', error);
    
    res.status(400).json({
      success: false,
      error: 'Backup validation failed',
      details: error.message
    });
  }
});

module.exports = router;