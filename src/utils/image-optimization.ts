/**
 * Image Optimization and Compression Utilities
 */

export interface ImageOptimizationOptions {
  quality?: number; // 0-1 for JPEG, 0-100 for WebP
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  progressive?: boolean;
  preserveMetadata?: boolean;
  enableResize?: boolean;
}

export interface OptimizedImage {
  blob: Blob;
  url: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  format: string;
}

export interface CDNImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  gravity?: 'center' | 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  progressive?: boolean;
  stripMetadata?: boolean;
}

class ImageOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private workerPool: Worker[] = [];
  private maxWorkers = 4;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.initializeWorkerPool();
  }

  /**
   * Initialize web worker pool for parallel processing
   */
  private initializeWorkerPool(): void {
    if (typeof Worker === 'undefined') return;

    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(new URL('./image-worker.ts', import.meta.url));
        this.workerPool.push(worker);
      } catch (error) {
        console.warn('Failed to create image optimization worker:', error);
        break;
      }
    }
  }

  /**
   * Compress and optimize an image file
   */
  async optimizeImage(
    file: File | Blob,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'webp',
      progressive = true,
      preserveMetadata = false,
      enableResize = true
    } = options;

    const originalSize = file.size;
    
    // Load image
    const img = await this.loadImage(file);
    const { width: originalWidth, height: originalHeight } = img;

    // Calculate new dimensions
    const { width, height } = enableResize 
      ? this.calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight)
      : { width: originalWidth, height: originalHeight };

    // Set canvas dimensions
    this.canvas.width = width;
    this.canvas.height = height;

    // Configure canvas for high quality rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Draw and resize image
    this.ctx.drawImage(img, 0, 0, width, height);

    // Apply additional optimizations
    if (!preserveMetadata) {
      // Strip metadata by redrawing
      const imageData = this.ctx.getImageData(0, 0, width, height);
      this.ctx.putImageData(imageData, 0, 0);
    }

    // Convert to optimized format
    const mimeType = this.getMimeType(format);
    const blob = await this.canvasToBlob(this.canvas, mimeType, quality, progressive);
    
    const compressedSize = blob.size;
    const compressionRatio = (1 - compressedSize / originalSize) * 100;

    return {
      blob,
      url: URL.createObjectURL(blob),
      originalSize,
      compressedSize,
      compressionRatio,
      width,
      height,
      format
    };
  }

  /**
   * Optimize multiple images in parallel
   */
  async optimizeImages(
    files: (File | Blob)[],
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage[]> {
    const chunks = this.chunkArray(files, this.maxWorkers || 1);
    const results: OptimizedImage[] = [];

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(file => this.optimizeImage(file, options));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Create responsive image variants
   */
  async createResponsiveVariants(
    file: File | Blob,
    breakpoints: { name: string; width: number; quality?: number }[] = [
      { name: 'mobile', width: 480, quality: 0.75 },
      { name: 'tablet', width: 768, quality: 0.8 },
      { name: 'desktop', width: 1200, quality: 0.85 },
      { name: 'large', width: 1920, quality: 0.9 }
    ]
  ): Promise<Record<string, OptimizedImage>> {
    const variants: Record<string, OptimizedImage> = {};

    for (const breakpoint of breakpoints) {
      const optimized = await this.optimizeImage(file, {
        maxWidth: breakpoint.width,
        quality: breakpoint.quality || 0.8,
        format: 'webp',
        enableResize: true
      });

      variants[breakpoint.name] = optimized;
    }

    return variants;
  }

  /**
   * Generate progressive JPEG
   */
  async createProgressiveJPEG(
    file: File | Blob,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    return this.optimizeImage(file, {
      ...options,
      format: 'jpeg',
      progressive: true
    });
  }

  /**
   * Create WebP with fallback
   */
  async createWebPWithFallback(
    file: File | Blob,
    options: ImageOptimizationOptions = {}
  ): Promise<{ webp: OptimizedImage; fallback: OptimizedImage }> {
    const [webp, fallback] = await Promise.all([
      this.optimizeImage(file, { ...options, format: 'webp' }),
      this.optimizeImage(file, { ...options, format: 'jpeg' })
    ]);

    return { webp, fallback };
  }

  /**
   * Optimize for different use cases
   */
  async optimizeForUseCase(
    file: File | Blob,
    useCase: 'thumbnail' | 'gallery' | 'hero' | 'profile' | 'content'
  ): Promise<OptimizedImage> {
    const presets: Record<string, ImageOptimizationOptions> = {
      thumbnail: {
        maxWidth: 150,
        maxHeight: 150,
        quality: 0.7,
        format: 'webp'
      },
      gallery: {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'webp'
      },
      hero: {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.9,
        format: 'webp',
        progressive: true
      },
      profile: {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        format: 'webp'
      },
      content: {
        maxWidth: 1200,
        maxHeight: 800,
        quality: 0.8,
        format: 'webp'
      }
    };

    return this.optimizeImage(file, presets[useCase]);
  }

  /**
   * Private helper methods
   */
  private async loadImage(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      webp: 'image/webp',
      jpeg: 'image/jpeg',
      png: 'image/png',
      avif: 'image/avif'
    };

    return mimeTypes[format] || 'image/webp';
  }

  private async canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality: number,
    progressive: boolean
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Cleanup methods
   */
  cleanup(): void {
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
  }
}

