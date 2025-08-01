const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

/**
 * Image Optimization and CDN Integration Service
 * Handles image processing, optimization, and CDN upload
 */

class ImageOptimizationService {
  constructor() {
    this.optimizedDir = path.join(__dirname, '../uploads/optimized');
    this.thumbnailDir = path.join(__dirname, '../uploads/thumbnails');
    this.webpDir = path.join(__dirname, '../uploads/webp');
    
    this.setupDirectories();
    this.configureCDN();
    
    // Image optimization settings
    this.settings = {
      jpeg: {
        quality: 85,
        progressive: true,
        mozjpeg: true
      },
      webp: {
        quality: 80,
        effort: 4
      },
      png: {
        compressionLevel: 8,
        adaptiveFiltering: true
      },
      thumbnail: {
        width: 300,
        height: 300,
        fit: 'cover'
      },
      maxWidth: 1920,
      maxHeight: 1080
    };
  }
  
  async setupDirectories() {
    const dirs = [this.optimizedDir, this.thumbnailDir, this.webpDir];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${path.basename(dir)}`);
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    }
  }
  
  configureCDN() {
    // Cloudinary configuration
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      
      console.log('☁️ Cloudinary CDN configured');
      this.cdnEnabled = true;
    } else {
      console.log('💾 CDN not configured, using local storage');
      this.cdnEnabled = false;
    }
  }
  
  // Generate unique filename
  generateFilename(originalName, suffix = '') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    
    return `${name}_${timestamp}_${random}${suffix}${ext}`;
  }
  
  // Get image metadata
  async getImageMetadata(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      return null;
    }
  }
  
  // Optimize single image
  async optimizeImage(inputPath, outputPath, options = {}) {
    try {
      const metadata = await this.getImageMetadata(inputPath);
      if (!metadata) {
        throw new Error('Could not read image metadata');
      }
      
      let pipeline = sharp(inputPath);
      
      // Auto-orient image
      pipeline = pipeline.rotate();
      
      // Resize if image is too large
      const maxWidth = options.maxWidth || this.settings.maxWidth;
      const maxHeight = options.maxHeight || this.settings.maxHeight;
      
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Apply format-specific optimizations
      const outputExt = path.extname(outputPath).toLowerCase();
      
      switch (outputExt) {
        case '.jpg':
        case '.jpeg':
          pipeline = pipeline.jpeg({
            quality: options.quality || this.settings.jpeg.quality,
            progressive: this.settings.jpeg.progressive,
            mozjpeg: this.settings.jpeg.mozjpeg
          });
          break;
          
        case '.webp':
          pipeline = pipeline.webp({
            quality: options.quality || this.settings.webp.quality,
            effort: this.settings.webp.effort
          });
          break;
          
        case '.png':
          pipeline = pipeline.png({
            compressionLevel: this.settings.png.compressionLevel,
            adaptiveFiltering: this.settings.png.adaptiveFiltering
          });
          break;
          
        default:
          // Keep original format
          break;
      }
      
      // Write optimized image
      await pipeline.toFile(outputPath);
      
      // Get optimized file stats
      const stats = await fs.stat(outputPath);
      const originalStats = await fs.stat(inputPath);
      
      const savings = ((originalStats.size - stats.size) / originalStats.size * 100).toFixed(1);
      
      console.log(`✨ Optimized ${path.basename(inputPath)} - ${savings}% size reduction`);
      
      return {
        originalSize: originalStats.size,
        optimizedSize: stats.size,
        savings: `${savings}%`,
        outputPath
      };
      
    } catch (error) {
      console.error('Image optimization error:', error);
      throw error;
    }
  }
  
  // Generate thumbnail
  async generateThumbnail(inputPath, outputPath, options = {}) {
    try {
      const width = options.width || this.settings.thumbnail.width;
      const height = options.height || this.settings.thumbnail.height;
      const fit = options.fit || this.settings.thumbnail.fit;
      
      await sharp(inputPath)
        .resize(width, height, { fit, withoutEnlargement: false })
        .jpeg({ quality: 80, progressive: true })
        .toFile(outputPath);
      
      console.log(`🖼️ Generated thumbnail: ${path.basename(outputPath)}`);
      
      return outputPath;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw error;
    }
  }
  
  // Generate WebP version
  async generateWebP(inputPath, outputPath, options = {}) {
    try {
      const quality = options.quality || this.settings.webp.quality;
      
      await sharp(inputPath)
        .webp({ quality, effort: this.settings.webp.effort })
        .toFile(outputPath);
      
      console.log(`🌐 Generated WebP: ${path.basename(outputPath)}`);
      
      return outputPath;
    } catch (error) {
      console.error('WebP generation error:', error);
      throw error;
    }
  }
  
  // Process uploaded image (full optimization pipeline)
  async processUploadedImage(filePath, filename) {
    try {
      console.log(`🔄 Processing image: ${filename}`);
      
      const results = {
        original: filePath,
        optimized: null,
        thumbnail: null,
        webp: null,
        cdn: {},
        metadata: null
      };
      
      // Get metadata
      results.metadata = await this.getImageMetadata(filePath);
      
      // Generate file paths
      const baseName = path.parse(filename).name;
      const optimizedPath = path.join(this.optimizedDir, this.generateFilename(filename, '_opt'));
      const thumbnailPath = path.join(this.thumbnailDir, this.generateFilename(filename, '_thumb'));
      const webpPath = path.join(this.webpDir, this.generateFilename(filename, '_webp').replace(/\.[^.]+$/, '.webp'));
      
      // Optimize original image
      const optimizationResult = await this.optimizeImage(filePath, optimizedPath);
      results.optimized = optimizedPath;
      results.optimizationStats = optimizationResult;
      
      // Generate thumbnail
      results.thumbnail = await this.generateThumbnail(optimizedPath, thumbnailPath);
      
      // Generate WebP version
      results.webp = await this.generateWebP(optimizedPath, webpPath);
      
      // Upload to CDN if enabled
      if (this.cdnEnabled) {
        results.cdn = await this.uploadToCDN(results, baseName);
      }
      
      console.log(`✅ Image processing complete: ${filename}`);
      
      return results;
      
    } catch (error) {
      console.error(`Image processing failed for ${filename}:`, error);
      throw error;
    }
  }
  
  // Upload images to CDN
  async uploadToCDN(imageResults, baseName) {
    try {
      const cdnResults = {};
      
      // Upload optimized image
      if (imageResults.optimized) {
        const optimizedUpload = await cloudinary.uploader.upload(imageResults.optimized, {
          public_id: `celebrities/${baseName}_optimized`,
          folder: 'celebrity-booking',
          resource_type: 'image',
          overwrite: true,
          transformation: [
            { quality: 'auto', fetch_format: 'auto' }
          ]
        });
        
        cdnResults.optimized = {
          url: optimizedUpload.secure_url,
          publicId: optimizedUpload.public_id,
          format: optimizedUpload.format,
          width: optimizedUpload.width,
          height: optimizedUpload.height,
          bytes: optimizedUpload.bytes
        };
      }
      
      // Upload thumbnail
      if (imageResults.thumbnail) {
        const thumbnailUpload = await cloudinary.uploader.upload(imageResults.thumbnail, {
          public_id: `celebrities/${baseName}_thumbnail`,
          folder: 'celebrity-booking/thumbnails',
          resource_type: 'image',
          overwrite: true
        });
        
        cdnResults.thumbnail = {
          url: thumbnailUpload.secure_url,
          publicId: thumbnailUpload.public_id
        };
      }
      
      // Upload WebP version
      if (imageResults.webp) {
        const webpUpload = await cloudinary.uploader.upload(imageResults.webp, {
          public_id: `celebrities/${baseName}_webp`,
          folder: 'celebrity-booking/webp',
          resource_type: 'image',
          overwrite: true
        });
        
        cdnResults.webp = {
          url: webpUpload.secure_url,
          publicId: webpUpload.public_id
        };
      }
      
      console.log(`☁️ Uploaded ${baseName} to CDN`);
      
      return cdnResults;
      
    } catch (error) {
      console.error('CDN upload error:', error);
      return { error: error.message };
    }
  }
  
  // Generate responsive image URLs
  generateResponsiveUrls(baseUrl, publicId) {
    if (!this.cdnEnabled || !publicId) {
      return { original: baseUrl };
    }
    
    const baseTransform = 'f_auto,q_auto';
    const sizes = [320, 640, 768, 1024, 1280, 1600];
    
    const urls = {
      original: baseUrl,
      responsive: {}
    };
    
    sizes.forEach(width => {
      urls.responsive[`w${width}`] = cloudinary.url(publicId, {
        transformation: `${baseTransform},w_${width}`
      });
    });
    
    return urls;
  }
  
  // Delete image from CDN
  async deleteFromCDN(publicId) {
    if (!this.cdnEnabled || !publicId) {
      return false;
    }
    
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`🗑️ Deleted ${publicId} from CDN`);
      return true;
    } catch (error) {
      console.error('CDN deletion error:', error);
      return false;
    }
  }
  
  // Batch process images
  async batchProcessImages(files) {
    console.log(`🔄 Starting batch processing of ${files.length} images`);
    
    const results = [];
    const batchSize = 3; // Process 3 images at a time to avoid overwhelming the system
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          return await this.processUploadedImage(file.path, file.filename);
        } catch (error) {
          console.error(`Batch processing error for ${file.filename}:`, error);
          return { error: error.message, filename: file.filename };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`);
    }
    
    console.log(`🎉 Batch processing complete: ${results.length} images processed`);
    
    return results;
  }
  
  // Clean up old files
  async cleanupOldFiles(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const dirs = [this.optimizedDir, this.thumbnailDir, this.webpDir];
      let deletedCount = 0;
      
      for (const dir of dirs) {
        try {
          const files = await fs.readdir(dir);
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);
            
            if (Date.now() - stats.mtime.getTime() > maxAge) {
              await fs.unlink(filePath);
              deletedCount++;
            }
          }
        } catch (error) {
          console.error(`Error cleaning directory ${dir}:`, error);
        }
      }
      
      console.log(`🧹 Cleaned up ${deletedCount} old image files`);
      
      return deletedCount;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }
  
  // Get service statistics
  getStats() {
    return {
      cdnEnabled: this.cdnEnabled,
      directories: {
        optimized: this.optimizedDir,
        thumbnails: this.thumbnailDir,
        webp: this.webpDir
      },
      settings: this.settings
    };
  }
  
  // Health check
  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        sharp: true,
        directories: true,
        cdn: this.cdnEnabled
      };
      
      // Test Sharp
      try {
        await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 3,
            background: { r: 255, g: 255, b: 255 }
          }
        }).png().toBuffer();
      } catch (error) {
        health.sharp = false;
        health.status = 'degraded';
      }
      
      // Test directories
      try {
        await fs.access(this.optimizedDir);
        await fs.access(this.thumbnailDir);
        await fs.access(this.webpDir);
      } catch (error) {
        health.directories = false;
        health.status = 'degraded';
      }
      
      // Test CDN if enabled
      if (this.cdnEnabled) {
        try {
          await cloudinary.api.ping();
        } catch (error) {
          health.cdn = false;
          health.status = 'degraded';
        }
      }
      
      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Export singleton instance
const imageOptimizationService = new ImageOptimizationService();

module.exports = imageOptimizationService;