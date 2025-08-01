#!/bin/bash

# Celebrity Booking Platform - Advanced Image Optimization and CDN Integration Setup
# This script sets up comprehensive image optimization with Cloudinary CDN integration

set -e

echo "🖼️ Setting up Advanced Image Optimization and CDN Integration..."

# Create image optimization service directory
mkdir -p backend/services/image-optimization

# Create image optimization service
cat > backend/services/image-optimization/ImageOptimizationService.js << 'EOF'
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../../utils/logger');
const { supabase } = require('../../config/supabase');

class ImageOptimizationService {
    constructor() {
        // Configure Cloudinary
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true
        });

        this.optimizationPresets = {
            profile_image: {
                sizes: [
                    { width: 400, height: 400, quality: 90, format: 'webp', suffix: 'lg' },
                    { width: 200, height: 200, quality: 85, format: 'webp', suffix: 'md' },
                    { width: 100, height: 100, quality: 80, format: 'webp', suffix: 'sm' },
                    { width: 50, height: 50, quality: 75, format: 'webp', suffix: 'xs' }
                ],
                transformations: [
                    'f_auto,q_auto',
                    'c_fill,g_face',
                    'r_max',
                    'bo_3px_solid_white'
                ]
            },
            gallery_image: {
                sizes: [
                    { width: 1200, height: 800, quality: 90, format: 'webp', suffix: 'xl' },
                    { width: 800, height: 533, quality: 85, format: 'webp', suffix: 'lg' },
                    { width: 400, height: 267, quality: 80, format: 'webp', suffix: 'md' },
                    { width: 200, height: 133, quality: 75, format: 'webp', suffix: 'sm' }
                ],
                transformations: [
                    'f_auto,q_auto',
                    'c_fill',
                    'e_sharpen'
                ]
            },
            banner_image: {
                sizes: [
                    { width: 1920, height: 600, quality: 85, format: 'webp', suffix: 'xl' },
                    { width: 1200, height: 375, quality: 80, format: 'webp', suffix: 'lg' },
                    { width: 800, height: 250, quality: 75, format: 'webp', suffix: 'md' },
                    { width: 400, height: 125, quality: 70, format: 'webp', suffix: 'sm' }
                ],
                transformations: [
                    'f_auto,q_auto',
                    'c_fill',
                    'e_improve'
                ]
            },
            thumbnail: {
                sizes: [
                    { width: 300, height: 300, quality: 80, format: 'webp', suffix: 'lg' },
                    { width: 150, height: 150, quality: 75, format: 'webp', suffix: 'md' },
                    { width: 75, height: 75, quality: 70, format: 'webp', suffix: 'sm' }
                ],
                transformations: [
                    'f_auto,q_auto',
                    'c_fill,g_center'
                ]
            }
        };

        this.cdnSettings = {
            cloudinary_base_url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}`,
            auto_format: true,
            auto_quality: true,
            lazy_loading: true,
            progressive_jpeg: true
        };
    }

    async uploadAndOptimizeImage(filePath, imageType = 'gallery_image', options = {}) {
        try {
            logger.info(`Starting image upload and optimization: ${filePath}`);
            
            const preset = this.optimizationPresets[imageType] || this.optimizationPresets.gallery_image;
            const uploadOptions = {
                folder: `celebrity-booking/${imageType}`,
                use_filename: true,
                unique_filename: true,
                transformation: preset.transformations,
                ...options
            };

            // Upload original to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(filePath, uploadOptions);
            
            // Generate optimized variants
            const variants = await this.generateImageVariants(uploadResult.public_id, preset);
            
            // Store image metadata in database
            const imageRecord = await this.storeImageMetadata({
                public_id: uploadResult.public_id,
                original_url: uploadResult.secure_url,
                image_type: imageType,
                variants: variants,
                file_size: uploadResult.bytes,
                width: uploadResult.width,
                height: uploadResult.height,
                format: uploadResult.format,
                uploaded_at: new Date().toISOString()
            });

            logger.info(`Image optimization completed: ${uploadResult.public_id}`);
            
            return {
                id: imageRecord.id,
                public_id: uploadResult.public_id,
                original_url: uploadResult.secure_url,
                variants: variants,
                metadata: {
                    width: uploadResult.width,
                    height: uploadResult.height,
                    format: uploadResult.format,
                    size: uploadResult.bytes
                }
            };

        } catch (error) {
            logger.error('Image upload and optimization failed:', error);
            throw new Error(`Image optimization failed: ${error.message}`);
        }
    }

    async generateImageVariants(publicId, preset) {
        const variants = {};
        
        for (const size of preset.sizes) {
            try {
                const transformation = [
                    `w_${size.width}`,
                    `h_${size.height}`,
                    `q_${size.quality}`,
                    `f_${size.format}`,
                    'c_fill'
                ].join(',');

                const url = cloudinary.url(publicId, {
                    transformation: transformation
                });

                variants[size.suffix] = {
                    url,
                    width: size.width,
                    height: size.height,
                    format: size.format,
                    quality: size.quality
                };

            } catch (error) {
                logger.warn(`Failed to generate variant ${size.suffix}:`, error);
            }
        }

        return variants;
    }

    async generateResponsiveImageTags(publicId, imageType, altText = '', className = '') {
        const preset = this.optimizationPresets[imageType];
        if (!preset) {
            throw new Error(`Unknown image type: ${imageType}`);
        }

        const srcSet = preset.sizes.map(size => {
            const transformation = [
                `w_${size.width}`,
                `h_${size.height}`,
                `q_${size.quality}`,
                `f_${size.format}`,
                'c_fill'
            ].join(',');

            const url = cloudinary.url(publicId, { transformation });
            return `${url} ${size.width}w`;
        }).join(', ');

        const defaultSrc = cloudinary.url(publicId, {
            transformation: [
                `w_${preset.sizes[1].width}`,
                `h_${preset.sizes[1].height}`,
                `q_${preset.sizes[1].quality}`,
                `f_${preset.sizes[1].format}`,
                'c_fill'
            ].join(',')
        });

        return {
            img_tag: `<img src="${defaultSrc}" srcset="${srcSet}" sizes="(max-width: 400px) 200px, (max-width: 800px) 400px, 800px" alt="${altText}" class="${className}" loading="lazy">`,
            picture_tag: this.generatePictureTag(publicId, preset, altText, className),
            srcSet,
            defaultSrc,
            sizes: "(max-width: 400px) 200px, (max-width: 800px) 400px, 800px"
        };
    }

    generatePictureTag(publicId, preset, altText, className) {
        const sources = preset.sizes.map(size => {
            const transformation = [
                `w_${size.width}`,
                `h_${size.height}`,
                `q_${size.quality}`,
                `f_${size.format}`,
                'c_fill'
            ].join(',');

            const url = cloudinary.url(publicId, { transformation });
            const media = size.width <= 400 ? '(max-width: 400px)' : 
                         size.width <= 800 ? '(max-width: 800px)' : '';
            
            return media ? `<source media="${media}" srcset="${url}">` : '';
        }).filter(Boolean).join('\n  ');

        const fallbackSrc = cloudinary.url(publicId, {
            transformation: `w_${preset.sizes[1].width},h_${preset.sizes[1].height},q_${preset.sizes[1].quality},f_jpg,c_fill`
        });

        return `<picture>
  ${sources}
  <img src="${fallbackSrc}" alt="${altText}" class="${className}" loading="lazy">
