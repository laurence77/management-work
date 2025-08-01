/**
 * React Hook for Performance Monitoring
 */

import { useEffect, useCallback, useRef } from 'react';
import { performanceMonitor, trackPageView, trackButtonClick, trackFormSubmission } from '@/utils/performance-monitor';

export interface UsePerformanceMonitoringOptions {
  trackPageViews?: boolean;
  trackUserInteractions?: boolean;
  trackAPIRequests?: boolean;
  trackRouteChanges?: boolean;
  autoTrackComponents?: boolean;
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
  const {
    trackPageViews = true,
    trackUserInteractions = true,
    trackAPIRequests = true,
    trackRouteChanges = true,
    autoTrackComponents = true
  } = options;

  const componentMountTime = useRef<number>(Date.now());
  const routeChangeStartTime = useRef<number | null>(null);

  // Track component mount/unmount
  useEffect(() => {
    if (autoTrackComponents) {
      const mountTime = Date.now();
      componentMountTime.current = mountTime;
      
      performanceMonitor.recordMetric('component_mount', 0, {
        component: 'usePerformanceMonitoring',
        timestamp: mountTime.toString()
      });

      return () => {
        const unmountTime = Date.now();
        const lifetimeMs = unmountTime - componentMountTime.current;
        
        performanceMonitor.recordMetric('component_lifetime', lifetimeMs, {
          component: 'usePerformanceMonitoring'
        }, 'ms');
      };
    }
  }, [autoTrackComponents]);

  // Track page views
  useEffect(() => {
    if (trackPageViews) {
      const pageName = window.location.pathname;
      trackPageView(pageName);
    }
  }, [trackPageViews]);

  // Manually track metrics
  const recordMetric = useCallback((name: string, value: number, tags?: Record<string, string>, unit?: string) => {
    performanceMonitor.recordMetric(name, value, tags, unit);
  }, []);

  // Track business events
  const recordBusinessMetric = useCallback((name: string, value: number, tags?: Record<string, string>) => {
    performanceMonitor.trackBusinessMetric(name, value, tags);
  }, []);

  // Track errors
  const recordError = useCallback((error: Error, tags?: Record<string, string>) => {
    performanceMonitor.recordError(error, tags);
  }, []);

  // Track user interactions
  const recordInteraction = useCallback((action: string, element: string, duration?: number, tags?: Record<string, string>) => {
    performanceMonitor.recordInteraction(action, element, duration, tags);
  }, []);

  // Helper functions for common tracking patterns
  const trackButton = useCallback((buttonName: string, duration?: number) => {
    if (trackUserInteractions) {
      trackButtonClick(buttonName, duration);
    }
  }, [trackUserInteractions]);

  const trackForm = useCallback((formName: string, success: boolean, duration?: number) => {
    if (trackUserInteractions) {
      trackFormSubmission(formName, success, duration);
    }
  }, [trackUserInteractions]);

  const trackAPIRequest = useCallback((url: string, method: string, startTime: number, endTime: number, status: number) => {
    if (trackAPIRequests) {
      performanceMonitor.trackAPICall(url, method, startTime, endTime, status);
    }
  }, [trackAPIRequests]);

  const startRouteChange = useCallback(() => {
    if (trackRouteChanges) {
      routeChangeStartTime.current = Date.now();
    }
  }, [trackRouteChanges]);

  const endRouteChange = useCallback((from: string, to: string) => {
    if (trackRouteChanges && routeChangeStartTime.current) {
      const duration = Date.now() - routeChangeStartTime.current;
      performanceMonitor.trackRouteChange(from, to, duration);
      routeChangeStartTime.current = null;
    }
  }, [trackRouteChanges]);

  // Force flush metrics
  const flushMetrics = useCallback(async () => {
    await performanceMonitor.flush();
  }, []);

  return {
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
}

// Hook for tracking component performance
export function useComponentPerformance(componentName: string) {
  const mountTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);
  const lastRenderTime = useRef<number>(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    
    performanceMonitor.recordMetric('component_render', timeSinceLastRender, {
      component: componentName,
      render_count: renderCount.current.toString()
    }, 'ms');
    
    lastRenderTime.current = currentTime;
  });

  useEffect(() => {
    const mountStartTime = Date.now();
    mountTime.current = mountStartTime;
    
    performanceMonitor.recordMetric('component_mount_start', 0, {
      component: componentName
    });

    return () => {
      const unmountTime = Date.now();
      const componentLifetime = unmountTime - mountTime.current;
      
      performanceMonitor.recordMetric('component_unmount', componentLifetime, {
        component: componentName,
        total_renders: renderCount.current.toString()
      }, 'ms');
    };
  }, [componentName]);

  const recordComponentError = useCallback((error: Error) => {
    performanceMonitor.recordError(error, {
      component: componentName,
      render_count: renderCount.current.toString()
    });
  }, [componentName]);

  const recordComponentMetric = useCallback((metricName: string, value: number, tags?: Record<string, string>) => {
    performanceMonitor.recordMetric(`component.${metricName}`, value, {
      component: componentName,
      ...tags
    });
  }, [componentName]);

  return {
    renderCount: renderCount.current,
    componentLifetime: Date.now() - mountTime.current,
    recordComponentError,
    recordComponentMetric
  };
}

