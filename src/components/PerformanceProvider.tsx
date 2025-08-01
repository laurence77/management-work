/**
 * Performance Monitoring Provider
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { performanceMonitor } from '@/utils/performance-monitor';
import { alertManager } from '@/utils/alerting';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

interface PerformanceContextType {
  recordMetric: (name: string, value: number, tags?: Record<string, string>, unit?: string) => void;
  recordBusinessMetric: (name: string, value: number, tags?: Record<string, string>) => void;
  recordError: (error: Error, tags?: Record<string, string>) => void;
  recordInteraction: (action: string, element: string, duration?: number, tags?: Record<string, string>) => void;
  trackButton: (buttonName: string, duration?: number) => void;
  trackForm: (formName: string, success: boolean, duration?: number) => void;
  trackAPIRequest: (url: string, method: string, startTime: number, endTime: number, status: number) => void;
  startRouteChange: () => void;
  endRouteChange: (from: string, to: string) => void;
  flushMetrics: () => Promise<void>;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function usePerformanceContext() {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformanceContext must be used within a PerformanceProvider');
  }
  return context;
}

interface PerformanceProviderProps {
  children: ReactNode;
  enableRouteTracking?: boolean;
  enableAPITracking?: boolean;
  enableErrorTracking?: boolean;
  enableUserInteractionTracking?: boolean;
  enableAlerting?: boolean;
}

export function PerformanceProvider({
  children,
  enableRouteTracking = true,
  enableAPITracking = true,
  enableErrorTracking = true,
  enableUserInteractionTracking = true,
  enableAlerting = true
}: PerformanceProviderProps) {
  const location = useLocation();
  const previousLocation = React.useRef<string>('');
  const routeChangeStartTime = React.useRef<number | null>(null);

  const {
    recordMetric,
    recordBusinessMetric,
    recordError,
    recordInteraction,
    trackButton,
    trackForm,
    trackAPIRequest,
    startRouteChange,
    endRouteChange,
    flushMetrics
  } = usePerformanceMonitoring({
    trackPageViews: true,
    trackUserInteractions: enableUserInteractionTracking,
    trackAPIRequests: enableAPITracking,
    trackRouteChanges: enableRouteTracking,
    autoTrackComponents: true
  });

  // Track route changes
  useEffect(() => {
    if (!enableRouteTracking) return;

    const currentPath = location.pathname + location.search;
    
    if (previousLocation.current && previousLocation.current !== currentPath) {
      // Route change completed
      if (routeChangeStartTime.current) {
        const duration = Date.now() - routeChangeStartTime.current;
        endRouteChange(previousLocation.current, currentPath);
        
        // Record specific route metrics
        recordMetric('route_change_duration', duration, {
          from: previousLocation.current,
          to: currentPath,
          from_page: previousLocation.current.split('?')[0],
          to_page: currentPath.split('?')[0]
        }, 'ms');
        
        routeChangeStartTime.current = null;
      }
    }

    // Start tracking for next route change
    if (previousLocation.current !== currentPath) {
      routeChangeStartTime.current = Date.now();
      startRouteChange();
    }

    previousLocation.current = currentPath;
  }, [location, enableRouteTracking, startRouteChange, endRouteChange, recordMetric]);

  // Set up API request interceptor
  useEffect(() => {
    if (!enableAPITracking) return;

    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      try {
        const response = await originalFetch(input, init);
        const endTime = Date.now();
        
        trackAPIRequest(url, method, startTime, endTime, response.status);
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        trackAPIRequest(url, method, startTime, endTime, 0);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [enableAPITracking, trackAPIRequest]);

  // Set up global error tracking
  useEffect(() => {
    if (!enableErrorTracking) return;

    const handleError = (event: ErrorEvent) => {
      recordError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno?.toString(),
        colno: event.colno?.toString(),
        type: 'javascript_error',
        url: window.location.href
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      recordError(new Error(event.reason?.message || 'Unhandled promise rejection'), {
        type: 'promise_rejection',
        reason: event.reason?.toString(),
        url: window.location.href
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [enableErrorTracking, recordError]);

  // Connect performance metrics to alerting system
  useEffect(() => {
    if (!enableAlerting) return;

    // Override recordMetric to also feed the alert system
    const originalRecordMetric = performanceMonitor.recordMetric.bind(performanceMonitor);
    
    performanceMonitor.recordMetric = (name: string, value: number, tags?: Record<string, string>, unit?: string) => {
      // Call original method
      originalRecordMetric(name, value, tags, unit);
      
      // Feed to alert manager
      alertManager.recordMetric(name, value);
    };

    return () => {
      // Restore original method
      performanceMonitor.recordMetric = originalRecordMetric;
    };
  }, [enableAlerting]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      recordInteraction('visibility_change', 'document', undefined, {
        visible: (!document.hidden).toString(),
        page: location.pathname
      });

      if (document.hidden) {
        // Page is hidden, flush metrics
        flushMetrics();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [recordInteraction, flushMetrics, location.pathname]);

  // Track performance metrics periodically
  useEffect(() => {
    const trackPerformanceMetrics = () => {
      // Memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        recordMetric('memory_used', memory.usedJSHeapSize, {
          page: location.pathname
        }, 'bytes');
        
        recordMetric('memory_total', memory.totalJSHeapSize, {
          page: location.pathname
        }, 'bytes');
      }

      // Connection information
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          recordMetric('network_downlink', connection.downlink || 0, {
            type: connection.effectiveType || 'unknown',
            page: location.pathname
          }, 'mbps');
        }
      }

      // Battery information
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          recordMetric('battery_level', battery.level * 100, {
            charging: battery.charging.toString(),
            page: location.pathname
          }, 'percent');
        }).catch(() => {
          // Battery API not available or permission denied
        });
      }
    };

    // Track immediately and then every 30 seconds
    trackPerformanceMetrics();
    const interval = setInterval(trackPerformanceMetrics, 30000);

    return () => clearInterval(interval);
  }, [recordMetric, location.pathname]);

  // Enhanced context value with additional business tracking methods
  const contextValue: PerformanceContextType = {
    recordMetric,
    recordBusinessMetric,
    recordError,
    recordInteraction,
    trackButton,
    trackForm,
    trackAPIRequest,
    startRouteChange,
    endRouteChange,
    flushMetrics
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
}

// Higher-order component for automatic component performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const PerformanceTrackedComponent = (props: P) => {
    const { recordMetric, recordError } = usePerformanceContext();
    const mountTime = React.useRef<number>(Date.now());
    const renderCount = React.useRef<number>(0);

    React.useEffect(() => {
      renderCount.current += 1;
      const renderTime = Date.now() - mountTime.current;
      
      recordMetric('component_render', renderTime, {
        component: displayName,
        render_count: renderCount.current.toString()
      }, 'ms');
    });

    React.useEffect(() => {
      mountTime.current = Date.now();
      
      recordMetric('component_mount', 0, {
        component: displayName
      });

      return () => {
        const componentLifetime = Date.now() - mountTime.current;
        recordMetric('component_unmount', componentLifetime, {
          component: displayName,
          total_renders: renderCount.current.toString()
        }, 'ms');
      };
    }, [recordMetric]);

    // Error boundary functionality
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
      if (hasError) {
        recordError(new Error(`Component error in ${displayName}`), {
          component: displayName,
          render_count: renderCount.current.toString()
        });
      }
    }, [hasError, recordError]);

    try {
      return <WrappedComponent {...props} />;
    } catch (error) {
      setHasError(true);
      throw error;
    }
  };

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${displayName})`;
  
  return PerformanceTrackedComponent;
}