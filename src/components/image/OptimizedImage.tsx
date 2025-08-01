/**
 * Optimized Image Component with CDN Integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createCDNBuilder, CDNImageOptions } from '@/utils/image-optimization';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  sizes?: string;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  gravity?: 'center' | 'north' | 'south' | 'east' | 'west';
  blur?: number;
  placeholder?: 'blur' | 'empty' | string;
  onLoad?: () => void;
  onError?: () => void;
  cdnProvider?: 'cloudinary' | 'imagekit' | 'cloudflare' | 'custom';
  cdnBaseUrl?: string;
  responsive?: boolean;
  breakpoints?: { media: string; width: number }[];
  enableWebP?: boolean;
  enableAVIF?: boolean;
  progressive?: boolean;
  stripMetadata?: boolean;
  [key: string]: any;
}

const DEFAULT_BREAKPOINTS = [
  { media: '(max-width: 480px)', width: 480 },
  { media: '(max-width: 768px)', width: 768 },
  { media: '(max-width: 1200px)', width: 1200 },
  { media: '(min-width: 1201px)', width: 1920 }
];

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
  priority = false,
  sizes = '100vw',
  quality = 80,
  format = 'auto',
  fit = 'cover',
  gravity = 'center',
  blur,
  placeholder = 'empty',
  onLoad,
  onError,
  cdnProvider = 'custom',
  cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_URL || '',
  responsive = true,
  breakpoints = DEFAULT_BREAKPOINTS,
  enableWebP = true,
  enableAVIF = true,
  progressive = true,
  stripMetadata = true,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!loading || loading === 'eager' || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Create CDN builder
  const cdnBuilder = cdnBaseUrl ? createCDNBuilder(cdnBaseUrl, cdnProvider) : null;

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (loading === 'lazy' && !priority && !isInView) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        },
        {
          rootMargin: '50px',
          threshold: 0.1
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading, priority, isInView]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate CDN URL
  const generateCDNUrl = useCallback((
    imageSrc: string,
    options: CDNImageOptions
  ): string => {
    if (!cdnBuilder) return imageSrc;
    return cdnBuilder.buildUrl(imageSrc, options);
  }, [cdnBuilder]);

  // Generate responsive sources
  const generateSources = useCallback(() => {
    if (!responsive || !cdnBuilder) return [];

    const sources: Array<{
      media: string;
      srcSet: string;
      type: string;
    }> = [];

    breakpoints.forEach(bp => {
      const baseOptions: CDNImageOptions = {
        width: bp.width,
        quality,
        fit,
        gravity,
        blur,
        progressive,
        stripMetadata
      };

      // AVIF source
      if (enableAVIF) {
        sources.push({
          media: bp.media,
          srcSet: generateCDNUrl(src, { ...baseOptions, format: 'avif' }),
          type: 'image/avif'
        });
      }

      // WebP source
      if (enableWebP) {
        sources.push({
          media: bp.media,
          srcSet: generateCDNUrl(src, { ...baseOptions, format: 'webp' }),
          type: 'image/webp'
        });
      }

      // JPEG fallback
      sources.push({
        media: bp.media,
        srcSet: generateCDNUrl(src, { ...baseOptions, format: 'jpeg' }),
        type: 'image/jpeg'
      });
    });

    return sources;
  }, [
    responsive,
    cdnBuilder,
    breakpoints,
    src,
    quality,
    fit,
    gravity,
    blur,
    progressive,
    stripMetadata,
    enableAVIF,
    enableWebP,
    generateCDNUrl
  ]);

  // Generate fallback image URL
  const fallbackSrc = cdnBuilder
    ? generateCDNUrl(src, {
        width: width || 1200,
        height,
        quality,
        format: format === 'auto' ? 'jpeg' : format,
        fit,
        gravity,
        blur,
        progressive,
        stripMetadata
      })
    : src;

  // Generate placeholder
  const placeholderSrc = (() => {
    if (placeholder === 'empty') return undefined;
    if (placeholder === 'blur' && cdnBuilder) {
      return generateCDNUrl(src, {
        width: 20,
        quality: 20,
        blur: 10,
        format: 'jpeg'
      });
    }
    if (typeof placeholder === 'string' && placeholder !== 'blur') {
      return placeholder;
    }
    return undefined;
  })();

  // Don't render anything if not in view (for lazy loading)
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={cn('bg-gray-200 animate-pulse', className)}
        style={{ width, height }}
        {...props}
      />
    );
  }

  // Error state
  if (hasError) {
    return (
      <div
        className={cn(
          'bg-gray-100 flex items-center justify-center text-gray-400',
          className
        )}
        style={{ width, height }}
        {...props}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  const sources = generateSources();

  // Render responsive picture element
  if (responsive && sources.length > 0) {
    return (
      <picture className={className}>
        {sources.map((source, index) => (
          <source
            key={index}
            media={source.media}
            srcSet={source.srcSet}
            type={source.type}
          />
        ))}
        <img
          ref={imgRef}
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            placeholder === 'blur' && placeholderSrc && !isLoaded && 'backdrop-blur-sm'
          )}
          style={{
            backgroundImage: placeholderSrc ? `url(${placeholderSrc})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          {...props}
        />
      </picture>
    );
  }

  // Render simple img element
  return (
    <img
      ref={imgRef}
      src={fallbackSrc}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      sizes={sizes}
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-0',
        placeholder === 'blur' && placeholderSrc && !isLoaded && 'backdrop-blur-sm',
        className
      )}
      style={{
        backgroundImage: placeholderSrc ? `url(${placeholderSrc})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
      {...props}
    />
  );
}

// Hook for managing image optimization
export function useImageOptimization() {
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check for WebP support
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };

    // Check for AVIF support
    const checkAVIFSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    };

    setIsSupported(checkWebPSupport());
  }, []);

  const getOptimalFormat = useCallback(() => {
    // Check format support
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
      return 'avif';
    }
    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
      return 'webp';
    }
    return 'jpeg';
  }, []);

  const calculateOptimalSize = useCallback((
    containerWidth: number,
    containerHeight: number,
    devicePixelRatio = window.devicePixelRatio || 1
  ) => {
    return {
      width: Math.ceil(containerWidth * devicePixelRatio),
      height: Math.ceil(containerHeight * devicePixelRatio)
    };
  }, []);

  return {
    isSupported,
    getOptimalFormat,
    calculateOptimalSize
  };
}

// Preload important images
export function preloadImage(src: string, options?: CDNImageOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    
    if (options && process.env.NEXT_PUBLIC_CDN_URL) {
      const cdnBuilder = createCDNBuilder(process.env.NEXT_PUBLIC_CDN_URL);
      img.src = cdnBuilder.buildUrl(src, options);
    } else {
      img.src = src;
    }
  });
}

// Image gallery component with optimization
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  className?: string;
  itemClassName?: string;
  layout?: 'grid' | 'masonry' | 'carousel';
  columns?: number;
  gap?: number;
  quality?: number;
}

export function ImageGallery({
  images,
  className,
  itemClassName,
  layout = 'grid',
  columns = 3,
  gap = 4,
  quality = 80
}: ImageGalleryProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  };

  const gapClass = `gap-${gap}`;

  if (layout === 'grid') {
    return (
      <div
        className={cn(
          'grid',
          gridCols[columns as keyof typeof gridCols],
          gapClass,
          className
        )}
      >
        {images.map((image, index) => (
          <div key={index} className={cn('relative overflow-hidden rounded-lg', itemClassName)}>
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              quality={quality}
              fit="cover"
              className="w-full h-full object-cover"
              loading={index < 6 ? 'eager' : 'lazy'}
              priority={index < 3}
            />
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
                {image.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Add masonry and carousel layouts as needed
  return null;
}