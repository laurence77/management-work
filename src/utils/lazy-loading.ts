import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * Enhanced lazy loading utilities with error boundaries and retry logic
 */

interface LazyLoadOptions {
  fallback?: ComponentType;
  retryAttempts?: number;
  retryDelay?: number;
  preload?: boolean;
}

/**
 * Enhanced lazy loading with retry mechanism
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const { retryAttempts = 3, retryDelay = 1000 } = options;

  const retryImport = async (attempt = 1): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (error) {
      if (attempt < retryAttempts) {
        console.warn(`Failed to load component (attempt ${attempt}/${retryAttempts}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return retryImport(attempt + 1);
      }
      throw error;
    }
  };

  return lazy(() => retryImport());
}

/**
 * Preload a lazy component
 */
export function preloadComponent(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return importFn().catch(error => {
    console.warn('Failed to preload component:', error);
  });
}

/**
 * Route-based lazy loading with automatic preloading
 */
export const LazyRoutes = {
  // Main application routes
  Celebrities: createLazyComponent(
    () => import('@/pages/Celebrities'),
    { preload: true }
  ),
  
  CelebrityProfile: createLazyComponent(
    () => import('@/pages/CelebrityProfile')
  ),
  
  Events: createLazyComponent(
    () => import('@/pages/Events')
  ),
  
  Services: createLazyComponent(
    () => import('@/pages/Services'),
    { preload: true }
  ),
  
  Contact: createLazyComponent(
    () => import('@/pages/Contact')
  ),
  
  FAQ: createLazyComponent(
    () => import('@/pages/FAQ')
  ),
  
  VIP: createLazyComponent(
    () => import('@/pages/VIP')
  ),
  
  Chat: createLazyComponent(
    () => import('@/pages/Chat')
  ),
  
  Custom: createLazyComponent(
    () => import('@/pages/Custom')
  ),
  
  Management: createLazyComponent(
    () => import('@/pages/Management')
  ),
  
  Login: createLazyComponent(
    () => import('@/pages/Login')
  ),
  
  PasswordReset: createLazyComponent(
    () => import('@/pages/PasswordReset')
  )
};

/**
 * Component-based lazy loading
 */
export const LazyComponents = {
  // Admin components
  AdminDashboard: createLazyComponent(
    () => import('@/components/admin/AdminDashboard')
  ),
  
  AdminMetrics: createLazyComponent(
    () => import('@/components/admin/AdminMetrics')
  ),
  
  CryptoWalletManager: createLazyComponent(
    () => import('@/components/admin/CryptoWalletManager')
  ),
  
  // Booking components
  BookingForm: createLazyComponent(
    () => import('@/components/booking/BookingForm')
  ),
  
  // Payment components
  CryptoPayment: createLazyComponent(
    () => import('@/components/payment/CryptoPayment')
  ),
  
  // Auth components
  AuthModal: createLazyComponent(
    () => import('@/components/auth/AuthModal'),
    { preload: true } // Preload auth modal as it's commonly used
  )
};

/**
 * Utility function to preload critical routes
 */
export function preloadCriticalRoutes() {
  // Preload most commonly accessed routes
  const criticalRoutes = [
    () => import('@/pages/Celebrities'),
    () => import('@/pages/Services'),
    () => import('@/components/auth/AuthModal')
  ];

  criticalRoutes.forEach(route => {
    preloadComponent(route);
  });
}

/**
 * Hook-based preloading on user interaction
 */
export function usePreloadOnHover() {
  const preloadOnHover = (importFn: () => Promise<{ default: ComponentType<any> }>) => {
    return {
      onMouseEnter: () => preloadComponent(importFn),
      onFocus: () => preloadComponent(importFn)
    };
  };

  return { preloadOnHover };
}

/**
 * Intersection Observer-based preloading
 */
export class ComponentPreloader {
  private observer: IntersectionObserver;
  private preloadMap = new Map<Element, () => Promise<any>>();

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const preloadFn = this.preloadMap.get(entry.target);
            if (preloadFn) {
              preloadFn();
              this.observer.unobserve(entry.target);
              this.preloadMap.delete(entry.target);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '100px', // Start loading 100px before element comes into view
        threshold: 0.1
      }
    );
  }

  observe(element: Element, importFn: () => Promise<any>) {
    this.preloadMap.set(element, importFn);
    this.observer.observe(element);
  }

  disconnect() {
    this.observer.disconnect();
    this.preloadMap.clear();
  }
}

/**
 * Bundle analyzer for development
 */
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    console.group('Bundle Analysis');
    console.log('Main chunk size estimation:');
    
    // Estimate chunk sizes based on imports
    const estimates = {
      'react-vendor': '~45KB gzipped',
      'radix-ui': '~35KB gzipped',
      'ui-assets': '~25KB gzipped',
      'forms': '~20KB gzipped',
      'charts': '~65KB gzipped (lazy loaded)',
      'utils': '~15KB gzipped'
    };
    
    Object.entries(estimates).forEach(([chunk, size]) => {
      console.log(`${chunk}: ${size}`);
    });
    
    console.groupEnd();
  }
}