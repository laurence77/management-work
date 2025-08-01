/**
 * Responsive Utilities for Celebrity Booking Platform
 * Provides hooks and utilities for responsive design
 */

import { useState, useEffect } from 'react';

export interface BreakpointConfig {
  xs: number;  // Extra small devices (phones, 600px and down)
  sm: number;  // Small devices (portrait tablets and large phones, 600px and up)
  md: number;  // Medium devices (landscape tablets, 768px and up)
  lg: number;  // Large devices (laptops/desktops, 992px and up)
  xl: number;  // Extra large devices (large laptops and desktops, 1200px and up)
  xxl: number; // Extra extra large devices (1400px and up)
}

const defaultBreakpoints: BreakpointConfig = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536
};

export type BreakpointKey = keyof BreakpointConfig;
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

/**
 * Hook to get current screen size and breakpoint information
 */
export function useScreenSize(breakpoints: BreakpointConfig = defaultBreakpoints) {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    breakpoint: 'md' as BreakpointKey,
    deviceType: 'desktop' as DeviceType,
    orientation: 'landscape' as Orientation,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine current breakpoint
      let breakpoint: BreakpointKey = 'xs';
      for (const [key, value] of Object.entries(breakpoints).reverse()) {
        if (width >= value) {
          breakpoint = key as BreakpointKey;
          break;
        }
      }

      // Determine device type
      let deviceType: DeviceType = 'desktop';
      if (width < breakpoints.sm) {
        deviceType = 'mobile';
      } else if (width < breakpoints.lg) {
        deviceType = 'tablet';
      }

      // Determine orientation
      const orientation: Orientation = width > height ? 'landscape' : 'portrait';

      // Check if touch device
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setScreenSize({
        width,
        height,
        breakpoint,
        deviceType,
        orientation,
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop',
        isTouch
      });
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    window.addEventListener('orientationchange', updateScreenSize);

    return () => {
      window.removeEventListener('resize', updateScreenSize);
      window.removeEventListener('orientationchange', updateScreenSize);
    };
  }, [breakpoints]);

  return screenSize;
}

/**
 * Hook to check if screen size matches specific breakpoint(s)
 */
export function useBreakpoint(
  breakpoint: BreakpointKey | BreakpointKey[],
  breakpoints: BreakpointConfig = defaultBreakpoints
) {
  const { breakpoint: currentBreakpoint, width } = useScreenSize(breakpoints);
  
  if (Array.isArray(breakpoint)) {
    return breakpoint.includes(currentBreakpoint);
  }

  return currentBreakpoint === breakpoint;
}

/**
 * Hook to check if screen size is at least the specified breakpoint
 */
export function useMediaQuery(
  breakpoint: BreakpointKey,
  breakpoints: BreakpointConfig = defaultBreakpoints
) {
  const { width } = useScreenSize(breakpoints);
  return width >= breakpoints[breakpoint];
}

/**
 * Responsive class utility - generates responsive classes based on screen size
 */
export function responsiveClass(
  base: string,
  responsive: Partial<Record<BreakpointKey, string>>
): string {
  const classes = [base];
  
  Object.entries(responsive).forEach(([breakpoint, className]) => {
    if (className) {
      classes.push(`${breakpoint}:${className}`);
    }
  });
  
  return classes.join(' ');
}

/**
 * Container classes for responsive layouts
 */
export const containerClasses = {
  // Responsive containers
  container: 'mx-auto px-4 sm:px-6 lg:px-8',
  containerTight: 'mx-auto px-3 sm:px-4 lg:px-6',
  containerWide: 'mx-auto px-6 sm:px-8 lg:px-12',
  
  // Max widths
  maxWidth: {
    xs: 'max-w-screen-xs',
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    xxl: 'max-w-screen-2xl'
  },
  
  // Grid layouts
  grid: {
    responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6',
    cards: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6',
    features: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8',
    stats: 'grid grid-cols-2 sm:grid-cols-4 gap-4',
    form: 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'
  },
  
  // Flex layouts
  flex: {
    responsive: 'flex flex-col sm:flex-row',
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    wrap: 'flex flex-wrap items-center gap-2 sm:gap-4'
  },
  
  // Spacing
  spacing: {
    section: 'py-8 sm:py-12 lg:py-16',
    component: 'p-4 sm:p-6 lg:p-8',
    tight: 'p-3 sm:p-4 lg:p-6'
  },
  
  // Typography
  text: {
    hero: 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold',
    heading: 'text-2xl sm:text-3xl lg:text-4xl font-semibold',
    subheading: 'text-lg sm:text-xl lg:text-2xl font-medium',
    body: 'text-sm sm:text-base',
    small: 'text-xs sm:text-sm'
  }
};

