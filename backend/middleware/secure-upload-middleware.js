const { secureUploadService } = require('../services/secure-upload-service');
const { auditService } = require('../services/audit-service');
const { logger } = require('../utils/logger');

/**
 * Secure Upload Middleware
 * Provides middleware functions for handling secure file uploads
 * with comprehensive validation and security checks
 */

/**
 * Create secure upload middleware
 */
function createSecureUploadMiddleware(options = {}) {
  const {
    fileCategory = 'images',
    maxFiles = 5,
    folder = 'uploads',
    processImages = true,
    requireAuth = true,
    allowedRoles = null
  } = options;

  // Create multer instance with security configurations
  const upload = secureUploadService.createSecureMulter(fileCategory, { maxFiles });

  return {
    // Single file upload middleware
    single: (fieldName) => {
      return [
        // Authentication check
        ...(requireAuth ? [checkAuthentication] : []),
        
        // Role check
        ...(allowedRoles ? [checkRoles(allowedRoles)] : []),
        
        // File upload handling
        upload.single(fieldName),
        
        // Security processing
        async (req, res, next) => {
          try {
            if (!req.file) {
              return next();
            }

            // Process file with security checks
            const uploadResult = await secureUploadService.uploadSecureFile(req.file, {
              folder,
              userId: req.user?.id,
              organizationId: req.user?.organization_id,
              processImages,
              request: req
            });

            // Attach upload result to request
            req.uploadResult = uploadResult;
            req.secureFile = uploadResult;

            next();
          } catch (error) {
            logger.error('Secure upload middleware error:', error);
            
            // Return user-friendly error message
            const userMessage = getUserFriendlyErrorMessage(error);
            return res.status(400).json({
              success: false,
              error: userMessage,
              code: error.code || 'UPLOAD_ERROR'
            });
          }
        }
      ];
    },

    // Multiple files upload middleware
    array: (fieldName, maxCount = maxFiles) => {
      return [
        // Authentication check
        ...(requireAuth ? [checkAuthentication] : []),
        
        // Role check
        ...(allowedRoles ? [checkRoles(allowedRoles)] : []),
        
        // File upload handling
        upload.array(fieldName, maxCount),
        
        // Security processing
        async (req, res, next) => {
          try {
            if (!req.files || req.files.length === 0) {
              return next();
            }

            // Process all files with security checks
            const uploadPromises = req.files.map(file => 
              secureUploadService.uploadSecureFile(file, {
                folder,
                userId: req.user?.id,
                organizationId: req.user?.organization_id,
                processImages,
                request: req
              })
            );

            const uploadResults = await Promise.all(uploadPromises);

            // Attach upload results to request
            req.uploadResults = uploadResults;
            req.secureFiles = uploadResults;

            next();
          } catch (error) {
            logger.error('Secure upload middleware error:', error);
            
            const userMessage = getUserFriendlyErrorMessage(error);
            return res.status(400).json({
              success: false,
              error: userMessage,
              code: error.code || 'UPLOAD_ERROR'
            });
          }
        }
      ];
    },

    // Fields with multiple file types
    fields: (fields) => {
      return [
        // Authentication check
        ...(requireAuth ? [checkAuthentication] : []),
        
        // Role check
        ...(allowedRoles ? [checkRoles(allowedRoles)] : []),
        
        // File upload handling
        upload.fields(fields),
        
        // Security processing
        async (req, res, next) => {
          try {
            if (!req.files) {
              return next();
            }

            const uploadResults = {};

            // Process each field
            for (const [fieldName, files] of Object.entries(req.files)) {
              if (files && files.length > 0) {
                const fieldUploadPromises = files.map(file =>
                  secureUploadService.uploadSecureFile(file, {
                    folder: `${folder}/${fieldName}`,
                    userId: req.user?.id,
                    organizationId: req.user?.organization_id,
                    processImages,
                    request: req
                  })
                );

                uploadResults[fieldName] = await Promise.all(fieldUploadPromises);
              }
            }

            // Attach upload results to request
            req.uploadResults = uploadResults;
            req.secureFiles = uploadResults;

            next();
          } catch (error) {
            logger.error('Secure upload middleware error:', error);
            
            const userMessage = getUserFriendlyErrorMessage(error);
            return res.status(400).json({
              success: false,
              error: userMessage,
              code: error.code || 'UPLOAD_ERROR'
            });
          }
        }
      ];
    }
  };
}

/**
 * Check authentication middleware
 */
function checkAuthentication(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required for file upload'
    });
  }
  next();
}

/**
 * Check user roles middleware
 */
