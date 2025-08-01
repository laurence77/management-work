/**
 * React Hooks for Development Debugging
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { debugManager } from '@/utils/debug';
import { profiler } from '@/utils/profiler';

/**
 * Hook for component-level debugging
 */
export function useDebugger(componentName: string) {
  const debug = debugManager.module(componentName);
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    debug.log('Component mounted');
    return () => {
      const lifetime = Date.now() - mountTime.current;
      debug.log(`Component unmounted after ${lifetime}ms (${renderCount.current} renders)`);
    };
  }, [debug]);

  useEffect(() => {
    renderCount.current++;
    debug.log(`Render #${renderCount.current}`);
  });

  return {
    log: debug.log,
    warn: debug.warn,
    error: debug.error,
    trace: debug.trace,
    time: debug.time,
    timeEnd: debug.timeEnd,
    renderCount: renderCount.current
  };
}

/**
 * Hook for performance profiling
 */
export function usePerformanceProfiler(componentName: string) {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  
  const profileRender = useCallback(() => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, [`render_${Date.now()}`]: duration }));
      profiler.addMetric(`${componentName}.render`, duration);
    };
  }, [componentName]);

  const profileFunction = useCallback(<T>(name: string, fn: () => T): T => {
    return profiler.profileFunction(`${componentName}.${name}`, fn);
  }, [componentName]);

  const profileAsyncFunction = useCallback(async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    return profiler.profileAsyncFunction(`${componentName}.${name}`, fn);
  }, [componentName]);

  return {
    metrics,
    profileRender,
    profileFunction,
    profileAsyncFunction,
    mark: (name: string) => profiler.mark(`${componentName}.${name}`),
    addMetric: (name: string, value: number) => {
      setMetrics(prev => ({ ...prev, [name]: value }));
      profiler.addMetric(`${componentName}.${name}`, value);
    }
  };
}

/**
 * Hook for state change debugging
 */
export function useStateDebugger<T>(
  state: T, 
  stateName: string, 
  componentName: string
): T {
  const previousState = useRef<T>(state);
  const debug = debugManager.module(componentName);

  useEffect(() => {
    if (previousState.current !== state) {
      debug.log(`State change: ${stateName}`, {
        from: previousState.current,
        to: state,
        timestamp: Date.now()
      });
      
      debugManager.trackStateChange(
        componentName,
        previousState.current,
        state,
        stateName
      );
      
      previousState.current = state;
    }
  }, [state, stateName, componentName, debug]);

  return state;
}

/**
 * Hook for effect debugging
 */
export function useEffectDebugger(
  effect: React.EffectCallback,
  deps: React.DependencyList | undefined,
  effectName: string,
  componentName: string
): void {
  const debug = debugManager.module(componentName);
  const previousDeps = useRef<React.DependencyList | undefined>(deps);
  const effectCount = useRef(0);

  useEffect(() => {
    effectCount.current++;
    
    if (deps) {
      const changedDeps = deps.reduce((acc, dep, index) => {
        if (previousDeps.current && previousDeps.current[index] !== dep) {
          acc.push({ index, from: previousDeps.current[index], to: dep });
        }
        return acc;
      }, [] as any[]);

      if (changedDeps.length > 0) {
        debug.log(`Effect ${effectName} triggered by dependency changes:`, changedDeps);
      }
    }

    debug.log(`Effect ${effectName} running (execution #${effectCount.current})`);
    
    const startTime = performance.now();
    const cleanup = effect();
    const duration = performance.now() - startTime;
    
    profiler.addMetric(`${componentName}.effect.${effectName}`, duration);
    
    previousDeps.current = deps;
    
    return () => {
      if (cleanup) {
        debug.log(`Effect ${effectName} cleanup`);
        cleanup();
      }
    };
  }, deps);
}

/**
 * Hook for memo debugging
 */
export function useMemoDebugger<T>(
  factory: () => T,
  deps: React.DependencyList | undefined,
  memoName: string,
  componentName: string
): T {
  const debug = debugManager.module(componentName);
  const previousDeps = useRef<React.DependencyList | undefined>(deps);
  const computeCount = useRef(0);

  return React.useMemo(() => {
    computeCount.current++;
    
    if (deps && previousDeps.current) {
      const changedDeps = deps.reduce((acc, dep, index) => {
        if (previousDeps.current && previousDeps.current[index] !== dep) {
          acc.push({ index, from: previousDeps.current[index], to: dep });
        }
        return acc;
      }, [] as any[]);

      if (changedDeps.length > 0) {
        debug.log(`Memo ${memoName} recomputed due to dependency changes:`, changedDeps);
      }
    }

    debug.log(`Memo ${memoName} computing (computation #${computeCount.current})`);
    
    const startTime = performance.now();
    const result = factory();
    const duration = performance.now() - startTime;
    
    profiler.addMetric(`${componentName}.memo.${memoName}`, duration);
    previousDeps.current = deps;
    
    return result;
  }, deps);
}

