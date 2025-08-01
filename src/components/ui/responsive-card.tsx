/**
 * Responsive Card Component
 * Enhanced card component with mobile-first responsive design
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useScreenSize, containerClasses, mobileUtils, imageUtils } from '@/utils/responsive-utils';

interface ResponsiveCardProps {
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  badges?: Array<{ text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }>;
  price?: string;
  originalPrice?: string;
  actions?: Array<{
    label: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    onClick: () => void;
  }>;
  featured?: boolean;
  layout?: 'vertical' | 'horizontal' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function ResponsiveCard({
  title,
  description,
  image,
  imageAlt,
  badges = [],
  price,
  originalPrice,
  actions = [],
  featured = false,
  layout = 'vertical',
  size = 'md',
  className,
  children
}: ResponsiveCardProps) {
  const { isMobile, isTablet } = useScreenSize();

  // Force vertical layout on mobile for better UX
  const effectiveLayout = isMobile ? 'vertical' : layout;

  const cardClasses = cn(
    'overflow-hidden transition-all duration-200',
    // Responsive shadows and borders
    'shadow-sm hover:shadow-lg',
    'border border-gray-200 hover:border-gray-300',
    // Featured cards
    featured && 'ring-2 ring-blue-500 border-blue-500',
    // Size variants
    {
      'max-w-sm': size === 'sm',
      'max-w-md': size === 'md',
      'max-w-lg': size === 'lg'
    },
    // Mobile optimizations
    mobileUtils.touchTarget,
    'active:scale-[0.98] transition-transform',
    className
  );

  const imageClasses = cn(
    'object-cover',
    {
      // Vertical layout image sizes
      [imageUtils.card]: effectiveLayout === 'vertical',
      // Horizontal layout image sizes
      'w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 flex-shrink-0': effectiveLayout === 'horizontal',
      // Compact layout image sizes
      'w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0': effectiveLayout === 'compact'
    }
  );

  const contentClasses = cn(
    'flex-1',
    {
      // Vertical layout padding
      'p-4 sm:p-6': effectiveLayout === 'vertical' && size !== 'sm',
      'p-3 sm:p-4': effectiveLayout === 'vertical' && size === 'sm',
      // Horizontal layout padding
      'p-4 sm:p-6': effectiveLayout === 'horizontal',
      // Compact layout padding
      'p-3 sm:p-4': effectiveLayout === 'compact'
    }
  );

  const titleClasses = cn(
    'font-semibold leading-tight',
    {
      'text-lg sm:text-xl': size === 'lg',
      'text-base sm:text-lg': size === 'md',
      'text-sm sm:text-base': size === 'sm'
    },
    // Mobile text handling
    'line-clamp-2 sm:line-clamp-1'
  );

  const descriptionClasses = cn(
    'text-muted-foreground mt-2',
    {
      'text-sm sm:text-base': size === 'lg',
      'text-sm': size === 'md',
      'text-xs sm:text-sm': size === 'sm'
    },
    // Mobile text handling
    'line-clamp-3 sm:line-clamp-2'
  );

  const priceClasses = cn(
    'font-bold text-primary mt-2',
    {
      'text-xl sm:text-2xl': size === 'lg',
      'text-lg sm:text-xl': size === 'md',
      'text-base sm:text-lg': size === 'sm'
    }
  );

  // Render based on layout
  if (effectiveLayout === 'horizontal') {
    return (
      <Card className={cardClasses}>
        <div className="flex">
          {image && (
            <div className="relative overflow-hidden">
              <img
                src={image}
                alt={imageAlt || title}
                className={imageClasses}
              />
              {featured && (
                <Badge 
                  className="absolute top-2 left-2 bg-blue-500 text-white"
                  variant="default"
                >
                  Featured
                </Badge>
              )}
            </div>
          )}
          
          <div className={contentClasses}>
            <div className="flex-1">
              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                  {badges.map((badge, index) => (
                    <Badge key={index} variant={badge.variant || 'secondary'}>
                      {badge.text}
                    </Badge>
                  ))}
                </div>
              )}

              <h3 className={titleClasses}>{title}</h3>
              
              {description && (
                <p className={descriptionClasses}>{description}</p>
              )}

              {children && (
                <div className="mt-3">{children}</div>
              )}

              {price && (
                <div className="flex items-center gap-2 mt-2">
                  <span className={priceClasses}>{price}</span>
                  {originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {originalPrice}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'default'}
                    size={isMobile ? 'default' : 'sm'}
                    onClick={action.onClick}
                    className={cn(
                      'flex-1 sm:flex-none',
                      mobileUtils.buttonSize
                    )}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (effectiveLayout === 'compact') {
    return (
      <Card className={cardClasses}>
        <div className="flex items-center gap-3 p-3 sm:p-4">
          {image && (
            <div className="relative">
              <img
                src={image}
                alt={imageAlt || title}
                className={imageClasses}
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={cn(titleClasses, 'line-clamp-1')}>{title}</h3>
                {description && (
                  <p className={cn(descriptionClasses, 'line-clamp-1 mt-1')}>{description}</p>
                )}
              </div>
              
              {price && (
                <div className="flex flex-col items-end">
                  <span className={cn(priceClasses, 'text-sm sm:text-base')}>{price}</span>
                  {originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {originalPrice}
                    </span>
                  )}
                </div>
              )}
            </div>

            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {badges.map((badge, index) => (
                  <Badge key={index} variant={badge.variant || 'secondary'} className="text-xs">
                    {badge.text}
                  </Badge>
                ))}
              </div>
            )}

            {children && (
              <div className="mt-2">{children}</div>
            )}
          </div>

          {actions.length > 0 && (
            <div className="flex flex-col gap-1">
              {actions.slice(0, 2).map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'default'}
                  size="sm"
                  onClick={action.onClick}
                  className="text-xs px-2"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Default vertical layout
  return (
    <Card className={cardClasses}>
      {image && (
        <div className="relative overflow-hidden">
          <img
            src={image}
            alt={imageAlt || title}
            className={imageClasses}
          />
          {featured && (
            <Badge 
              className="absolute top-2 right-2 bg-blue-500 text-white"
              variant="default"
            >
              Featured
            </Badge>
          )}
          {badges.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
              {badges.slice(0, 2).map((badge, index) => (
                <Badge key={index} variant={badge.variant || 'secondary'}>
                  {badge.text}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <CardHeader className={cn(contentClasses, 'pb-2')}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={titleClasses}>{title}</CardTitle>
          {price && (
            <div className="flex flex-col items-end">
              <span className={priceClasses}>{price}</span>
              {originalPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {originalPrice}
                </span>
              )}
            </div>
          )}
        </div>
        
        {description && (
          <CardDescription className={descriptionClasses}>
            {description}
          </CardDescription>
        )}

        {!image && badges.length > 0 && (
          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
            {badges.map((badge, index) => (
              <Badge key={index} variant={badge.variant || 'secondary'}>
                {badge.text}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      {children && (
        <CardContent className={cn(contentClasses, 'pt-0')}>
          {children}
        </CardContent>
      )}

      {actions.length > 0 && (
        <CardFooter className={cn(contentClasses, 'pt-0')}>
          <div className={cn(
            'flex gap-2 w-full',
            {
              'flex-col sm:flex-row': isMobile && actions.length > 1,
              'flex-row': !isMobile || actions.length === 1
            }
          )}>
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'default'}
                size={isMobile ? 'default' : 'sm'}
                onClick={action.onClick}
                className={cn(
                  {
                    'flex-1': isMobile && actions.length > 1,
                    'w-full': isMobile && actions.length === 1
                  },
                  mobileUtils.buttonSize
                )}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * Responsive Grid wrapper for cards
 */
interface ResponsiveCardGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveCardGrid({
  children,
  columns = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className
}: ResponsiveCardGridProps) {
  const gridClasses = cn(
    'grid',
    // Responsive columns
    `grid-cols-${columns.xs || 1}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    // Gap sizes
    {
      'gap-3 sm:gap-4': gap === 'sm',
      'gap-4 sm:gap-6': gap === 'md',
      'gap-6 sm:gap-8': gap === 'lg'
    },
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}