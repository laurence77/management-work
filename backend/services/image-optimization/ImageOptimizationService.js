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