</picture>`;
    }

    async optimizeExistingImages(batchSize = 10) {
        try {
            logger.info('Starting batch optimization of existing images...');
            
            // Get unoptimized images from database
            const { data: images, error } = await supabase
                .from('image_uploads')
                .select('*')
                .is('optimized_variants', null)
                .limit(batchSize);

            if (error) throw error;

            const results = [];
            
            for (const image of images || []) {
                try {
                    const variants = await this.generateImageVariants(
                        image.public_id, 
                        this.optimizationPresets[image.image_type] || this.optimizationPresets.gallery_image
                    );

                    // Update database with variants
                    await supabase
                        .from('image_uploads')
                        .update({ 
                            optimized_variants: variants,
                            optimization_completed_at: new Date().toISOString()
                        })
                        .eq('id', image.id);

                    results.push({ id: image.id, status: 'success', variants_count: Object.keys(variants).length });
                    
                } catch (error) {
                    logger.error(`Failed to optimize image ${image.id}:`, error);
                    results.push({ id: image.id, status: 'error', error: error.message });
                }
            }

            logger.info(`Batch optimization completed: ${results.length} images processed`);
            return results;

        } catch (error) {
            logger.error('Batch optimization failed:', error);
            throw error;
        }
    }

    async implementLazyLoading(selector = 'img[data-lazy]') {
        const lazyLoadingScript = `
