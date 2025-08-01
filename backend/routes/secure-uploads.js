const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { secureUploadService } = require('../services/secure-upload-service');
const { 
  createSecureUploadMiddleware, 
  checkUploadQuota,
  auditUploadMiddleware,
  cleanupOnError,
  formatBytes
} = require('../middleware/secure-upload-middleware');
const { errorHandler } = require('../utils/standard-error-handler');
const { rateLimits } = require('../middleware/security');
const { supabaseAdmin } = require('../config/supabase');
const { logger } = require('../utils/logger');
const router = express.Router();

/**
 * Secure File Upload Management API
 * Provides endpoints for secure file uploads with comprehensive validation,
 * virus scanning, and access control
 */

// Create secure upload middleware instances
const imageUpload = createSecureUploadMiddleware({
  fileCategory: 'images',
  maxFiles: 5,
  folder: 'images',
  processImages: true,
  requireAuth: true
});

const documentUpload = createSecureUploadMiddleware({
  fileCategory: 'documents',
  maxFiles: 3,
  folder: 'documents',
  processImages: false,
  requireAuth: true,
  allowedRoles: ['admin', 'super_admin', 'manager']
});

const avatarUpload = createSecureUploadMiddleware({
  fileCategory: 'images',
  maxFiles: 1,
  folder: 'avatars',
  processImages: true,
  requireAuth: true
});

// POST /api/uploads/image - Upload single image
router.post('/image',
  rateLimits.upload,
  authenticateToken,
  checkUploadQuota('daily'),
  auditUploadMiddleware(),
  ...imageUpload.single('image'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    if (!req.secureFile) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        file: req.secureFile
      }
    });
  }),
  cleanupOnError()
);

// POST /api/uploads/images - Upload multiple images
router.post('/images',
  rateLimits.upload,
  authenticateToken,
  checkUploadQuota('daily'),
  auditUploadMiddleware(),
  ...imageUpload.array('images', 5),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    if (!req.secureFiles || req.secureFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No image files provided'
      });
    }

    res.json({
      success: true,
      message: `${req.secureFiles.length} images uploaded successfully`,
      data: {
        files: req.secureFiles,
        count: req.secureFiles.length
      }
    });
  }),
  cleanupOnError()
);

// POST /api/uploads/document - Upload document
router.post('/document',
  rateLimits.upload,
  authenticateToken,
  requirePermission('files.upload'),
  checkUploadQuota('daily'),
  auditUploadMiddleware(),
  ...documentUpload.single('document'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    if (!req.secureFile) {
      return res.status(400).json({
        success: false,
        error: 'No document file provided'
      });
    }

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        file: req.secureFile
      }
    });
  }),
  cleanupOnError()
);

// POST /api/uploads/avatar - Upload user avatar
router.post('/avatar',
  rateLimits.upload,
  authenticateToken,
  auditUploadMiddleware(),
  ...avatarUpload.single('avatar'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    if (!req.secureFile) {
      return res.status(400).json({
        success: false,
        error: 'No avatar file provided'
      });
    }

    // Update user avatar in database
    const { error: updateError } = await supabaseAdmin
      .from('app_users')
      .update({ 
        avatar_url: req.secureFile.url,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) {
      logger.error('Error updating user avatar:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update avatar'
      });
    }

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        file: req.secureFile,
        avatarUrl: req.secureFile.url
      }
    });
  }),
  cleanupOnError()
);

// GET /api/uploads - Get user's uploaded files
router.get('/',
  rateLimits.general,
  authenticateToken,
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      mimeType,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabaseAdmin
      .from('secure_files')
      .select('*')
      .eq('user_id', req.user.id)
      .is('deleted_at', null);

    if (mimeType) {
      query = query.eq('mime_type', mimeType);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: files, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count
    let countQuery = supabaseAdmin
      .from('secure_files')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .is('deleted_at', null);

    if (mimeType) {
      countQuery = countQuery.eq('mime_type', mimeType);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    res.json({
      success: true,
      data: {
        files: files || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / parseInt(limit))
        }
      }
    });
  })
);

