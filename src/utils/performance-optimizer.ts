/**
 * Performance Optimization Service
 * Comprehensive performance monitoring and optimization utilities
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'resource' | 'measure' | 'custom';
}

interface LoadingState {
  isLoading: boolean;
  component?: string;
  startTime?: number;
}

class PerformanceOptimizer {
  private metrics: PerformanceMetric[] = [];
  private loadingStates = new Map<string, LoadingState>();
  private observer?: PerformanceObserver;
  
  constructor() {
    this.initializePerformanceObserver();
    this.setupVitalsTracking();
  }

  /**
   * Initialize performance observer for automatic metrics collection
   */
  private initializePerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            value: entry.duration || entry.transferSize || 0,
            timestamp: Date.now(),
            type: this.getEntryType(entry)
          });
        });
      });

      try {
        this.observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
      } catch (error) {
        console.warn('Performance observer not fully supported:', error);
      }
    }
  }

  /**
   * Setup Core Web Vitals tracking
   */
  private setupVitalsTracking() {
    if (typeof window !== 'undefined') {
      // Track First Contentful Paint
      this.trackFCP();
      
      // Track Largest Contentful Paint
      this.trackLCP();
      
      // Track Cumulative Layout Shift
      this.trackCLS();
      
      // Track First Input Delay
      this.trackFID();
    }
  }

  /**
   * Track First Contentful Paint
   */
  private trackFCP() {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        this.recordMetric({
          name: 'first-contentful-paint',
          value: fcp.startTime,
          timestamp: Date.now(),
          type: 'navigation'
        });
      }
    });

    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('FCP tracking not supported:', error);
    }
  }

  /**
   * Track Largest Contentful Paint
   */
  private trackLCP() {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric({
        name: 'largest-contentful-paint',
        value: lastEntry.startTime,
        timestamp: Date.now(),
        type: 'navigation'
      });
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP tracking not supported:', error);
    }
  }

  /**
   * Track Cumulative Layout Shift
   */
  private trackCLS() {
    let clsValue = 0;
    
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      this.recordMetric({
        name: 'cumulative-layout-shift',
        value: clsValue,
        timestamp: Date.now(),
        type: 'navigation'
      });
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS tracking not supported:', error);
    }
  }

  /**
   * Track First Input Delay
   */
  private trackFID() {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.recordMetric({
          name: 'first-input-delay',
          value: entry.processingStart - entry.startTime,
          timestamp: Date.now(),
          type: 'navigation'
        });
      });
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID tracking not supported:', error);
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log concerning metrics
    this.analyzeMetric(metric);
  }

  /**
   * Start tracking component loading
   */
  startComponentLoading(componentName: string) {
    this.loadingStates.set(componentName, {
      isLoading: true,
      component: componentName,
      startTime: Date.now()
    });
  }

  /**
   * End tracking component loading
   */
  endComponentLoading(componentName: string) {
    const loadingState = this.loadingStates.get(componentName);
    if (loadingState && loadingState.startTime) {
      const loadTime = Date.now() - loadingState.startTime;
      
      this.recordMetric({
        name: `component-load-${componentName}`,
        value: loadTime,
        timestamp: Date.now(),
        type: 'custom'
      });

      this.loadingStates.delete(componentName);
    }
  }

  /**
   * Track bundle size and load times
   */
  trackBundleMetrics() {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // DOM Content Loaded
        this.recordMetric({
          name: 'dom-content-loaded',
          value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          timestamp: Date.now(),
          type: 'navigation'
        });

        // Page Load Complete
        this.recordMetric({
          name: 'page-load-complete',
          value: navigation.loadEventEnd - navigation.loadEventStart,
          timestamp: Date.now(),
          type: 'navigation'
        });

        // DNS Lookup Time
        this.recordMetric({
          name: 'dns-lookup-time',
          value: navigation.domainLookupEnd - navigation.domainLookupStart,
          timestamp: Date.now(),
          type: 'navigation'
        });

        // Server Response Time
        this.recordMetric({
          name: 'server-response-time',
          value: navigation.responseEnd - navigation.requestStart,
          timestamp: Date.now(),
          type: 'navigation'
        });
      }

      // Track resource loading
      const resources = window.performance.getEntriesByType('resource');
      const jsResources = resources.filter((resource: any) => 
        resource.name.includes('.js') || resource.name.includes('chunk')
      );

      let totalJSSize = 0;
      let totalJSLoadTime = 0;

      jsResources.forEach((resource: any) => {
        totalJSSize += resource.transferSize || 0;
        totalJSLoadTime += resource.duration || 0;
      });

      this.recordMetric({
        name: 'total-js-bundle-size',
        value: totalJSSize,
        timestamp: Date.now(),
        type: 'resource'
      });

      this.recordMetric({
        name: 'total-js-load-time',
        value: totalJSLoadTime,
        timestamp: Date.now(),
        type: 'resource'
      });
    }
  }

  /**
   * Analyze metric and provide warnings
   */
  private analyzeMetric(metric: PerformanceMetric) {
    const thresholds = {
      'first-contentful-paint': 1800, // 1.8s
      'largest-contentful-paint': 2500, // 2.5s
      'cumulative-layout-shift': 0.1,
      'first-input-delay': 100, // 100ms
      'component-load': 2000, // 2s
      'server-response-time': 600, // 600ms
      'total-js-bundle-size': 250000 // 250KB
    };

    const threshold = Object.entries(thresholds).find(([key]) => 
      metric.name.includes(key)
    )?.[1];

    if (threshold && metric.value > threshold) {
      console.warn(`Performance concern: ${metric.name} (${metric.value}) exceeds threshold (${threshold})`);
      
      // Provide specific recommendations
      this.provideOptimizationRecommendation(metric);
    }
  }

  /**
   * Provide optimization recommendations
   */
  private provideOptimizationRecommendation(metric: PerformanceMetric) {
    const recommendations = {
      'first-contentful-paint': 'Consider reducing initial bundle size or implementing better code splitting',
      'largest-contentful-paint': 'Optimize images and fonts, consider using WebP format',
      'cumulative-layout-shift': 'Add size attributes to images and avoid dynamic content insertion',
      'first-input-delay': 'Reduce JavaScript execution time during initial load',
      'component-load': 'Implement more aggressive code splitting for this component',
      'server-response-time': 'Optimize server response times and consider CDN usage',
      'total-js-bundle-size': 'Implement tree shaking and remove unused dependencies'
    };

    const recommendation = Object.entries(recommendations).find(([key]) => 
      metric.name.includes(key)
    )?.[1];

    if (recommendation) {
      console.info(`Recommendation for ${metric.name}: ${recommendation}`);
    }
  }

  /**
   * Get entry type from performance entry
   */
  private getEntryType(entry: PerformanceEntry): PerformanceMetric['type'] {
    if (entry.entryType === 'navigation') return 'navigation';
    if (entry.entryType === 'resource') return 'resource';
    if (entry.entryType === 'measure') return 'measure';
    return 'custom';
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      vitals: {},
      bundles: {},
      components: {},
      recommendations: []
    };

    // Group metrics by type
    const vitalMetrics = this.metrics.filter(m => 
      ['first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift', 'first-input-delay']
        .some(vital => m.name.includes(vital))
    );

    const bundleMetrics = this.metrics.filter(m => 
      ['bundle-size', 'load-time', 'dns-lookup', 'server-response']
        .some(bundle => m.name.includes(bundle))
    );

    const componentMetrics = this.metrics.filter(m => 
      m.name.includes('component-load')
    );

    // Summarize vitals
    vitalMetrics.forEach(metric => {
      summary.vitals[metric.name] = metric.value;
    });

    // Summarize bundles
    bundleMetrics.forEach(metric => {
      summary.bundles[metric.name] = metric.value;
    });

    // Summarize components
    componentMetrics.forEach(metric => {
      summary.components[metric.name] = metric.value;
    });

    return summary;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      metrics: this.metrics,
      summary: this.getPerformanceSummary()
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.loadingStates.clear();
  }

  /**
   * Destroy the performance optimizer
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.clearMetrics();
  }
}

// Create singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

/**
 * React Hook for performance tracking
 */
export function usePerformanceTracking(componentName: string) {
  const startTracking = () => {
    performanceOptimizer.startComponentLoading(componentName);
  };

  const endTracking = () => {
    performanceOptimizer.endComponentLoading(componentName);
  };

  return { startTracking, endTracking };
}

/**
 * Higher-order component for automatic performance tracking
 */
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return (props: P) => {
    React.useEffect(() => {
      performanceOptimizer.startComponentLoading(componentName);
      
      return () => {
        performanceOptimizer.endComponentLoading(componentName);
      };
    }, []);

    return React.createElement(WrappedComponent, props);
  };
}

/**
 * Initialize performance tracking on app start
 */
export function initializePerformanceTracking() {
  // Track initial bundle metrics
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        performanceOptimizer.trackBundleMetrics();
      }, 100);
    });
  }
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  initializePerformanceTracking();
}