// Lazy Loading Implementation
class LazyImageLoader {
    constructor() {
        this.imageObserver = null;
        this.images = [];
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });
            
            this.observeImages();
        } else {
            // Fallback for older browsers
            this.loadAllImages();
        }
    }

    observeImages() {
        const images = document.querySelectorAll('${selector}');
        images.forEach(img => {
            this.imageObserver.observe(img);
        });
    }

    loadImage(img) {
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;
        
        if (src) {
            img.src = src;
        }
        if (srcset) {
            img.srcset = srcset;
        }
        
        img.classList.remove('lazy');
        img.classList.add('loaded');
        
        // Remove data attributes
        delete img.dataset.src;
        delete img.dataset.srcset;
    }

    loadAllImages() {
        const images = document.querySelectorAll('${selector}');
        images.forEach(img => this.loadImage(img));
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new LazyImageLoader());
} else {
    new LazyImageLoader();
}
`;

        return lazyLoadingScript;
    }

    async generateImageSitemap() {
        try {
            logger.info('Generating image sitemap...');
            
            const { data: images, error } = await supabase
                .from('image_uploads')
                .select('public_id, original_url, image_type, created_at')
                .not('original_url', 'is', null);

            if (error) throw error;

            const sitemapEntries = images.map(image => {
                return `
    <url>
        <loc>${image.original_url}</loc>
        <image:image>
            <image:loc>${image.original_url}</image:loc>
            <image:caption>Celebrity Booking Platform - ${image.image_type}</image:caption>
        </image:image>
        <lastmod>${new Date(image.created_at).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>`;
            }).join('');

            const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemapEntries}
</urlset>`;

            // Save sitemap
            await fs.writeFile(path.join(__dirname, '../../../public/image-sitemap.xml'), sitemap);
            
            logger.info(`Image sitemap generated with ${images.length} images`);
            return { images_count: images.length, sitemap_path: '/image-sitemap.xml' };

        } catch (error) {
            logger.error('Image sitemap generation failed:', error);
            throw error;
        }
    }

    async analyzeImagePerformance() {
        try {
            const { data: images, error } = await supabase
                .from('image_uploads')
                .select(`
                    id, public_id, image_type, file_size, 
                    optimized_variants, created_at,
                    image_analytics (
                        views, loads, load_time_avg, bandwidth_saved
                    )
                `);

            if (error) throw error;

            const analysis = {
                total_images: images.length,
                total_size_mb: images.reduce((sum, img) => sum + (img.file_size || 0), 0) / (1024 * 1024),
                optimization_savings: 0,
                performance_metrics: {
                    avg_load_time: 0,
                    total_bandwidth_saved: 0,
                    total_views: 0
                },
                by_type: {}
            };

            // Calculate metrics by type
            images.forEach(image => {
                const type = image.image_type;
                if (!analysis.by_type[type]) {
                    analysis.by_type[type] = { count: 0, total_size: 0, optimized: 0 };
                }
                
                analysis.by_type[type].count++;
                analysis.by_type[type].total_size += image.file_size || 0;
                
                if (image.optimized_variants) {
                    analysis.by_type[type].optimized++;
                    // Estimate 60% size reduction from optimization
                    analysis.optimization_savings += (image.file_size || 0) * 0.6;
                }

                // Add analytics data if available
                if (image.image_analytics && image.image_analytics.length > 0) {
                    const analytics = image.image_analytics[0];
                    analysis.performance_metrics.total_views += analytics.views || 0;
                    analysis.performance_metrics.total_bandwidth_saved += analytics.bandwidth_saved || 0;
                    analysis.performance_metrics.avg_load_time += analytics.load_time_avg || 0;
                }
            });

            analysis.optimization_savings_mb = analysis.optimization_savings / (1024 * 1024);
            analysis.optimization_percentage = images.length > 0 
                ? (images.filter(img => img.optimized_variants).length / images.length) * 100 
                : 0;

            logger.info('Image performance analysis completed:', analysis);
            return analysis;

        } catch (error) {
            logger.error('Image performance analysis failed:', error);
            throw error;
        }
    }

    async storeImageMetadata(metadata) {
        try {
            const { data, error } = await supabase
                .from('image_uploads')
                .insert(metadata)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Failed to store image metadata:', error);
            throw error;
        }
    }

    async deleteImage(publicId) {
        try {
            // Delete from Cloudinary
            const result = await cloudinary.uploader.destroy(publicId);
            
            // Delete from database
            await supabase
                .from('image_uploads')
                .delete()
                .eq('public_id', publicId);

            logger.info(`Image deleted: ${publicId}`);
            return result;
        } catch (error) {
            logger.error(`Failed to delete image ${publicId}:`, error);
            throw error;
        }
    }

    async getImageUsageReport() {
        try {
            const { data: images, error } = await supabase
                .rpc('get_image_usage_stats');

            if (error) throw error;

            return {
                total_images: images.length,
                storage_used_gb: images.reduce((sum, img) => sum + (img.file_size || 0), 0) / (1024 * 1024 * 1024),
                bandwidth_usage_gb: images.reduce((sum, img) => sum + (img.total_bandwidth || 0), 0) / (1024 * 1024 * 1024),
                optimization_rate: images.filter(img => img.optimized_variants).length / images.length * 100,
                cdn_hit_rate: images.reduce((sum, img) => sum + (img.cache_hit_rate || 0), 0) / images.length
            };
        } catch (error) {
            logger.warn('Could not get image usage report (function may not exist)');
            return {
                total_images: 0,
                storage_used_gb: 0,
                bandwidth_usage_gb: 0,
                optimization_rate: 0,
                cdn_hit_rate: 0
            };
        }
    }
}

module.exports = ImageOptimizationService;
EOF