// GET /api/uploads/:id - Get specific file details
router.get('/:id',
  rateLimits.general,
  authenticateToken,
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { id } = req.params;

    const { data: file, error } = await supabaseAdmin
      .from('secure_files')
      .select(`
        *,
        file_scan_results(*),
        file_access_logs(*)
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .single();

    if (error || !file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Log file access
    await supabaseAdmin
      .from('file_access_logs')
      .insert([{
        file_id: file.id,
        user_id: req.user.id,
        access_type: 'view',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        accessed_at: new Date().toISOString()
      }]);

    res.json({
      success: true,
      data: file
    });
  })
);

// DELETE /api/uploads/:id - Delete file
router.delete('/:id',
  rateLimits.api,
  authenticateToken,
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { id } = req.params;

    try {
      await secureUploadService.deleteSecureFile(id, req.user.id, req);

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }
      if (error.message.includes('permissions')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      throw error;
    }
  })
);

// GET /api/uploads/quota/status - Get upload quota status
router.get('/quota/status',
  rateLimits.general,
  authenticateToken,
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { data: quotas, error } = await supabaseAdmin
      .from('file_upload_quotas')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    const quotaStatus = quotas?.reduce((acc, quota) => {
      acc[quota.quota_type] = {
        currentFiles: quota.current_files,
        maxFiles: quota.max_files,
        currentSize: quota.current_size_bytes,
        maxSize: quota.max_size_bytes,
        filesUsagePercent: Math.round((quota.current_files / quota.max_files) * 100),
        sizeUsagePercent: Math.round((quota.current_size_bytes / quota.max_size_bytes) * 100),
        resetAt: quota.reset_at,
        formattedCurrentSize: formatBytes(quota.current_size_bytes),
        formattedMaxSize: formatBytes(quota.max_size_bytes)
      };
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: {
        quotas: quotaStatus,
        userId: req.user.id,
        organizationId: req.user.organization_id
      }
    });
  })
);

// GET /api/uploads/statistics - Get upload statistics
router.get('/statistics',
  rateLimits.general,
  authenticateToken,
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { timeRange = '24h' } = req.query;

    const stats = await secureUploadService.getUploadStatistics(
      req.user.organization_id,
      timeRange
    );

    res.json({
      success: true,
      data: {
        statistics: stats,
        timeRange,
        userId: req.user.id,
        organizationId: req.user.organization_id
      }
    });
  })
);

// Admin endpoints

// GET /api/uploads/admin/all - Get all files (admin only)
router.get('/admin/all',
  rateLimits.api,
  authenticateToken,
  requirePermission('files.admin'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      userId,
      mimeType,
      virusScanned,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabaseAdmin
      .from('secure_files')
      .select(`
        *,
        app_users(id, email, first_name, last_name)
      `)
      .is('deleted_at', null);

    // Organization filter for non-super admins
    if (req.user.role !== 'super_admin') {
      query = query.eq('organization_id', req.user.organization_id);
    }

    if (userId) query = query.eq('user_id', userId);
    if (mimeType) query = query.eq('mime_type', mimeType);
    if (virusScanned !== undefined) query = query.eq('virus_scanned', virusScanned === 'true');

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: files, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        files: files || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  })
);

// POST /api/uploads/admin/quota - Set upload quota (admin only)
router.post('/admin/quota',
  rateLimits.api,
  authenticateToken,
  requirePermission('files.admin'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const {
      userId,
      organizationId,
      quotaType = 'daily',
      maxFiles,
      maxSizeBytes
    } = req.body;

    if (!userId && !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Either userId or organizationId is required'
      });
    }

    const quotaData = {
      user_id: userId || null,
      organization_id: organizationId || req.user.organization_id,
      quota_type: quotaType,
      max_files: maxFiles,
      max_size_bytes: maxSizeBytes,
      updated_at: new Date().toISOString()
    };

    const { data: quota, error } = await supabaseAdmin
      .from('file_upload_quotas')
      .upsert([quotaData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Upload quota updated successfully',
      data: quota
    });
  })
);

// DELETE /api/uploads/admin/:id - Admin delete file
router.delete('/admin/:id',
  rateLimits.api,
  authenticateToken,
  requirePermission('files.admin'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { id } = req.params;

    const { data: file, error: fetchError } = await supabaseAdmin
      .from('secure_files')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Check organization permissions for non-super admins
    if (req.user.role !== 'super_admin' && file.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    try {
      await secureUploadService.deleteSecureFile(id, req.user.id, req);

      res.json({
        success: true,
        message: 'File deleted successfully by admin'
      });
    } catch (error) {
      throw error;
    }
  })
);

// Error handling middleware
router.use(cleanupOnError());

module.exports = router;