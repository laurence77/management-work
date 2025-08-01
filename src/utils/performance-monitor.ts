/**
 * Performance Monitoring Utilities
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface ErrorMetric {
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  tags?: Record<string, string>;
}

export interface UserInteractionMetric {
  action: string;
  element: string;
  timestamp: number;
  duration?: number;
  userId?: string;
  tags?: Record<string, string>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorMetric[] = [];
  private interactions: UserInteractionMetric[] = [];
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds
  private apiEndpoint = '/api/metrics';
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupPerformanceObserver();
    this.setupErrorHandling();
    this.setupUserInteractionTracking();
    this.startAutoFlush();
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>, unit?: string): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      unit
    };

    this.metrics.push(metric);
    this.checkAndFlush();
  }

  /**
   * Record an error
   */
  recordError(error: Error, tags?: Record<string, string>): void {
    const errorMetric: ErrorMetric = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
      tags
    };

    this.errors.push(errorMetric);
    this.checkAndFlush();
  }

  /**
   * Record user interaction
   */
  recordInteraction(action: string, element: string, duration?: number, tags?: Record<string, string>): void {
    const interaction: UserInteractionMetric = {
      action,
      element,
      timestamp: Date.now(),
      duration,
      userId: this.getCurrentUserId(),
      tags
    };

    this.interactions.push(interaction);
    this.checkAndFlush();
  }

  /**
   * Set up Performance Observer for Web Vitals
   */
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
    
    // Navigation timing
    this.observeNavigation();
    
    // Resource timing
    this.observeResources();
  }

  /**
   * Observe Largest Contentful Paint (LCP)
   */
  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          this.recordMetric('lcp', entry.startTime, {
            element: (entry as any).element?.tagName || 'unknown'
          }, 'ms');
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (error) {
      console.warn('LCP observation failed:', error);
    }
  }

  /**
   * Observe First Input Delay (FID)
   */
  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          this.recordMetric('fid', (entry as any).processingStart - entry.startTime, {
            eventType: (entry as any).name
          }, 'ms');
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
    } catch (error) {
      console.warn('FID observation failed:', error);
    }
  }

  /**
   * Observe Cumulative Layout Shift (CLS)
   */
  private observeCLS(): void {
    try {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        
        this.recordMetric('cls', clsValue, {}, 'score');
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      console.warn('CLS observation failed:', error);
    }
  }

  /**
   * Observe First Contentful Paint (FCP)
   */
  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('fcp', entry.startTime, {}, 'ms');
          }
        }
      });

      observer.observe({ type: 'paint', buffered: true });
    } catch (error) {
      console.warn('FCP observation failed:', error);
    }
  }

  /**
   * Observe Time to First Byte (TTFB)
   */
  private observeTTFB(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const navEntry = entry as PerformanceNavigationTiming;
          const ttfb = navEntry.responseStart - navEntry.requestStart;
          this.recordMetric('ttfb', ttfb, {
            type: 'navigation'
          }, 'ms');
        }
      });

      observer.observe({ type: 'navigation', buffered: true });
    } catch (error) {
      console.warn('TTFB observation failed:', error);
    }
  }

  /**
   * Observe navigation timing
   */
  private observeNavigation(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart, {
          type: 'full_page_load'
        }, 'ms');
        
        this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, {
          type: 'dom_ready'
        }, 'ms');
        
        this.recordMetric('dns_lookup', navigation.domainLookupEnd - navigation.domainLookupStart, {
          type: 'dns'
        }, 'ms');
        
        this.recordMetric('tcp_connection', navigation.connectEnd - navigation.connectStart, {
          type: 'tcp'
        }, 'ms');
      }
    });
  }

  /**
   * Observe resource timing
   */
  private observeResources(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Track slow resources
          if (resourceEntry.duration > 1000) { // Resources taking more than 1 second
            this.recordMetric('slow_resource', resourceEntry.duration, {
              name: resourceEntry.name,
              type: this.getResourceType(resourceEntry.name),
              size: resourceEntry.transferSize?.toString() || 'unknown'
            }, 'ms');
          }
        }
      });

      observer.observe({ type: 'resource', buffered: true });
    } catch (error) {
      console.warn('Resource observation failed:', error);
    }
  }

  /**
   * Set up global error handling
   */
  private setupErrorHandling(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno?.toString(),
        colno: event.colno?.toString(),
        type: 'javascript_error'
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(new Error(event.reason?.message || 'Unhandled promise rejection'), {
        type: 'promise_rejection',
        reason: event.reason?.toString()
      });
    });

    // React error boundary errors (if using React)
    if (typeof window !== 'undefined' && (window as any).__REACT_ERROR_OVERLAY_GLOBAL_HOOK__) {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args[0]?.includes?.('React') || args[0]?.includes?.('Warning')) {
          this.recordError(new Error(args.join(' ')), {
            type: 'react_error'
          });
        }
        originalConsoleError.apply(console, args);
      };
    }
  }

  /**
   * Set up user interaction tracking
   */
  private setupUserInteractionTracking(): void {
    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.recordInteraction('click', this.getElementSelector(target), undefined, {
          tagName: target.tagName.toLowerCase(),
          className: target.className,
          id: target.id
        });
      }
    });

    // Form submissions
    document.addEventListener('submit', (event) => {
      const target = event.target as HTMLFormElement;
      if (target) {
        this.recordInteraction('form_submit', this.getElementSelector(target), undefined, {
          action: target.action,
          method: target.method
        });
      }
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.recordInteraction('visibility_change', 'document', undefined, {
        visible: (!document.hidden).toString()
      });
    });
  }

  /**
   * Track API call performance
   */
  trackAPICall(url: string, method: string, startTime: number, endTime: number, status: number): void {
    const duration = endTime - startTime;
    
    this.recordMetric('api_call_duration', duration, {
      url: this.sanitizeUrl(url),
      method,
      status: status.toString(),
      success: (status >= 200 && status < 300).toString()
    }, 'ms');

    // Track slow API calls
    if (duration > 5000) { // Calls taking more than 5 seconds
      this.recordMetric('slow_api_call', duration, {
        url: this.sanitizeUrl(url),
        method,
        status: status.toString()
      }, 'ms');
    }

    // Track API errors
    if (status >= 400) {
      this.recordError(new Error(`API Error: ${status}`), {
        url: this.sanitizeUrl(url),
        method,
        status: status.toString(),
        type: 'api_error'
      });
    }
  }

  /**
   * Track route changes
   */
  trackRouteChange(from: string, to: string, duration: number): void {
    this.recordMetric('route_change_duration', duration, {
      from: this.sanitizeUrl(from),
      to: this.sanitizeUrl(to)
    }, 'ms');

    this.recordInteraction('route_change', 'router', duration, {
      from: this.sanitizeUrl(from),
      to: this.sanitizeUrl(to)
    });
  }

  /**
   * Track custom business metrics
   */
  trackBusinessMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric(`business.${name}`, value, tags);
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memory_used', memory.usedJSHeapSize, {}, 'bytes');
      this.recordMetric('memory_total', memory.totalJSHeapSize, {}, 'bytes');
      this.recordMetric('memory_limit', memory.jsHeapSizeLimit, {}, 'bytes');
    }
  }

  /**
   * Flush all metrics to the server
   */
  async flush(): Promise<void> {
    if (this.metrics.length === 0 && this.errors.length === 0 && this.interactions.length === 0) {
      return;
    }

    const payload = {
      metrics: [...this.metrics],
      errors: [...this.errors],
      interactions: [...this.interactions],
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getCurrentUserId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer
    };

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Clear the buffers after successful send
      this.metrics = [];
      this.errors = [];
      this.interactions = [];
    } catch (error) {
      console.warn('Failed to send metrics:', error);
      // Keep metrics in buffer for retry
    }
  }

  /**
   * Check if we need to flush and do so if necessary
   */
  private checkAndFlush(): void {
    const totalItems = this.metrics.length + this.errors.length + this.interactions.length;
    if (totalItems >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
      this.getMemoryUsage(); // Track memory usage periodically
    }, this.flushInterval);
  }

  /**
   * Helper methods
   */
  private getResourceType(url: string): string {
    if (url.match(/\.(js|jsx|ts|tsx)$/)) return 'script';
    if (url.match(/\.(css|scss|sass)$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      // Remove sensitive query parameters
      urlObj.searchParams.delete('token');
      urlObj.searchParams.delete('password');
      urlObj.searchParams.delete('api_key');
      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  }

  private getCurrentUserId(): string | undefined {
    // Get user ID from your authentication system
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.userId;
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('performance_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('performance_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Cleanup when the page is about to unload
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush with sendBeacon for reliability
    if (navigator.sendBeacon && (this.metrics.length > 0 || this.errors.length > 0 || this.interactions.length > 0)) {
      const payload = JSON.stringify({
        metrics: this.metrics,
        errors: this.errors,
        interactions: this.interactions,
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        userId: this.getCurrentUserId(),
        final: true
      });
      
      navigator.sendBeacon(this.apiEndpoint, payload);
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  performanceMonitor.cleanup();
});

// Export types and utilities
export { PerformanceMonitor };

// Helper functions for common tracking scenarios
export const trackPageView = (pageName: string) => {
  performanceMonitor.recordInteraction('page_view', 'page', undefined, {
    page: pageName
  });
};

export const trackButtonClick = (buttonName: string, duration?: number) => {
  performanceMonitor.recordInteraction('button_click', buttonName, duration);
};

export const trackFormSubmission = (formName: string, success: boolean, duration?: number) => {
  performanceMonitor.recordInteraction('form_submit', formName, duration, {
    success: success.toString()
  });
};

export const trackSearchQuery = (query: string, resultCount: number, duration: number) => {
  performanceMonitor.trackBusinessMetric('search.query', 1, {
    query_length: query.length.toString(),
    result_count: resultCount.toString()
  });
  
  performanceMonitor.recordMetric('search_duration', duration, {
    result_count: resultCount.toString()
  }, 'ms');
};