/**
 * CDN Image URL Builder
 */
class CDNImageBuilder {
  private baseUrl: string;
  private provider: 'cloudinary' | 'imagekit' | 'cloudflare' | 'custom';

  constructor(baseUrl: string, provider: 'cloudinary' | 'imagekit' | 'cloudflare' | 'custom' = 'custom') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.provider = provider;
  }

  /**
   * Generate optimized CDN URL
   */
  buildUrl(imagePath: string, options: CDNImageOptions = {}): string {
    const {
      width,
      height,
      quality = 80,
      format = 'auto',
      fit = 'cover',
      gravity = 'center',
      blur,
      sharpen,
      grayscale,
      progressive = true,
      stripMetadata = true
    } = options;

    switch (this.provider) {
      case 'cloudinary':
        return this.buildCloudinaryUrl(imagePath, options);
      case 'imagekit':
        return this.buildImageKitUrl(imagePath, options);
      case 'cloudflare':
        return this.buildCloudflareUrl(imagePath, options);
      default:
        return this.buildCustomUrl(imagePath, options);
    }
  }

  /**
   * Generate responsive image URLs
   */
  buildResponsiveUrls(
    imagePath: string,
    breakpoints: { name: string; width: number; density?: number }[] = [
      { name: 'mobile', width: 480 },
      { name: 'tablet', width: 768 },
      { name: 'desktop', width: 1200 },
      { name: 'large', width: 1920 }
    ]
  ): Record<string, string> {
    const urls: Record<string, string> = {};

    for (const breakpoint of breakpoints) {
      urls[breakpoint.name] = this.buildUrl(imagePath, {
        width: breakpoint.width,
        format: 'auto'
      });

      // Add high DPI variant
      if (breakpoint.density) {
        urls[`${breakpoint.name}_2x`] = this.buildUrl(imagePath, {
          width: breakpoint.width * breakpoint.density,
          format: 'auto'
        });
      }
    }

    return urls;
  }

  /**
   * Generate picture element markup
   */
  generatePictureMarkup(
    imagePath: string,
    alt: string,
    options: {
      breakpoints?: { media: string; width: number }[];
      className?: string;
      loading?: 'lazy' | 'eager';
      sizes?: string;
    } = {}
  ): string {
    const {
      breakpoints = [
        { media: '(max-width: 480px)', width: 480 },
        { media: '(max-width: 768px)', width: 768 },
        { media: '(max-width: 1200px)', width: 1200 }
      ],
      className = '',
      loading = 'lazy',
      sizes = '100vw'
    } = options;

    const sources = breakpoints
      .map(bp => {
        const webpUrl = this.buildUrl(imagePath, { width: bp.width, format: 'webp' });
        const fallbackUrl = this.buildUrl(imagePath, { width: bp.width, format: 'jpeg' });
        
        return `
          <source media="${bp.media}" 
                  srcset="${webpUrl}" 
                  type="image/webp">
          <source media="${bp.media}" 
                  srcset="${fallbackUrl}" 
                  type="image/jpeg">
        `;
      })
      .join('');

    const fallbackImg = this.buildUrl(imagePath, { width: 1200, format: 'jpeg' });

    return `
      <picture>
        ${sources}
        <img src="${fallbackImg}" 
             alt="${alt}" 
             class="${className}"
             loading="${loading}"
             sizes="${sizes}">
      </picture>
    `;
  }

  /**
   * Provider-specific URL builders
   */
  private buildCloudinaryUrl(imagePath: string, options: CDNImageOptions): string {
    const transformations: string[] = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format && options.format !== 'auto') transformations.push(`f_${options.format}`);
    if (options.fit) transformations.push(`c_${options.fit}`);
    if (options.gravity) transformations.push(`g_${options.gravity}`);
    if (options.blur) transformations.push(`e_blur:${options.blur}`);
    if (options.sharpen) transformations.push('e_sharpen');
    if (options.grayscale) transformations.push('e_grayscale');
    if (options.progressive) transformations.push('fl_progressive');
    if (options.stripMetadata) transformations.push('fl_strip_profile');

    const transformation = transformations.join(',');
    return `${this.baseUrl}/${transformation}/${imagePath}`;
  }

  private buildImageKitUrl(imagePath: string, options: CDNImageOptions): string {
    const params = new URLSearchParams();

    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());
    if (options.quality) params.append('q', options.quality.toString());
    if (options.format && options.format !== 'auto') params.append('f', options.format);
    if (options.fit) params.append('c', options.fit);
    if (options.blur) params.append('bl', options.blur.toString());
    if (options.sharpen) params.append('e-sharpen', '1');
    if (options.grayscale) params.append('e-grayscale', '1');
    if (options.progressive) params.append('pr', 'true');

    return `${this.baseUrl}/${imagePath}?${params.toString()}`;
  }

  private buildCloudflareUrl(imagePath: string, options: CDNImageOptions): string {
    const params = new URLSearchParams();

    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.format && options.format !== 'auto') params.append('format', options.format);
    if (options.fit) params.append('fit', options.fit);
    if (options.gravity) params.append('gravity', options.gravity);
    if (options.blur) params.append('blur', options.blur.toString());
    if (options.sharpen) params.append('sharpen', '1');

    return `${this.baseUrl}/cdn-cgi/image/${params.toString()}/${imagePath}`;
  }

  private buildCustomUrl(imagePath: string, options: CDNImageOptions): string {
    const params = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return `${this.baseUrl}/${imagePath}?${params.toString()}`;
  }
}

// Export singleton instances
export const imageOptimizer = new ImageOptimizer();

// Export CDN builder factory
export const createCDNBuilder = (baseUrl: string, provider?: 'cloudinary' | 'imagekit' | 'cloudflare' | 'custom') => {
  return new CDNImageBuilder(baseUrl, provider);
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  imageOptimizer.cleanup();
});

// Helper functions
export const optimizeImageFile = (file: File, options?: ImageOptimizationOptions) => {
  return imageOptimizer.optimizeImage(file, options);
};

export const createResponsiveImages = (file: File, breakpoints?: { name: string; width: number; quality?: number }[]) => {
  return imageOptimizer.createResponsiveVariants(file, breakpoints);
};

export const optimizeForThumbnail = (file: File) => {
  return imageOptimizer.optimizeForUseCase(file, 'thumbnail');
};

export const optimizeForGallery = (file: File) => {
  return imageOptimizer.optimizeForUseCase(file, 'gallery');
};

export const optimizeForHero = (file: File) => {
  return imageOptimizer.optimizeForUseCase(file, 'hero');
};