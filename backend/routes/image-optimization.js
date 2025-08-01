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
