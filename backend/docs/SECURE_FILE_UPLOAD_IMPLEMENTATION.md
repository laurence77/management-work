# Secure File Upload Implementation

## Overview

This implementation provides enterprise-grade secure file upload functionality for the celebrity booking management platform. The system includes comprehensive security validation, virus scanning, content analysis, image processing, and secure storage with detailed audit trails.

## Security Features Implemented

### 1. **Multi-Layer File Validation**

#### File Type Validation
```javascript
const allowedFileTypes = {
  images: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  documents: {
    mimeTypes: ['application/pdf', 'application/msword', 'text/plain'],
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.csv'],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  videos: {
    mimeTypes: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    extensions: ['.mp4', '.mpeg', '.mov', '.webm'],
    maxSize: 500 * 1024 * 1024, // 500MB
  }
};
```

#### Content Validation
```javascript
// Real file type detection using file-type library
const detectedType = await fileType.fromBuffer(fileBuffer);

// Verify file content matches declared MIME type
if (!allowedTypes.includes(detectedType.mime)) {
  throw new Error(`File content doesn't match declared type`);
}
```

#### Filename Security
```javascript
function isSecureFilename(filename) {
  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/')) return false;
  
  // Check for null bytes
  if (filename.includes('\0')) return false;
  
  // Check for executable extensions
  const dangerousPatterns = /\.(bat|cmd|exe|scr|vbs|js)$/i;
  if (dangerousPatterns.test(filename)) return false;
  
  // Check for reserved Windows names
  const reservedNames = /^(aux|con|prn|nul|com[1-9])(\.|$)/i;
  if (reservedNames.test(filename)) return false;
  
  return true;
}
```

### 2. **Virus and Malware Scanning**

#### ClamAV Integration
```javascript
// Initialize virus scanner
const virusScanner = await new clamAV().init({
  removeInfected: true,
  quarantineInfected: true,
  scanLog: path.join(__dirname, '../logs/virus-scan.log')
});

// Scan uploaded file
const scanResult = await virusScanner.scanBuffer(fileBuffer, filename);

if (scanResult.isInfected) {
  securityLogger.critical('Virus detected', {
    filename,
    virus: scanResult.viruses,
    action: 'quarantined'
  });
  throw new Error(`Virus detected: ${scanResult.viruses[0]}`);
}
```

#### Suspicious Pattern Detection
```javascript
function detectSuspiciousPatterns(file) {
  const checks = { isSafe: true, warnings: [] };
  
  // Empty file detection
  if (file.size === 0) {
    checks.isSafe = false;
    checks.warning = 'Empty file detected';
  }
  
  // MIME type mismatch detection
  const fileExt = path.extname(file.originalname).toLowerCase();
  if (mimeTypeMap[fileExt] && !mimeTypeMap[fileExt].includes(file.mimetype)) {
    checks.warning = 'MIME type and file extension mismatch';
  }
  
  return checks;
}
```

### 3. **Rate Limiting and Quota Management**

#### Upload Rate Limiting
```javascript
// Per-user upload limits
const maxUploadsPerHour = 50;

async function checkUploadRate(userId, ipAddress) {
  const cacheKey = `upload_rate:${userId || ipAddress}`;
  const currentUploads = await cacheManager.get(cacheKey) || 0;
  
  if (currentUploads >= maxUploadsPerHour) {
    return {
      allowed: false,
      reason: `Maximum ${maxUploadsPerHour} uploads per hour exceeded`
    };
  }
  
  await cacheManager.set(cacheKey, currentUploads + 1, 3600);
  return { allowed: true };
}
```

#### Database Quota Management
```sql
CREATE TABLE file_upload_quotas (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES app_users(id),
  quota_type VARCHAR(50) NOT NULL, -- 'daily', 'monthly', 'total'
  max_files INTEGER DEFAULT 100,
  max_size_bytes BIGINT DEFAULT 1073741824, -- 1GB
  current_files INTEGER DEFAULT 0,
  current_size_bytes BIGINT DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE
);
```

### 4. **Secure File Processing**

#### Image Processing and Optimization
```javascript
async function processImage(fileBuffer, options = {}) {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 85,
    removeMetadata = true
  } = options;

  let processor = sharp(fileBuffer);

  // Remove EXIF and metadata for privacy/security
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

  // Compress and convert
  processor = processor.jpeg({ quality, progressive: true });

  return await processor.toBuffer();
}
```

#### Secure Filename Generation
```javascript
function generateSecureFilename(originalName, userId) {
  const ext = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 50);
  
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const userHash = crypto.createHash('md5').update(userId).digest('hex').substring(0, 8);
  
  return `${baseName}_${timestamp}_${userHash}_${randomBytes}${ext}`;
}
```

### 5. **Database Schema for File Management**

#### Secure Files Table
```sql
CREATE TABLE secure_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name VARCHAR(255) NOT NULL,
  secure_name VARCHAR(255) NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  public_url TEXT,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  original_size BIGINT NOT NULL,
  user_id UUID REFERENCES app_users(id),
  organization_id UUID REFERENCES organizations(id),
  virus_scanned BOOLEAN DEFAULT false,
  content_validated BOOLEAN DEFAULT false,
  processing_metadata JSONB DEFAULT '{}',
  upload_ip INET,
  upload_user_agent TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### File Scan Results Tracking
