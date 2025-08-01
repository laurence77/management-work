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