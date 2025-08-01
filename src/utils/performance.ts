// Performance monitoring and optimization utilities

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  entryType: string;
}

interface PerformanceMetrics {
  renderTime: number;
  loadTime: number;
  networkTime: number;
  memoryUsage?: MemoryInfo;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceEntry[]> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Monitor navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('navigation', entry);
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      // Monitor resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('resource', entry);
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Monitor long tasks
      if ('PerformanceObserver' in window) {
        try {
          const longTaskObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              console.warn('Long task detected:', entry);
              this.recordMetric('longtask', entry);
            });
          });
          longTaskObserver.observe({ entryTypes: ['longtask'] });
          this.observers.push(longTaskObserver);
        } catch (e) {
          // Long task observer not supported in all browsers
        }
      }
    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error);
    }
  }

  private recordMetric(type: string, entry: PerformanceEntry) {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }
    
    const metrics = this.metrics.get(type)!;
    metrics.push({
      name: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
      entryType: entry.entryType
    });

    // Keep only last 100 entries per type
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
  }

  // Mark performance milestones
  mark(name: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(name);
    }
  }

  // Measure between marks
  measure(name: string, startMark: string, endMark?: string): number {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return 0;
    }

    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      const entries = performance.getEntriesByName(name, 'measure');
      const latestEntry = entries[entries.length - 1];
      return latestEntry ? latestEntry.duration : 0;
    } catch (error) {
      console.warn('Performance measure failed:', error);
      return 0;
    }
  }

  // Get current performance metrics
  getMetrics(): PerformanceMetrics {
    const navigationEntries = this.metrics.get('navigation') || [];
    const resourceEntries = this.metrics.get('resource') || [];

    const latestNavigation = navigationEntries[navigationEntries.length - 1];
    
    const renderTime = latestNavigation ? latestNavigation.duration : 0;
    const loadTime = performance.now();
    const networkTime = resourceEntries.reduce((total, entry) => total + entry.duration, 0);

    const metrics: PerformanceMetrics = {
      renderTime,
      loadTime,
      networkTime
    };

    // Add memory usage if available
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      metrics.memoryUsage = (performance as any).memory;
    }

    return metrics;
  }

  // Get slow resources
  getSlowResources(threshold: number = 1000): PerformanceEntry[] {
    const resourceEntries = this.metrics.get('resource') || [];
    return resourceEntries.filter(entry => entry.duration > threshold);
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics.clear();
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  // Cleanup observers
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// React hook for performance monitoring
import { useEffect, useRef } from 'react';

export const usePerformanceMonitor = (componentName: string) => {
  const startTime = useRef<number>(0);
  const monitor = PerformanceMonitor.getInstance();

  useEffect(() => {
    startTime.current = performance.now();
    monitor.mark(`${componentName}-start`);

    return () => {
      monitor.mark(`${componentName}-end`);
      const duration = monitor.measure(
        `${componentName}-render`,
        `${componentName}-start`,
        `${componentName}-end`
      );

      // Log slow renders
      if (duration > 16) { // 16ms for 60fps
        console.warn(`Slow render detected in ${componentName}:`, duration + 'ms');
      }
    };
  }, [componentName, monitor]);

  return {
    mark: (name: string) => monitor.mark(`${componentName}-${name}`),
    measure: (name: string, startMark: string, endMark?: string) => 
      monitor.measure(`${componentName}-${name}`, startMark, endMark),
    getMetrics: () => monitor.getMetrics()
  };
};

// Image lazy loading utility
export const createLazyImage = (src: string, placeholder?: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    // Use placeholder while loading
    if (placeholder) {
      img.src = placeholder;
    }
    
    // Load actual image
    requestIdleCallback(() => {
      img.src = src;
    });
  });
};

// Bundle size optimization - dynamic imports
export const importLazily = <T>(importFn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    requestIdleCallback(() => {
      importFn().then(resolve).catch(reject);
    });
  });
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if (typeof window === 'undefined' || !('performance' in window) || !('memory' in performance)) {
    return null;
  }

  const memory = (performance as any).memory;
  return {
    used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
    total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
    limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
  };
};

// Web Vitals tracking
export interface WebVitals {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

export const trackWebVitals = (callback: (vitals: WebVitals) => void) => {
  const vitals: WebVitals = {};

  // First Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        vitals.FCP = entry.startTime;
        callback(vitals);
      }
    });
  }).observe({ entryTypes: ['paint'] });

  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    vitals.LCP = lastEntry.startTime;
    callback(vitals);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      vitals.FID = entry.processingStart - entry.startTime;
      callback(vitals);
    });
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift
  let cumulativeLayoutShift = 0;
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      if (!entry.hadRecentInput) {
        cumulativeLayoutShift += entry.value;
        vitals.CLS = cumulativeLayoutShift;
        callback(vitals);
      }
    });
  }).observe({ entryTypes: ['layout-shift'] });

  // Time to First Byte
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      vitals.TTFB = entry.responseStart - entry.requestStart;
      callback(vitals);
    });
  }).observe({ entryTypes: ['navigation'] });
};

export default PerformanceMonitor;