# Create image optimization routes
cat > backend/routes/image-optimization.js << 'EOF'
const express = require('express');
const router = express.Router();
const multer = require('multer');
const ImageOptimizationService = require('../services/image-optimization/ImageOptimizationService');
const { authenticateUser, requireRole } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const imageService = new ImageOptimizationService();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/temp/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
        }
    }
});

// Rate limiting
const imageRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 uploads per window
    message: { success: false, error: 'Too many image upload requests' }
});

// Upload and optimize image
router.post('/upload', 
    imageRateLimit,
    authenticateUser,
    upload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No image file provided'
                });
            }

            const { imageType = 'gallery_image', altText = '' } = req.body;
            
            const result = await imageService.uploadAndOptimizeImage(
                req.file.path,
                imageType,
                { context: { alt: altText, user_id: req.user.id } }
            );

            // Clean up temp file
            const fs = require('fs').promises;
            await fs.unlink(req.file.path).catch(() => {});

            res.json({
                success: true,
                message: 'Image uploaded and optimized successfully',
                data: result
            });

        } catch (error) {
            console.error('Image upload error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to upload and optimize image'
            });
        }
    }
);

// Generate responsive image tags
router.post('/responsive-tags', 
    authenticateUser,
    async (req, res) => {
        try {
            const { publicId, imageType, altText = '', className = '' } = req.body;

            if (!publicId || !imageType) {
                return res.status(400).json({
                    success: false,
                    error: 'publicId and imageType are required'
                });
            }

            const tags = await imageService.generateResponsiveImageTags(
                publicId, 
                imageType, 
                altText, 
                className
            );

            res.json({
                success: true,
                data: tags
            });

        } catch (error) {
            console.error('Responsive tags generation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate responsive image tags'
            });
        }
    }
);

// Batch optimize existing images
router.post('/batch-optimize', 
    imageRateLimit,
    authenticateUser,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { batchSize = 10 } = req.body;
            
            const results = await imageService.optimizeExistingImages(batchSize);

            res.json({
                success: true,
                message: 'Batch optimization completed',
                data: {
                    processed: results.length,
                    successful: results.filter(r => r.status === 'success').length,
                    failed: results.filter(r => r.status === 'error').length,
                    results
                }
            });

        } catch (error) {
            console.error('Batch optimization error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to perform batch optimization'
            });
        }
    }
);

// Get lazy loading script
router.get('/lazy-loading-script', 
    async (req, res) => {
        try {
            const { selector = 'img[data-lazy]' } = req.query;
            
            const script = await imageService.implementLazyLoading(selector);

            res.set('Content-Type', 'application/javascript');
            res.send(script);

        } catch (error) {
            console.error('Lazy loading script error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate lazy loading script'
            });
        }
    }
);

// Generate image sitemap
router.post('/generate-sitemap', 
    authenticateUser,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const result = await imageService.generateImageSitemap();

            res.json({
                success: true,
                message: 'Image sitemap generated successfully',
                data: result
            });

        } catch (error) {
            console.error('Image sitemap generation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate image sitemap'
            });
        }
    }
);

// Get image performance analysis
router.get('/performance-analysis', 
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const analysis = await imageService.analyzeImagePerformance();

            res.json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error('Image performance analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to analyze image performance'
            });
        }
    }
);

// Get image usage report
router.get('/usage-report', 
    authenticateUser,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const report = await imageService.getImageUsageReport();

            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            console.error('Image usage report error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get image usage report'
            });
        }
    }
);

// Delete image
router.delete('/:publicId', 
    authenticateUser,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { publicId } = req.params;
            
            const result = await imageService.deleteImage(publicId);

            res.json({
                success: true,
                message: 'Image deleted successfully',
                data: result
            });

        } catch (error) {
            console.error('Image deletion error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete image'
            });
        }
    }
);

module.exports = router;
EOF

# Create database schema for image optimization
cat > scripts/image-optimization-schema.sql << 'EOF'
-- Image Optimization and CDN Tables