/**
 * Hook for callback debugging
 */
export function useCallbackDebugger<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  callbackName: string,
  componentName: string
): T {
  const debug = debugManager.module(componentName);
  const previousDeps = useRef<React.DependencyList>(deps);
  const createCount = useRef(0);
  const callCount = useRef(0);

  return React.useCallback((...args: Parameters<T>) => {
    callCount.current++;
    debug.log(`Callback ${callbackName} called (call #${callCount.current})`, args);
    
    const startTime = performance.now();
    const result = callback(...args);
    const duration = performance.now() - startTime;
    
    profiler.addMetric(`${componentName}.callback.${callbackName}`, duration);
    
    return result;
  } as T, deps);
}

/**
 * Hook for ref debugging
 */
export function useRefDebugger<T>(
  initialValue: T,
  refName: string,
  componentName: string
): React.MutableRefObject<T> {
  const debug = debugManager.module(componentName);
  const ref = useRef(initialValue);
  const originalRef = ref.current;

  // Create a proxy to track ref changes
  const proxyRef = new Proxy(ref, {
    set(target, property, value) {
      if (property === 'current') {
        debug.log(`Ref ${refName} changed`, {
          from: target.current,
          to: value,
          timestamp: Date.now()
        });
      }
      return Reflect.set(target, property, value);
    }
  });

  return proxyRef;
}

/**
 * Hook for async operation debugging
 */
export function useAsyncDebugger(componentName: string) {
  const debug = debugManager.module(componentName);
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());

  const wrapAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const operationId = `${operationName}_${Date.now()}`;
    
    setPendingOperations(prev => new Set(prev).add(operationId));
    debug.log(`Async operation started: ${operationName}`);
    
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      debug.log(`Async operation completed: ${operationName} (${duration.toFixed(2)}ms)`);
      profiler.addMetric(`${componentName}.async.${operationName}`, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      debug.error(`Async operation failed: ${operationName} (${duration.toFixed(2)}ms)`, error);
      throw error;
    } finally {
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    }
  }, [debug, componentName]);

  return {
    wrapAsync,
    pendingOperations: Array.from(pendingOperations),
    hasPendingOperations: pendingOperations.size > 0
  };
}

/**
 * Hook for error boundary debugging
 */
export function useErrorDebugger(componentName: string) {
  const debug = debugManager.module(componentName);

  const logError = useCallback((error: Error, errorInfo?: any) => {
    debug.error('Component error caught', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }, [debug]);

  const wrapTryCatch = useCallback(<T>(
    operation: () => T,
    operationName: string,
    fallback?: T
  ): T => {
    try {
      return operation();
    } catch (error) {
      logError(error as Error, { operation: operationName });
      
      if (fallback !== undefined) {
        return fallback;
      }
      
      throw error;
    }
  }, [logError]);

  return {
    logError,
    wrapTryCatch
  };
}

/**
 * Hook for development-only features
 */
export function useDevOnly<T>(
  devValue: T,
  prodValue: T = null as any
): T {
  return process.env.NODE_ENV === 'development' ? devValue : prodValue;
}

/**
 * Hook for component lifecycle debugging
 */
export function useLifecycleDebugger(componentName: string) {
  const debug = debugManager.module(componentName);
  const mountTime = useRef(Date.now());
  const updateCount = useRef(0);

  // Mount
  useEffect(() => {
    debug.log('Component mounted');
    
    return () => {
      const lifetime = Date.now() - mountTime.current;
      debug.log(`Component unmounted after ${lifetime}ms and ${updateCount.current} updates`);
    };
  }, [debug]);

  // Update
  useEffect(() => {
    updateCount.current++;
    if (updateCount.current > 1) {
      debug.log(`Component updated (update #${updateCount.current - 1})`);
    }
  });

  return {
    mountTime: mountTime.current,
    updateCount: updateCount.current
  };
}