// Hook for tracking async operations
export function useAsyncOperation(operationName: string) {
  const startTime = useRef<number | null>(null);
  const operationCount = useRef<number>(0);

  const startOperation = useCallback(() => {
    startTime.current = Date.now();
    operationCount.current += 1;
    
    performanceMonitor.recordMetric('async_operation_start', 0, {
      operation: operationName,
      operation_count: operationCount.current.toString()
    });
  }, [operationName]);

  const endOperation = useCallback((success: boolean = true, errorMessage?: string) => {
    if (startTime.current) {
      const duration = Date.now() - startTime.current;
      
      performanceMonitor.recordMetric('async_operation_duration', duration, {
        operation: operationName,
        success: success.toString(),
        operation_count: operationCount.current.toString()
      }, 'ms');

      if (!success && errorMessage) {
        performanceMonitor.recordError(new Error(errorMessage), {
          operation: operationName,
          type: 'async_operation_error'
        });
      }
      
      startTime.current = null;
    }
  }, [operationName]);

  const trackOperation = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    startOperation();
    
    try {
      const result = await operation();
      endOperation(true);
      return result;
    } catch (error) {
      endOperation(false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }, [startOperation, endOperation]);

  return {
    startOperation,
    endOperation,
    trackOperation,
    operationCount: operationCount.current,
    isRunning: startTime.current !== null
  };
}

// Hook for tracking form performance
export function useFormPerformance(formName: string) {
  const formStartTime = useRef<number | null>(null);
  const fieldInteractions = useRef<Record<string, number>>({});
  const validationErrors = useRef<number>(0);

  const startForm = useCallback(() => {
    formStartTime.current = Date.now();
    fieldInteractions.current = {};
    validationErrors.current = 0;
    
    performanceMonitor.recordInteraction('form_start', formName);
  }, [formName]);

  const trackFieldInteraction = useCallback((fieldName: string) => {
    if (!fieldInteractions.current[fieldName]) {
      fieldInteractions.current[fieldName] = 0;
    }
    fieldInteractions.current[fieldName] += 1;
    
    performanceMonitor.recordInteraction('field_interaction', fieldName, undefined, {
      form: formName,
      interaction_count: fieldInteractions.current[fieldName].toString()
    });
  }, [formName]);

  const trackValidationError = useCallback((fieldName: string, errorMessage: string) => {
    validationErrors.current += 1;
    
    performanceMonitor.recordError(new Error(`Validation error: ${errorMessage}`), {
      form: formName,
      field: fieldName,
      type: 'validation_error',
      total_errors: validationErrors.current.toString()
    });
  }, [formName]);

  const submitForm = useCallback((success: boolean) => {
    if (formStartTime.current) {
      const duration = Date.now() - formStartTime.current;
      const totalInteractions = Object.values(fieldInteractions.current).reduce((sum, count) => sum + count, 0);
      
      performanceMonitor.recordMetric('form_completion_time', duration, {
        form: formName,
        success: success.toString(),
        total_interactions: totalInteractions.toString(),
        validation_errors: validationErrors.current.toString(),
        fields_touched: Object.keys(fieldInteractions.current).length.toString()
      }, 'ms');
      
      trackFormSubmission(formName, success, duration);
      
      formStartTime.current = null;
    }
  }, [formName]);

  useEffect(() => {
    startForm();
  }, [startForm]);

  return {
    trackFieldInteraction,
    trackValidationError,
    submitForm,
    formDuration: formStartTime.current ? Date.now() - formStartTime.current : 0,
    totalFieldInteractions: Object.values(fieldInteractions.current).reduce((sum, count) => sum + count, 0),
    validationErrorCount: validationErrors.current
  };
}

// Hook for tracking search performance
export function useSearchPerformance() {
  const searchStartTime = useRef<number | null>(null);
  const searchCount = useRef<number>(0);

  const startSearch = useCallback((query: string) => {
    searchStartTime.current = Date.now();
    searchCount.current += 1;
    
    performanceMonitor.recordInteraction('search_start', 'search', undefined, {
      query_length: query.length.toString(),
      search_count: searchCount.current.toString()
    });
  }, []);

  const endSearch = useCallback((query: string, resultCount: number, success: boolean = true) => {
    if (searchStartTime.current) {
      const duration = Date.now() - searchStartTime.current;
      
      performanceMonitor.recordMetric('search_duration', duration, {
        query_length: query.length.toString(),
        result_count: resultCount.toString(),
        success: success.toString(),
        search_count: searchCount.current.toString()
      }, 'ms');

      performanceMonitor.trackBusinessMetric('search.query', 1, {
        query_length: query.length.toString(),
        result_count: resultCount.toString(),
        has_results: (resultCount > 0).toString()
      });
      
      searchStartTime.current = null;
    }
  }, []);

  const trackSearch = useCallback(async <T>(
    query: string, 
    searchOperation: () => Promise<{ results: T[], count: number }>
  ): Promise<{ results: T[], count: number }> => {
    startSearch(query);
    
    try {
      const result = await searchOperation();
      endSearch(query, result.count, true);
      return result;
    } catch (error) {
      endSearch(query, 0, false);
      throw error;
    }
  }, [startSearch, endSearch]);

  return {
    startSearch,
    endSearch,
    trackSearch,
    searchCount: searchCount.current,
    isSearching: searchStartTime.current !== null
  };
}