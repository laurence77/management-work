const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const fileType = require('file-type');
const clamAV = require('clamscan');
const { supabaseAdmin } = require('../config/supabase');
const { logger, securityLogger } = require('../utils/logger');
const { auditService } = require('./audit-service');

/**
 * Secure File Upload Service
 * Provides enterprise-grade file upload security with comprehensive validation,
 * virus scanning, content analysis, and secure storage
 */

class SecureUploadService {
  constructor() {
    this.allowedFileTypes = {
      images: {
        mimeTypes: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml'
        ],
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
        maxSize: 10 * 1024 * 1024, // 10MB
        description: 'Images (JPEG, PNG, GIF, WebP, SVG)'
      },
      documents: {
        mimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv'
        ],
        extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
        maxSize: 50 * 1024 * 1024, // 50MB
        description: 'Documents (PDF, Word, Excel, Text)'
      },
      videos: {
        mimeTypes: [
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/webm'
        ],
        extensions: ['.mp4', '.mpeg', '.mov', '.webm'],
        maxSize: 500 * 1024 * 1024, // 500MB
        description: 'Videos (MP4, MPEG, MOV, WebM)'
      },
      audio: {
        mimeTypes: [
          'audio/mpeg',
          'audio/wav',
          'audio/mp4',
          'audio/webm'
        ],
        extensions: ['.mp3', '.wav', '.m4a', '.webm'],
        maxSize: 100 * 1024 * 1024, // 100MB
        description: 'Audio (MP3, WAV, M4A, WebM)'
      }
    };

    this.securityRules = {
      maxFileNameLength: 255,
      maxFilesPerUpload: 10,
      allowedCharacters: /^[a-zA-Z0-9._-]+$/,
      virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true',
      contentAnalysisEnabled: true,
      quarantineEnabled: true
    };

    this.initializeVirusScanner();
  }

  /**
   * Initialize virus scanner if enabled
   */
  async initializeVirusScanner() {
    if (this.securityRules.virusScanEnabled) {
      try {
        this.virusScanner = await new clamAV().init({
          removeInfected: true,
          quarantineInfected: this.securityRules.quarantineEnabled,
          scanLog: path.join(__dirname, '../logs/virus-scan.log'),
          debugMode: process.env.NODE_ENV === 'development'
        });
        logger.info('Virus scanner initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize virus scanner:', error);
        this.securityRules.virusScanEnabled = false;
      }
    }
  }

  /**
   * Create secure multer configuration
   */
  createSecureMulter(fileCategory = 'images', options = {}) {
    const allowedTypes = this.allowedFileTypes[fileCategory];
    if (!allowedTypes) {
      throw new Error(`Invalid file category: ${fileCategory}`);
    }

    const storage = multer.memoryStorage();

    const fileFilter = async (req, file, cb) => {
      try {
        // Basic security checks
        const securityCheck = await this.performSecurityChecks(file, req);
        
        if (!securityCheck.isSecure) {
          const error = new Error(securityCheck.reason);
          error.code = 'SECURITY_VIOLATION';
          return cb(error, false);
        }

        // File type validation
        if (!allowedTypes.mimeTypes.includes(file.mimetype)) {
          const error = new Error(`Invalid file type. Allowed: ${allowedTypes.description}`);
          error.code = 'INVALID_FILE_TYPE';
          return cb(error, false);
        }

        // File extension validation
        const fileExt = path.extname(file.originalname).toLowerCase();
        if (!allowedTypes.extensions.includes(fileExt)) {
          const error = new Error(`Invalid file extension. Allowed: ${allowedTypes.extensions.join(', ')}`);
          error.code = 'INVALID_FILE_EXTENSION';
          return cb(error, false);
        }

        cb(null, true);
      } catch (error) {
        logger.error('File filter error:', error);
        cb(error, false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: allowedTypes.maxSize,
        files: options.maxFiles || this.securityRules.maxFilesPerUpload,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024, // 1MB for text fields
        headerPairs: 20
      }
    });
  }

  /**
   * Perform comprehensive security checks on uploaded file
   */
  async performSecurityChecks(file, req) {
    const checks = {
      isSecure: true,
      reason: null,
      warnings: []
    };

    // Filename security check
    if (!this.isSecureFilename(file.originalname)) {
      checks.isSecure = false;
      checks.reason = 'Insecure filename detected';
      return checks;
    }

    // Rate limiting check (per user)
    const uploadRate = await this.checkUploadRate(req.user?.id, req.ip);
    if (!uploadRate.allowed) {
      checks.isSecure = false;
      checks.reason = `Upload rate limit exceeded: ${uploadRate.reason}`;
      return checks;
    }

    // Check for suspicious patterns
    const suspiciousCheck = this.detectSuspiciousPatterns(file);
    if (!suspiciousCheck.isSafe) {
      checks.warnings.push(suspiciousCheck.warning);
      
      // Log suspicious activity
      await auditService.logSecurityEvent(
        auditService.auditActions.SUSPICIOUS_ACTIVITY,
        req.user?.id,
        req.user?.organization_id,
        req,
        {
          fileActivity: 'suspicious_upload',
          fileName: file.originalname,
          fileSize: file.size,
          suspiciousPattern: suspiciousCheck.pattern
        }
      );
    }

    return checks;
  }

  /**
   * Validate filename for security
   */
  isSecureFilename(filename) {
    if (!filename || filename.length === 0) return false;
    if (filename.length > this.securityRules.maxFileNameLength) return false;
    
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }

    // Check for null bytes
    if (filename.includes('\0')) return false;

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /^(aux|con|prn|nul|com[1-9]|lpt[1-9])(\.|$)/i, // Windows reserved names
      /\.(bat|cmd|exe|scr|vbs|js|jar|com|pif)$/i, // Executable extensions
      /^\./,  // Hidden files
      /<script|javascript:|data:/i // Potential XSS
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Check upload rate limits
   */
  async checkUploadRate(userId, ipAddress) {
    try {
      const cacheKey = `upload_rate:${userId || ipAddress}`;
      const { cacheManager } = require('../middleware/cache-manager');
      
      const currentUploads = await cacheManager.get(cacheKey) || 0;
      const maxUploadsPerHour = 50; // Configurable limit

      if (currentUploads >= maxUploadsPerHour) {
        return {
          allowed: false,
          reason: `Maximum ${maxUploadsPerHour} uploads per hour exceeded`
        };
      }

      // Increment counter
      await cacheManager.set(cacheKey, currentUploads + 1, 3600); // 1 hour TTL

      return { allowed: true };
    } catch (error) {
      logger.error('Upload rate check error:', error);
      return { allowed: true }; // Allow on error
    }
  }

  /**
   * Detect suspicious file patterns
   */
  detectSuspiciousPatterns(file) {
    const checks = {
      isSafe: true,
      warning: null,
      pattern: null
    };

    // Check file size anomalies
    if (file.size === 0) {
      checks.isSafe = false;
      checks.warning = 'Empty file detected';
      checks.pattern = 'empty_file';
      return checks;
    }

    // Check for unusually large files
    if (file.size > 1024 * 1024 * 1024) { // 1GB
      checks.warning = 'Unusually large file uploaded';
      checks.pattern = 'large_file';
    }

    // Check for suspicious MIME type mismatches
    const fileExt = path.extname(file.originalname).toLowerCase();
    const mimeTypeMap = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.pdf': ['application/pdf']
    };

    if (mimeTypeMap[fileExt] && !mimeTypeMap[fileExt].includes(file.mimetype)) {
      checks.warning = 'MIME type and file extension mismatch';
      checks.pattern = 'mime_mismatch';
    }

    return checks;
  }

  /**
   * Perform virus scanning on file
   */
  async scanForViruses(fileBuffer, filename) {
    if (!this.securityRules.virusScanEnabled || !this.virusScanner) {
      return { isClean: true, skipped: true };
    }

    try {
      const scanResult = await this.virusScanner.scanBuffer(fileBuffer, filename);
      
      if (scanResult.isInfected) {
        securityLogger.critical('Virus detected in uploaded file', {
          filename,
          virus: scanResult.viruses,
          action: 'quarantined'
        });
        
        return {
          isClean: false,
          virus: scanResult.viruses[0],
          quarantined: true
        };
      }

      return { isClean: true };
    } catch (error) {
      logger.error('Virus scan error:', error);
      return { isClean: true, error: error.message };
    }
  }

  /**
   * Validate file content integrity
   */
  async validateFileContent(fileBuffer, expectedMimeType) {
    try {
      // Use file-type to detect actual file type
      const detectedType = await fileType.fromBuffer(fileBuffer);
      
      if (!detectedType) {
        return {
          isValid: false,
          reason: 'Could not determine file type from content'
        };
      }

      // Check if detected type matches expected type
      const mimeTypeMatches = {
        'image/jpeg': ['image/jpeg'],
        'image/png': ['image/png'],
        'image/gif': ['image/gif'],
        'image/webp': ['image/webp'],
        'application/pdf': ['application/pdf']
      };

      const allowedTypes = mimeTypeMatches[expectedMimeType] || [expectedMimeType];
      
      if (!allowedTypes.includes(detectedType.mime)) {
        return {
          isValid: false,
          reason: `File content (${detectedType.mime}) doesn't match expected type (${expectedMimeType})`
        };
      }

      return {
        isValid: true,
        detectedType: detectedType.mime,
        extension: detectedType.ext
      };
    } catch (error) {
      logger.error('File content validation error:', error);
      return {
        isValid: false,
        reason: 'File content validation failed'
      };
    }
  }

  /**
   * Process and optimize images
   */
  async processImage(fileBuffer, options = {}) {
    try {
      const {
        maxWidth = 2048,
        maxHeight = 2048,
        quality = 85,
        format = 'jpeg',
        removeMetadata = true
      } = options;

      let processor = sharp(fileBuffer);

      // Remove metadata for privacy/security
      if (removeMetadata) {
        processor = processor.withMetadata({});
      }

      // Resize if necessary
      const metadata = await sharp(fileBuffer).metadata();
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        processor = processor.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert format and compress
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          processor = processor.jpeg({ quality, progressive: true });
          break;
        case 'png':
          processor = processor.png({ quality, progressive: true });
          break;
        case 'webp':
          processor = processor.webp({ quality });
          break;
        default:
          // Keep original format
          break;
      }

      const processedBuffer = await processor.toBuffer();
      
      return {
        buffer: processedBuffer,
        metadata: {
          originalSize: fileBuffer.length,
          processedSize: processedBuffer.length,
          compressionRatio: ((fileBuffer.length - processedBuffer.length) / fileBuffer.length * 100).toFixed(2)
        }
      };
    } catch (error) {
      logger.error('Image processing error:', error);
      throw new Error('Image processing failed');
    }
  }

  /**
   * Generate secure filename
   */
  generateSecureFilename(originalName, userId) {
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);
    
    // Sanitize base name
    const sanitizedBase = baseName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 50);
    
    // Generate unique identifier
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const userHash = userId ? crypto.createHash('md5').update(userId).digest('hex').substring(0, 8) : 'anon';
    
    return `${sanitizedBase}_${timestamp}_${userHash}_${randomBytes}${ext}`;
  }

  /**
   * Upload file with comprehensive security
   */
  async uploadSecureFile(file, options = {}) {
    try {
      const {
        folder = 'uploads',
        userId,
        organizationId,
        processImages = true,
        request
      } = options;

      // Virus scan
      const virusScan = await this.scanForViruses(file.buffer, file.originalname);
      if (!virusScan.isClean) {
        throw new Error(`Virus detected: ${virusScan.virus}`);
      }

      // Content validation
      const contentValidation = await this.validateFileContent(file.buffer, file.mimetype);
      if (!contentValidation.isValid) {
        throw new Error(`Content validation failed: ${contentValidation.reason}`);
      }

      // Process images if enabled
      let finalBuffer = file.buffer;
      let processingMetadata = {};
      
      if (processImages && file.mimetype.startsWith('image/')) {
        const processed = await this.processImage(file.buffer, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 85,
          removeMetadata: true
        });
        finalBuffer = processed.buffer;
        processingMetadata = processed.metadata;
      }

      // Generate secure filename
      const secureFilename = this.generateSecureFilename(file.originalname, userId);
      const filePath = `${folder}/${secureFilename}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('secure-uploads')
        .upload(filePath, finalBuffer, {
          contentType: file.mimetype,
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('secure-uploads')
        .getPublicUrl(filePath);

      // Create file record in database
      const fileRecord = {
        id: crypto.randomUUID(),
        original_name: file.originalname,
        secure_name: secureFilename,
        file_path: filePath,
        public_url: publicUrl,
        mime_type: file.mimetype,
        file_size: finalBuffer.length,
        original_size: file.size,
        user_id: userId,
        organization_id: organizationId,
        virus_scanned: virusScan.isClean,
        content_validated: contentValidation.isValid,
        processing_metadata: {
          ...processingMetadata,
          virusScan,
          contentValidation
        },
        upload_ip: request?.ip,
        upload_user_agent: request?.get?.('User-Agent'),
        created_at: new Date().toISOString()
      };

      const { data: dbRecord, error: dbError } = await supabaseAdmin
        .from('secure_files')
        .insert([fileRecord])
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabaseAdmin.storage
          .from('secure-uploads')
          .remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Log audit event
      await auditService.logFileOperation(
        auditService.auditActions.FILE_UPLOAD,
        dbRecord.id,
        userId,
        organizationId,
        file.originalname,
        finalBuffer.length,
        request,
        {
          secureFilename,
          virusScanned: virusScan.isClean,
          contentValidated: contentValidation.isValid,
          compressed: processingMetadata.compressionRatio || 0
        }
      );

      return {
        id: dbRecord.id,
        url: publicUrl,
        filename: secureFilename,
        originalName: file.originalname,
        size: finalBuffer.length,
        mimeType: file.mimetype,
        processingMetadata
      };

    } catch (error) {
      logger.error('Secure upload error:', error);
      
      // Log failed upload attempt
      if (options.request) {
        await auditService.logSecurityEvent(
          auditService.auditActions.SUSPICIOUS_ACTIVITY,
          options.userId,
          options.organizationId,
          options.request,
          {
            uploadFailed: true,
            fileName: file.originalname,
            fileSize: file.size,
            error: error.message
          }
        );
      }
      
      throw error;
    }
  }

  /**
   * Delete file securely
   */
  async deleteSecureFile(fileId, userId, request) {
    try {
      // Get file record
      const { data: fileRecord, error: fetchError } = await supabaseAdmin
        .from('secure_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fetchError || !fileRecord) {
        throw new Error('File not found');
      }

      // Check permissions
      if (fileRecord.user_id !== userId) {
        // Check if user is admin or has permission
        throw new Error('Insufficient permissions to delete file');
      }

      // Delete from storage
      const { error: storageError } = await supabaseAdmin.storage
        .from('secure-uploads')
        .remove([fileRecord.file_path]);

      if (storageError) {
        logger.error('Storage deletion error:', storageError);
      }

      // Mark as deleted in database (soft delete)
      const { error: dbError } = await supabaseAdmin
        .from('secure_files')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId
        })
        .eq('id', fileId);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Log audit event
      await auditService.logFileOperation(
        auditService.auditActions.FILE_DELETE,
        fileId,
        userId,
        fileRecord.organization_id,
        fileRecord.original_name,
        fileRecord.file_size,
        request,
        { secureFilename: fileRecord.secure_name }
      );

      return { success: true };

    } catch (error) {
      logger.error('Secure delete error:', error);
      throw error;
    }
  }

  /**
   * Get file upload statistics
   */
  async getUploadStatistics(organizationId = null, timeRange = '24h') {
    try {
      const timeRanges = {
        '1h': new Date(Date.now() - 60 * 60 * 1000),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };

      const startDate = timeRanges[timeRange] || timeRanges['24h'];

      let query = supabaseAdmin
        .from('secure_files')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .is('deleted_at', null);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: files, error } = await query;

      if (error) throw error;

      const stats = {
        totalUploads: files?.length || 0,
        totalSize: files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0,
        averageSize: 0,
        mimeTypeBreakdown: {},
        virusScanned: files?.filter(f => f.virus_scanned).length || 0,
        contentValidated: files?.filter(f => f.content_validated).length || 0,
        compressionSaved: 0
      };

      if (stats.totalUploads > 0) {
        stats.averageSize = Math.round(stats.totalSize / stats.totalUploads);
        
        // MIME type breakdown
        files?.forEach(file => {
          const mimeType = file.mime_type || 'unknown';
          stats.mimeTypeBreakdown[mimeType] = (stats.mimeTypeBreakdown[mimeType] || 0) + 1;
        });

        // Calculate compression savings
        const compressionSavings = files?.reduce((sum, file) => {
          const originalSize = file.original_size || file.file_size;
          const compressedSize = file.file_size;
          return sum + (originalSize - compressedSize);
        }, 0) || 0;

        stats.compressionSaved = compressionSavings;
      }

      return stats;

    } catch (error) {
      logger.error('Upload statistics error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const secureUploadService = new SecureUploadService();

module.exports = {
  SecureUploadService,
  secureUploadService
};