function checkRoles(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for file upload'
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: `File upload requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Upload quota check middleware
 */
function checkUploadQuota(quotaType = 'daily') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      const { supabaseAdmin } = require('../config/supabase');
      
      // Get current quota
      const { data: quota, error } = await supabaseAdmin
        .from('file_upload_quotas')
        .select('*')
        .eq('organization_id', req.user.organization_id)
        .eq('user_id', req.user.id)
        .eq('quota_type', quotaType)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        logger.error('Quota check error:', error);
        return next(); // Allow upload on error
      }

      if (quota) {
        // Check file count limit
        if (quota.current_files >= quota.max_files) {
          return res.status(429).json({
            success: false,
            error: `Upload quota exceeded: ${quota.current_files}/${quota.max_files} files used`,
            quotaInfo: {
              currentFiles: quota.current_files,
              maxFiles: quota.max_files,
              currentSize: quota.current_size_bytes,
              maxSize: quota.max_size_bytes
            }
          });
        }

        // Check size limit
        if (quota.current_size_bytes >= quota.max_size_bytes) {
          return res.status(429).json({
            success: false,
            error: `Storage quota exceeded: ${formatBytes(quota.current_size_bytes)}/${formatBytes(quota.max_size_bytes)} used`,
            quotaInfo: {
              currentFiles: quota.current_files,
              maxFiles: quota.max_files,
              currentSize: quota.current_size_bytes,
              maxSize: quota.max_size_bytes
            }
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Upload quota check error:', error);
      next(); // Allow upload on error
    }
  };
}

/**
 * File type validation middleware
 */
function validateFileTypes(allowedTypes) {
  return (req, res, next) => {
    const files = req.files || (req.file ? [req.file] : []);
    
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          code: 'INVALID_FILE_TYPE'
        });
      }
    }
    
    next();
  };
}

/**
 * File size validation middleware
 */
function validateFileSize(maxSizeBytes) {
  return (req, res, next) => {
    const files = req.files || (req.file ? [req.file] : []);
    
    for (const file of files) {
      if (file.size > maxSizeBytes) {
        return res.status(400).json({
          success: false,
          error: `File ${file.originalname} too large. Maximum size: ${formatBytes(maxSizeBytes)}`,
          code: 'FILE_TOO_LARGE'
        });
      }
    }
    
    next();
  };
}

/**
 * Upload audit logging middleware
 */
function auditUploadMiddleware() {
  return async (req, res, next) => {
    // Store original response methods
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log successful uploads
      if (data && data.success && (req.uploadResult || req.uploadResults || req.secureFile || req.secureFiles)) {
        const files = req.secureFiles || req.uploadResults || [req.secureFile || req.uploadResult].filter(Boolean);
        
        if (Array.isArray(files) && files.length > 0) {
          files.forEach(file => {
            auditService.logFileOperation(
              auditService.auditActions.FILE_UPLOAD,
              file.id,
              req.user?.id,
              req.user?.organization_id,
              file.originalName,
              file.size,
              req,
              {
                secureFilename: file.filename,
                mimeType: file.mimeType,
                processed: !!file.processingMetadata
              }
            ).catch(error => {
              logger.error('Upload audit logging failed:', error);
            });
          });
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Convert error to user-friendly message
 */
function getUserFriendlyErrorMessage(error) {
  const errorCode = error.code || error.message;
  
  const errorMessages = {
    'LIMIT_FILE_SIZE': 'File size exceeds the maximum allowed limit',
    'LIMIT_FILE_COUNT': 'Too many files uploaded at once',
    'LIMIT_FIELD_COUNT': 'Too many form fields',
    'LIMIT_UNEXPECTED_FILE': 'Unexpected file field',
    'SECURITY_VIOLATION': error.message,
    'INVALID_FILE_TYPE': 'Invalid file type uploaded',
    'INVALID_FILE_EXTENSION': 'Invalid file extension',
    'VIRUS_DETECTED': 'File contains malicious content and was rejected',
    'CONTENT_VALIDATION_FAILED': 'File content validation failed'
  };
  
  return errorMessages[errorCode] || 'File upload failed. Please try again.';
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Cleanup uploaded files on error
 */
function cleanupOnError() {
  return (error, req, res, next) => {
    // If there's an error and files were uploaded, clean them up
    if (error && (req.uploadResult || req.uploadResults)) {
      const files = req.uploadResults || [req.uploadResult].filter(Boolean);
      
      if (Array.isArray(files)) {
        files.forEach(file => {
          if (file && file.id) {
            secureUploadService.deleteSecureFile(file.id, req.user?.id, req)
              .catch(cleanupError => {
                logger.error('Error cleaning up uploaded file:', cleanupError);
              });
          }
        });
      }
    }
    
    next(error);
  };
}

module.exports = {
  createSecureUploadMiddleware,
  checkUploadQuota,
  validateFileTypes,
  validateFileSize,
  auditUploadMiddleware,
  cleanupOnError,
  formatBytes
};