/**
 * Mobile-first responsive utilities
 */
export const mobileUtils = {
  // Touch-friendly sizes
  touchTarget: 'min-h-[44px] min-w-[44px]', // iOS recommended touch target
  buttonSize: 'h-12 px-6 text-base sm:h-10 sm:px-4 sm:text-sm',
  inputSize: 'h-12 px-4 text-base sm:h-10 sm:px-3 sm:text-sm',
  
  // Mobile-specific classes
  mobileOnly: 'block sm:hidden',
  desktopOnly: 'hidden sm:block',
  tabletUp: 'hidden md:block',
  
  // Safe areas for mobile devices
  safeArea: {
    top: 'pt-safe-top',
    bottom: 'pb-safe-bottom',
    left: 'pl-safe-left',
    right: 'pr-safe-right',
    all: 'p-safe'
  },
  
  // Mobile navigation
  mobileNav: {
    height: 'h-16 sm:h-14',
    padding: 'px-4 sm:px-6',
    fontSize: 'text-base sm:text-sm'
  }
};

/**
 * Responsive image utilities
 */
export const imageUtils = {
  responsive: 'w-full h-auto',
  avatar: {
    sm: 'w-8 h-8 sm:w-6 sm:h-6',
    md: 'w-12 h-12 sm:w-10 sm:h-10',
    lg: 'w-16 h-16 sm:w-14 sm:h-14',
    xl: 'w-24 h-24 sm:w-20 sm:h-20'
  },
  hero: 'w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover',
  card: 'w-full h-32 sm:h-40 md:h-48 object-cover'
};

/**
 * Animation utilities for mobile
 */
export const animationUtils = {
  // Respect user's motion preferences
  motion: 'motion-safe:transition-all motion-safe:duration-200',
  motionReduce: 'motion-reduce:transition-none motion-reduce:transform-none',
  
  // Touch-friendly animations
  touchScale: 'active:scale-95 transition-transform duration-150',
  hoverScale: 'hover:scale-105 active:scale-95 transition-transform duration-200',
  
  // Mobile-specific animations
  slideIn: {
    left: 'transform transition-transform duration-300 translate-x-full data-[state=open]:translate-x-0',
    right: 'transform transition-transform duration-300 -translate-x-full data-[state=open]:translate-x-0',
    up: 'transform transition-transform duration-300 translate-y-full data-[state=open]:translate-y-0',
    down: 'transform transition-transform duration-300 -translate-y-full data-[state=open]:translate-y-0'
  }
};

/**
 * Performance utilities for mobile
 */
export const performanceUtils = {
  // Lazy loading
  lazyImage: 'loading-lazy',
  
  // GPU acceleration
  gpu: 'transform-gpu',
  
  // Content visibility
  contentVisibility: 'content-visibility-auto',
  
  // Scroll optimization
  scrollSmooth: 'scroll-smooth',
  scrollBehavior: 'scroll-behavior-smooth'
};

/**
 * Accessibility utilities for mobile
 */
export const a11yUtils = {
  // Focus management
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  focusTrap: 'focus:outline-none focus:ring-2 focus:ring-blue-500',
  
  // Screen reader
  srOnly: 'sr-only',
  
  // Touch accessibility
  touchAccessible: 'select-none touch-manipulation',
  
  // High contrast support
  highContrast: 'contrast-more:border-black contrast-more:text-black'
};

/**
 * Helper function to generate responsive props
 */
export function generateResponsiveProps<T>(
  value: T | Partial<Record<BreakpointKey, T>>,
  defaultValue: T
): Partial<Record<BreakpointKey, T>> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Partial<Record<BreakpointKey, T>>;
  }
  
  return { xs: value as T || defaultValue };
}

/**
 * Responsive value hook - returns different values based on screen size
 */
export function useResponsiveValue<T>(
  values: Partial<Record<BreakpointKey, T>>,
  fallback: T
): T {
  const { breakpoint } = useScreenSize();
  
  // Get value for current breakpoint or closest smaller one
  const breakpointOrder: BreakpointKey[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp]!;
    }
  }
  
  return fallback;
}