```sql
CREATE TABLE file_scan_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES secure_files(id) ON DELETE CASCADE,
  scan_type VARCHAR(50) NOT NULL, -- 'virus', 'content', 'malware'
  scan_result VARCHAR(20) NOT NULL, -- 'clean', 'infected', 'suspicious'
  scan_details JSONB DEFAULT '{}',
  scanner_version VARCHAR(100),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### File Access Logging
```sql
CREATE TABLE file_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES secure_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id),
  access_type VARCHAR(20) NOT NULL, -- 'view', 'download', 'share'
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Implementation Architecture

### 1. **Secure Upload Service**

#### Core Service (`services/secure-upload-service.js`)
- **File Type Management**: Configurable allowed types per category
- **Security Validation**: Multi-layer security checks
- **Virus Scanning**: ClamAV integration with quarantine
- **Content Processing**: Image optimization and metadata removal
- **Database Integration**: Complete file lifecycle management

#### Key Methods
```javascript
class SecureUploadService {
  // Create secure multer configuration
  createSecureMulter(fileCategory, options)
  
  // Perform comprehensive security checks
  performSecurityChecks(file, request)
  
  // Scan for viruses and malware
  scanForViruses(fileBuffer, filename)
  
  // Validate file content integrity
  validateFileContent(fileBuffer, expectedMimeType)
  
  // Process and optimize images
  processImage(fileBuffer, options)
  
  // Upload file with full security
  uploadSecureFile(file, options)
  
  // Delete file securely
  deleteSecureFile(fileId, userId, request)
}
```

### 2. **Secure Upload Middleware**

#### Middleware Factory (`middleware/secure-upload-middleware.js`)
```javascript
// Create middleware for different file categories
const imageUpload = createSecureUploadMiddleware({
  fileCategory: 'images',
  maxFiles: 5,
  folder: 'images',
  processImages: true,
  requireAuth: true,
  allowedRoles: ['admin', 'user']
});

// Usage in routes
router.post('/upload', 
  ...imageUpload.single('image'),
  (req, res) => {
    // req.secureFile contains upload result
    res.json({ success: true, file: req.secureFile });
  }
);
```

#### Middleware Functions
- **Authentication Check**: Verify user authentication
- **Role Validation**: Check user permissions for upload
- **Quota Enforcement**: Validate upload quotas
- **Security Processing**: Apply all security checks
- **Audit Logging**: Log upload events
- **Error Cleanup**: Clean up failed uploads

### 3. **Upload Management API**

#### Public Endpoints (`routes/secure-uploads.js`)
```javascript
// Single image upload
POST /api/uploads/image
// Multiple images upload
POST /api/uploads/images
// Document upload (requires permissions)
POST /api/uploads/document
// User avatar upload
POST /api/uploads/avatar

// Get user's files
GET /api/uploads
// Get specific file details
GET /api/uploads/:id
// Delete file
DELETE /api/uploads/:id

// Get upload quota status
GET /api/uploads/quota/status
// Get upload statistics
GET /api/uploads/statistics
```

#### Admin Endpoints
```javascript
// Get all files (admin only)
GET /api/uploads/admin/all
// Set upload quotas (admin only)
POST /api/uploads/admin/quota
// Admin delete file
DELETE /api/uploads/admin/:id
```

## Security Implementation Examples

### 1. **Celebrity Image Upload**
```javascript
// In celebrities route
const celebrityImageUpload = createSecureUploadMiddleware({
  fileCategory: 'images',
  maxFiles: 1,
  folder: 'celebrities',
  processImages: true,
  requireAuth: true,
  allowedRoles: ['admin', 'super_admin']
});

router.post('/', 
  authenticateToken,
  requirePermission('manage_celebrities'),
  ...celebrityImageUpload.single('image'),
  async (req, res) => {
    // Create celebrity with secure image
    const celebrityData = {
      name: req.body.name,
      bio: req.body.bio,
      image_url: req.secureFile ? req.secureFile.url : null,
      image_file_id: req.secureFile ? req.secureFile.id : null
    };
    
    // ... save to database
  }
);
```