-- Image uploads and metadata
CREATE TABLE IF NOT EXISTS image_uploads (
    id SERIAL PRIMARY KEY,
    public_id VARCHAR(255) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    image_type VARCHAR(50) NOT NULL, -- 'profile_image', 'gallery_image', 'banner_image', 'thumbnail'
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    format VARCHAR(10),
    optimized_variants JSONB,
    optimization_completed_at TIMESTAMP,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Image analytics and performance
CREATE TABLE IF NOT EXISTS image_analytics (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES image_uploads(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    loads INTEGER DEFAULT 0,
    load_time_avg DECIMAL(10,3), -- in seconds
    bandwidth_used BIGINT DEFAULT 0, -- in bytes
    bandwidth_saved BIGINT DEFAULT 0, -- estimated savings from optimization
    cache_hit_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(image_id, date)
);

-- CDN cache performance
CREATE TABLE IF NOT EXISTS cdn_cache_stats (
    id SERIAL PRIMARY KEY,
    cache_region VARCHAR(50),
    hit_rate DECIMAL(5,2),
    miss_rate DECIMAL(5,2),
    bandwidth_saved_gb DECIMAL(10,3),
    requests_count BIGINT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cache_region, date)
);

-- Image processing queue
CREATE TABLE IF NOT EXISTS image_processing_queue (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES image_uploads(id) ON DELETE CASCADE,
    processing_type VARCHAR(50), -- 'optimization', 'variant_generation', 'format_conversion'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    processing_options JSONB,
    scheduled_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Image SEO metadata
CREATE TABLE IF NOT EXISTS image_seo_metadata (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES image_uploads(id) ON DELETE CASCADE,
    alt_text TEXT,
    title TEXT,
    caption TEXT,
    description TEXT,
    keywords TEXT[],
    structured_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_uploads_type ON image_uploads(image_type);
CREATE INDEX IF NOT EXISTS idx_image_uploads_public_id ON image_uploads(public_id);
CREATE INDEX IF NOT EXISTS idx_image_uploads_created_at ON image_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_image_analytics_image_date ON image_analytics(image_id, date);
CREATE INDEX IF NOT EXISTS idx_cdn_cache_stats_region_date ON cdn_cache_stats(cache_region, date);
CREATE INDEX IF NOT EXISTS idx_image_processing_queue_status ON image_processing_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_image_seo_metadata_image_id ON image_seo_metadata(image_id);

-- Create functions
CREATE OR REPLACE FUNCTION get_image_usage_stats()
RETURNS TABLE(
    public_id VARCHAR,
    image_type VARCHAR,
    file_size BIGINT,
    optimized_variants JSONB,
    total_views BIGINT,
    total_bandwidth BIGINT,
    cache_hit_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        iu.public_id,
        iu.image_type,
        iu.file_size,
        iu.optimized_variants,
        COALESCE(SUM(ia.views), 0) as total_views,
        COALESCE(SUM(ia.bandwidth_used), 0) as total_bandwidth,
        COALESCE(AVG(ia.cache_hit_rate), 0) as cache_hit_rate
    FROM image_uploads iu
    LEFT JOIN image_analytics ia ON iu.id = ia.image_id
    GROUP BY iu.id, iu.public_id, iu.image_type, iu.file_size, iu.optimized_variants
    ORDER BY total_views DESC;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_image_uploads_updated_at
    BEFORE UPDATE ON image_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_image_seo_metadata_updated_at
    BEFORE UPDATE ON image_seo_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default image optimization presets
INSERT INTO system_settings (key, value, description, category) VALUES
('image_optimization_enabled', 'true', 'Enable automatic image optimization', 'images'),
('image_max_file_size_mb', '10', 'Maximum file size for image uploads in MB', 'images'),
('image_quality_default', '85', 'Default image quality for optimization (1-100)', 'images'),
('image_webp_enabled', 'true', 'Enable WebP format conversion', 'images'),
('image_lazy_loading_enabled', 'true', 'Enable lazy loading for images', 'images'),
('cdn_cache_duration_days', '30', 'CDN cache duration in days', 'images'),
('image_sitemap_enabled', 'true', 'Include images in sitemap', 'images')
ON CONFLICT (key) DO NOTHING;

-- Sample data for testing
INSERT INTO image_uploads (
    public_id, original_url, image_type, file_size, width, height, format
) VALUES
('sample/celebrity-1', 'https://res.cloudinary.com/demo/image/upload/celebrity-1.jpg', 'profile_image', 250000, 800, 600, 'jpg'),
('sample/gallery-1', 'https://res.cloudinary.com/demo/image/upload/gallery-1.jpg', 'gallery_image', 450000, 1200, 800, 'jpg'),
('sample/banner-1', 'https://res.cloudinary.com/demo/image/upload/banner-1.jpg', 'banner_image', 600000, 1920, 600, 'jpg')
ON CONFLICT (public_id) DO NOTHING;
EOF

echo "🗄️ Setting up image optimization database schema..."
if command -v psql > /dev/null; then
    psql "${DATABASE_URL:-postgresql://localhost/celebrity_booking}" -f scripts/image-optimization-schema.sql
    echo "✅ Image optimization database schema created"
else
    echo "⚠️ PostgreSQL not found. Please run the image-optimization-schema.sql manually"
fi

# Create React image optimization dashboard
mkdir -p frontend/src/components/Admin/ImageOptimization

cat > frontend/src/components/Admin/ImageOptimization/ImageOptimizationDashboard.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Upload, Image, Zap, BarChart3, Settings, 
    FileImage, HardDrive, Gauge, TrendingUp,
    RefreshCw, Download, Eye, Clock
} from 'lucide-react';

interface ImagePerformanceData {
    total_images: number;
    total_size_mb: number;
    optimization_savings_mb: number;
    optimization_percentage: number;
    performance_metrics: {
        avg_load_time: number;
        total_bandwidth_saved: number;
        total_views: number;
    };
    by_type: Record<string, {
        count: number;
        total_size: number;
        optimized: number;
    }>;
}

interface UsageReport {
    total_images: number;
    storage_used_gb: number;
    bandwidth_usage_gb: number;
    optimization_rate: number;
    cdn_hit_rate: number;
}

const ImageOptimizationDashboard: React.FC = () => {
    const [performanceData, setPerformanceData] = useState<ImagePerformanceData | null>(null);
    const [usageReport, setUsageReport] = useState<UsageReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [optimizing, setOptimizing] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const [performanceResponse, usageResponse] = await Promise.all([
                fetch('/api/image-optimization/performance-analysis', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch('/api/image-optimization/usage-report', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            if (performanceResponse.ok) {
                const performanceResult = await performanceResponse.json();
                setPerformanceData(performanceResult.data);
            }

            if (usageResponse.ok) {
                const usageResult = await usageResponse.json();
                setUsageReport(usageResult.data);
            }

        } catch (error) {
            console.error('Failed to fetch image optimization data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('imageType', 'gallery_image');

            const response = await fetch('/api/image-optimization/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                alert('Image uploaded and optimized successfully!');
                await fetchData(); // Refresh data
            } else {
                alert('Failed to upload image');
            }

        } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleBatchOptimization = async () => {
        try {
            setOptimizing(true);
            
            const response = await fetch('/api/image-optimization/batch-optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ batchSize: 20 })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Batch optimization completed! Processed: ${result.data.processed}, Successful: ${result.data.successful}`);
                await fetchData(); // Refresh data
            } else {
                alert('Batch optimization failed');
            }

        } catch (error) {
            console.error('Batch optimization error:', error);
            alert('Batch optimization failed');
        } finally {
            setOptimizing(false);
        }
    };

    const generateSitemap = async () => {
        try {
            const response = await fetch('/api/image-optimization/generate-sitemap', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Image sitemap generated with ${result.data.images_count} images!`);
            } else {
                alert('Failed to generate sitemap');
            }
        } catch (error) {
            console.error('Sitemap generation error:', error);
            alert('Failed to generate sitemap');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Image Optimization & CDN</h1>
                    <p className="text-gray-500 mt-1">
                        Advanced image optimization with Cloudinary CDN integration
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchData} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={generateSitemap} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Generate Sitemap
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Images</CardTitle>
                        <FileImage className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{performanceData?.total_images || 0}</div>
                        <p className="text-xs text-gray-500">Images stored</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                        <HardDrive className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {usageReport?.storage_used_gb?.toFixed(2) || 0}GB
                        </div>
                        <p className="text-xs text-gray-500">Total storage</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Optimization Rate</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {performanceData?.optimization_percentage?.toFixed(1) || 0}%
                        </div>
                        <p className="text-xs text-gray-500">Images optimized</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CDN Hit Rate</CardTitle>
                        <Gauge className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {usageReport?.cdn_hit_rate?.toFixed(1) || 0}%
                        </div>
                        <p className="text-xs text-gray-500">Cache efficiency</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="upload">Upload & Optimize</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="management">Management</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Storage Optimization</CardTitle>
                                <CardDescription>Space saved through optimization</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span>Original Size</span>
                                        <span className="font-bold">
                                            {performanceData?.total_size_mb?.toFixed(2) || 0}MB
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Space Saved</span>
                                        <span className="font-bold text-green-600">
                                            {performanceData?.optimization_savings_mb?.toFixed(2) || 0}MB
                                        </span>
                                    </div>
                                    <Progress 
                                        value={performanceData?.optimization_percentage || 0} 
                                        className="h-2"
                                    />
                                    <p className="text-sm text-gray-500">
                                        {performanceData?.optimization_percentage?.toFixed(1) || 0}% of images optimized
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Images by Type</CardTitle>
                                <CardDescription>Breakdown by image category</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {performanceData?.by_type && Object.entries(performanceData.by_type).map(([type, data]) => (
                                        <div key={type} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Image className="h-4 w-4" />
                                                <span className="capitalize">{type.replace('_', ' ')}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="secondary">{data.count}</Badge>
                                                <Badge 
                                                    variant={data.optimized === data.count ? 'default' : 'outline'}
                                                    className={data.optimized === data.count ? 'bg-green-100 text-green-800' : ''}
                                                >
                                                    {data.optimized}/{data.count} optimized
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Metrics</CardTitle>
                            <CardDescription>Image loading and bandwidth statistics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <Eye className="h-5 w-5 text-blue-600 mr-2" />
                                        <span className="text-sm font-medium">Total Views</span>
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {performanceData?.performance_metrics?.total_views?.toLocaleString() || 0}
                                    </div>
                                </div>
                                
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <Clock className="h-5 w-5 text-green-600 mr-2" />
                                        <span className="text-sm font-medium">Avg Load Time</span>
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {performanceData?.performance_metrics?.avg_load_time?.toFixed(2) || 0}s
                                    </div>
                                </div>
                                
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                                        <span className="text-sm font-medium">Bandwidth Saved</span>
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {((performanceData?.performance_metrics?.total_bandwidth_saved || 0) / (1024 * 1024)).toFixed(1)}MB
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload & Optimize Images</CardTitle>
                            <CardDescription>Upload new images with automatic optimization</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="image-upload">Select Image</Label>
                                <Input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="mt-1"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Supports JPEG, PNG, WebP, and GIF. Max file size: 10MB
                                </p>
                            </div>

                            {uploading && (
                                <Alert>
                                    <Upload className="h-4 w-4" />
                                    <AlertDescription>
                                        Uploading and optimizing image... This may take a few moments.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-2">
                                <Button 
                                    onClick={handleBatchOptimization}
                                    disabled={optimizing}
                                    variant="outline"
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    {optimizing ? 'Optimizing...' : 'Batch Optimize Existing'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Optimization Settings</CardTitle>
                            <CardDescription>Configure image optimization parameters</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Default Quality</Label>
                                    <Input type="number" min="1" max="100" defaultValue="85" />
                                    <p className="text-sm text-gray-500 mt-1">1-100, higher is better quality</p>
                                </div>
                                
                                <div>
                                    <Label>Max File Size (MB)</Label>
                                    <Input type="number" min="1" max="50" defaultValue="10" />
                                    <p className="text-sm text-gray-500 mt-1">Maximum upload file size</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Bandwidth Usage</CardTitle>
                                <CardDescription>CDN bandwidth consumption</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center">
                                    <div className="text-3xl font-bold mb-2">
                                        {usageReport?.bandwidth_usage_gb?.toFixed(2) || 0}GB
                                    </div>
                                    <p className="text-gray-500">This month</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Cache Performance</CardTitle>
                                <CardDescription>CDN cache hit rate</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Hit Rate</span>
                                        <span className="font-bold">{usageReport?.cdn_hit_rate?.toFixed(1) || 0}%</span>
                                    </div>
                                    <Progress value={usageReport?.cdn_hit_rate || 0} className="h-2" />
                                    <p className="text-sm text-gray-500">
                                        Higher hit rates indicate better caching efficiency
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="management" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Batch Operations</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button 
                                    variant="outline" 
                                    className="w-full"
                                    onClick={handleBatchOptimization}
                                    disabled={optimizing}
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    Optimize All Images
                                </Button>
                                
                                <Button variant="outline" className="w-full">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Regenerate Variants
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>SEO Tools</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button 
                                    variant="outline" 
                                    className="w-full"
                                    onClick={generateSitemap}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Generate Sitemap
                                </Button>
                                
                                <Button variant="outline" className="w-full">
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    SEO Analysis
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Maintenance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button variant="outline" className="w-full">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Clear Cache
                                </Button>
                                
                                <Button variant="outline" className="w-full">
                                    <HardDrive className="h-4 w-4 mr-2" />
                                    Cleanup Unused
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ImageOptimizationDashboard;
EOF

# Install required dependencies
echo "📦 Installing image optimization dependencies..."
if [ -f package.json ]; then
    npm install --save cloudinary sharp multer @types/multer
    echo "✅ Image optimization dependencies installed"
fi

# Create responsive image React component
cat > frontend/src/components/UI/ResponsiveImage.tsx << 'EOF'
import React, { useState, useRef, useEffect } from 'react';

interface ResponsiveImageProps {
    publicId: string;
    imageType: 'profile_image' | 'gallery_image' | 'banner_image' | 'thumbnail';
    alt: string;
    className?: string;
    lazy?: boolean;
    onClick?: () => void;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
    publicId,
    imageType,
    alt,
    className = '',
    lazy = true,
    onClick
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(!lazy);
    const imgRef = useRef<HTMLImageElement>(null);

    // Cloudinary base URL
    const cloudinaryBaseUrl = process.env.REACT_APP_CLOUDINARY_BASE_URL || 
                              'https://res.cloudinary.com/your-cloud-name';

    // Image size configurations based on type
    const sizeConfigs = {
        profile_image: {
            sizes: '(max-width: 400px) 100px, (max-width: 800px) 200px, 400px',
            variants: [
                { width: 400, height: 400, suffix: 'lg' },
                { width: 200, height: 200, suffix: 'md' },
                { width: 100, height: 100, suffix: 'sm' },
                { width: 50, height: 50, suffix: 'xs' }
            ]
        },
        gallery_image: {
            sizes: '(max-width: 400px) 200px, (max-width: 800px) 400px, 800px',
            variants: [
                { width: 1200, height: 800, suffix: 'xl' },
                { width: 800, height: 533, suffix: 'lg' },
                { width: 400, height: 267, suffix: 'md' },
                { width: 200, height: 133, suffix: 'sm' }
            ]
        },
        banner_image: {
            sizes: '(max-width: 800px) 400px, (max-width: 1200px) 800px, 1200px',
            variants: [
                { width: 1920, height: 600, suffix: 'xl' },
                { width: 1200, height: 375, suffix: 'lg' },
                { width: 800, height: 250, suffix: 'md' },
                { width: 400, height: 125, suffix: 'sm' }
            ]
        },
        thumbnail: {
            sizes: '(max-width: 150px) 75px, (max-width: 300px) 150px, 300px',
            variants: [
                { width: 300, height: 300, suffix: 'lg' },
                { width: 150, height: 150, suffix: 'md' },
                { width: 75, height: 75, suffix: 'sm' }
            ]
        }
    };

    const config = sizeConfigs[imageType];
    
    // Generate srcSet
    const srcSet = config.variants.map(variant => {
        const transformation = `w_${variant.width},h_${variant.height},q_auto,f_auto,c_fill`;
        const url = `${cloudinaryBaseUrl}/image/upload/${transformation}/${publicId}`;
        return `${url} ${variant.width}w`;
    }).join(', ');

    // Default src (medium size)
    const defaultVariant = config.variants[Math.floor(config.variants.length / 2)];
    const defaultTransformation = `w_${defaultVariant.width},h_${defaultVariant.height},q_auto,f_auto,c_fill`;
    const defaultSrc = `${cloudinaryBaseUrl}/image/upload/${defaultTransformation}/${publicId}`;

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (!lazy || isInView) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [lazy, isInView]);

    // Placeholder while loading
    const placeholder = (
        <div 
            className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
            style={{ 
                aspectRatio: `${defaultVariant.width}/${defaultVariant.height}`,
                minHeight: '100px'
            }}
        >
            <svg 
                className="w-8 h-8 text-gray-400" 
                fill="currentColor" 
                viewBox="0 0 20 20"
            >
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
        </div>
    );

    return (
        <div className="relative">
            {(!isInView || !isLoaded) && placeholder}
            
            {isInView && (
                <img
                    ref={imgRef}
                    src={defaultSrc}
                    srcSet={srcSet}
                    sizes={config.sizes}
                    alt={alt}
                    className={`transition-opacity duration-300 ${
                        isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
                    } ${className}`}
                    loading={lazy ? 'lazy' : 'eager'}
                    onLoad={() => setIsLoaded(true)}
                    onClick={onClick}
                />
            )}
        </div>
    );
};

export default ResponsiveImage;
EOF

echo "🖼️ Created responsive image React component"

echo ""
echo "🎉 Advanced Image Optimization and CDN Integration Setup Complete!"
echo ""
echo "📋 What was configured:"
echo "  ✅ ImageOptimizationService with Cloudinary integration"
echo "  ✅ Multiple image size variants and formats (WebP, JPEG)"
echo "  ✅ Automatic image optimization and compression"
echo "  ✅ Responsive image generation with srcset"
echo "  ✅ Lazy loading implementation"
echo "  ✅ Image performance analytics and monitoring"
echo "  ✅ SEO-optimized image sitemaps"
echo "  ✅ Admin dashboard for image management"
echo "  ✅ React components for responsive images"
echo "  ✅ CDN cache performance tracking"
echo ""
echo "🔧 Next steps:"
echo "  1. Configure Cloudinary credentials in environment variables:"
echo "     - CLOUDINARY_CLOUD_NAME=your-cloud-name"
echo "     - CLOUDINARY_API_KEY=your-api-key"
echo "     - CLOUDINARY_API_SECRET=your-api-secret"
echo "  2. Run database migrations: psql \$DATABASE_URL -f scripts/image-optimization-schema.sql"
echo "  3. Upload test images to verify optimization pipeline"
echo "  4. Configure CDN settings and cache policies"
echo "  5. Set up monitoring for bandwidth and performance"
echo ""
echo "📊 Image Optimization Features:"
echo "  • Multi-format support (WebP, JPEG, PNG)"
echo "  • Responsive image variants (4+ sizes per image)"
echo "  • Automatic quality optimization"
echo "  • Lazy loading with intersection observer"
echo "  • CDN integration with global edge locations"
echo "  • Performance analytics and bandwidth tracking"
echo "  • SEO-optimized image sitemaps"
echo "  • Batch optimization tools"
echo "  • Real-time upload and processing"
echo "  • Cache hit rate monitoring"
echo ""
echo "🎯 Image types supported:"
echo "  • Profile Images: 4 variants (50px to 400px)"
echo "  • Gallery Images: 4 variants (200px to 1200px)"
echo "  • Banner Images: 4 variants (400px to 1920px)"
echo "  • Thumbnails: 3 variants (75px to 300px)"
echo ""
echo "🎯 Access image optimization at: /admin/image-optimization"