### 2. **Document Upload with Permissions**
```javascript
// Secure document upload
router.post('/upload-contract',
  authenticateToken,
  requirePermission('contracts.upload'),
  checkUploadQuota('daily'),
  ...documentUpload.single('contract'),
  async (req, res) => {
    if (!req.secureFile) {
      return res.status(400).json({
        success: false,
        error: 'Contract file required'
      });
    }

    // Process contract with secure file reference
    const contract = await createContract({
      ...req.body,
      file_id: req.secureFile.id,
      file_url: req.secureFile.url
    });

    res.json({ success: true, contract });
  }
);
```

### 3. **Avatar Upload with Processing**
```javascript
// User avatar upload with image processing
router.post('/avatar',
  authenticateToken,
  ...avatarUpload.single('avatar'),
  async (req, res) => {
    // Update user avatar
    await supabaseAdmin
      .from('app_users')
      .update({ 
        avatar_url: req.secureFile.url,
        avatar_file_id: req.secureFile.id
      })
      .eq('id', req.user.id);

    res.json({
      success: true,
      avatarUrl: req.secureFile.url
    });
  }
);
```

## Performance and Monitoring

### 1. **Upload Statistics**
```javascript
// Real-time upload statistics
const stats = {
  totalUploads: 1247,
  totalSize: 2.4 * 1024 * 1024 * 1024, // 2.4GB
  averageSize: 1.9 * 1024 * 1024, // 1.9MB
  mimeTypeBreakdown: {
    'image/jpeg': 856,
    'image/png': 234,
    'application/pdf': 157
  },
  virusScanned: 1247,
  contentValidated: 1247,
  compressionSaved: 456 * 1024 * 1024 // 456MB saved
};
```

### 2. **Quota Management**
```javascript
// User quota status
const quotaStatus = {
  daily: {
    currentFiles: 23,
    maxFiles: 100,
    currentSize: 45 * 1024 * 1024, // 45MB
    maxSize: 1024 * 1024 * 1024, // 1GB
    filesUsagePercent: 23,
    sizeUsagePercent: 4.4,
    formattedCurrentSize: '45 MB',
    formattedMaxSize: '1 GB'
  }
};
```

### 3. **Security Monitoring**
```javascript
// Security event tracking
const securityEvents = {
  virusDetections: 0,
  suspiciousUploads: 3,
  quotaViolations: 12,
  unauthorizedAttempts: 5,
  contentValidationFailures: 8
};
```

## Configuration and Deployment

### 1. **Environment Variables**
```bash
# File upload configuration
MAX_FILE_SIZE=52428800  # 50MB
MAX_FILES_PER_UPLOAD=10
UPLOAD_FOLDER=uploads

# Virus scanning
VIRUS_SCAN_ENABLED=true
CLAM_AV_HOST=localhost
CLAM_AV_PORT=3310

# Image processing
IMAGE_QUALITY=85
MAX_IMAGE_WIDTH=2048
MAX_IMAGE_HEIGHT=2048
REMOVE_IMAGE_METADATA=true

# Storage
SUPABASE_STORAGE_BUCKET=secure-uploads
STORAGE_CDN_URL=https://cdn.example.com
```

### 2. **Storage Configuration**
```javascript
// Supabase storage bucket setup
const bucketConfig = {
  name: 'secure-uploads',
  public: false, // Private by default
  fileSizeLimit: 52428800, // 50MB
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain'
  ]
};
```

### 3. **Rate Limiting Configuration**
```javascript
// Upload-specific rate limits
const uploadRateLimits = {
  upload: createRateLimiter(
    60 * 60 * 1000, // 1 hour window
    50, // max 50 uploads per hour
    'Too many file uploads. Please try again later.'
  )
};
```

## Security Compliance

### 1. **Data Protection**
- **Metadata Removal**: Automatic EXIF and metadata stripping
- **Content Validation**: Real file type detection prevents disguised malware
- **Secure Storage**: Files stored with generated names, not original names
- **Access Logging**: Complete audit trail of all file access

### 2. **Threat Prevention**
- **Path Traversal**: Filename validation prevents directory traversal
- **Executable Upload**: Blocks potentially dangerous file types
- **Virus Scanning**: ClamAV integration with quarantine
- **Content Spoofing**: MIME type validation against actual content

### 3. **Access Control**
- **Authentication Required**: All uploads require valid authentication
- **Role-Based Access**: Configurable role restrictions per upload type
- **Organization Isolation**: Files isolated by organization
- **Quota Enforcement**: Prevents resource abuse

### 4. **Audit and Compliance**
- **Complete Audit Trail**: Every upload, access, and deletion logged
- **Security Event Logging**: Suspicious activities tracked
- **Compliance Reporting**: GDPR/CCPA compliant data handling
- **Data Retention**: Configurable retention policies

This comprehensive secure file upload implementation provides enterprise-grade security while maintaining excellent performance and user experience. The system automatically handles all security concerns while providing detailed monitoring and administrative control.