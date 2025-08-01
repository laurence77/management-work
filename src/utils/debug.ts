/**
 * Development Debugging and Profiling Utilities
 */

interface DebugConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  modules: string[];
  performance: boolean;
  network: boolean;
  state: boolean;
  render: boolean;
}

interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  size?: number;
  type: 'fetch' | 'xhr';
}

interface StateChange {
  id: string;
  component: string;
  timestamp: number;
  before: any;
  after: any;
  action?: string;
}

interface RenderProfile {
  component: string;
  renderTime: number;
  propsHash: string;
  timestamp: number;
  reRender: boolean;
}

class DebugManager {
  private config: DebugConfig;
  private performanceMarks: Map<string, PerformanceMark> = new Map();
  private networkRequests: Map<string, NetworkRequest> = new Map();
  private stateChanges: StateChange[] = [];
  private renderProfiles: RenderProfile[] = [];
  private consoleGroups: string[] = [];

  constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      logLevel: 'debug',
      modules: [],
      performance: true,
      network: true,
      state: true,
      render: true
    };

    if (this.config.enabled) {
      this.initializeDebugTools();
    }
  }

  /**
   * Initialize debugging tools
   */
  private initializeDebugTools(): void {
    this.setupConsoleOverrides();
    this.setupPerformanceObserver();
    this.setupNetworkInterception();
    this.setupErrorHandling();
    this.setupDevTools();
  }

  /**
   * Enhanced console logging with module support
   */
  private setupConsoleOverrides(): void {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      if (this.shouldLog('info')) {
        originalLog(this.formatMessage('LOG', ...args));
      }
    };

    console.warn = (...args) => {
      if (this.shouldLog('warn')) {
        originalWarn(this.formatMessage('WARN', ...args));
      }
    };

    console.error = (...args) => {
      if (this.shouldLog('error')) {
        originalError(this.formatMessage('ERROR', ...args));
      }
    };
  }

  /**
   * Performance monitoring
   */
  private setupPerformanceObserver(): void {
    if (!this.config.performance || typeof PerformanceObserver === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.logPerformanceEntry(entry);
      }
    });

    observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
  }

  /**
   * Network request interception
   */
  private setupNetworkInterception(): void {
    if (!this.config.network) return;

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const requestId = this.generateId();
      const request = this.createNetworkRequest(requestId, args[0], 'fetch');
      
      try {
        const response = await originalFetch(...args);
        this.completeNetworkRequest(requestId, response);
        return response;
      } catch (error) {
        this.failNetworkRequest(requestId, error);
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._debugId = debugManager.generateId();
      this._debugRequest = debugManager.createNetworkRequest(this._debugId, url, 'xhr', method);
      return originalOpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('loadend', () => {
        debugManager.completeNetworkRequest(this._debugId, this);
      });
      return originalSend.call(this, ...args);
    };
  }

  /**
   * Global error handling
   */
  private setupErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.logError('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  /**
   * Development tools integration
   */
  private setupDevTools(): void {
    // Add global debug object
    (window as any).__DEBUG__ = {
      config: this.config,
      performance: this.performanceMarks,
      network: this.networkRequests,
      state: this.stateChanges,
      render: this.renderProfiles,
      manager: this
    };

    // React DevTools integration
    if (typeof window !== 'undefined') {
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot = (
        id: any,
        root: any,
        priorityLevel: any
      ) => {
        this.profileReactRender(root);
      };
    }
  }

  /**
   * Configure debug settings
   */
  configure(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('Debug configuration updated', this.config);
  }

  /**
   * Module-specific logging
   */
  module(name: string) {
    return {
      log: (...args: any[]) => this.moduleLog(name, 'info', ...args),
      warn: (...args: any[]) => this.moduleLog(name, 'warn', ...args),
      error: (...args: any[]) => this.moduleLog(name, 'error', ...args),
      debug: (...args: any[]) => this.moduleLog(name, 'debug', ...args),
      trace: (...args: any[]) => this.moduleLog(name, 'trace', ...args),
      group: (label: string) => this.startGroup(`[${name}] ${label}`),
      groupEnd: () => this.endGroup(),
      time: (label: string) => this.startTimer(`${name}.${label}`),
      timeEnd: (label: string) => this.endTimer(`${name}.${label}`)
    };
  }

  /**
   * Performance profiling
   */
  startTimer(name: string, metadata?: any): void {
    if (!this.config.performance) return;

    const mark: PerformanceMark = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.performanceMarks.set(name, mark);
    performance.mark(`${name}-start`);
  }

  endTimer(name: string): number | undefined {
    if (!this.config.performance) return;

    const mark = this.performanceMarks.get(name);
    if (!mark) {
      this.warn(`Timer "${name}" was not started`);
      return;
    }

    mark.endTime = performance.now();
    mark.duration = mark.endTime - mark.startTime;

    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    this.log(`⏱️ ${name}: ${mark.duration.toFixed(2)}ms`, mark.metadata);
    return mark.duration;
  }

  /**
   * Memory profiling
   */
  profileMemory(label: string = 'Memory Profile'): void {
    if (!(performance as any).memory) {
      this.warn('Memory profiling not available');
      return;
    }

    const memory = (performance as any).memory;
    const memoryInfo = {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    };

    this.log(`🧠 ${label}`, memoryInfo);
  }

  /**
   * Component render profiling
   */
  profileRender(componentName: string, props: any, isReRender: boolean = false): void {
    if (!this.config.render) return;

    const propsHash = this.hashObject(props);
    const renderStart = performance.now();

    // Use requestAnimationFrame to measure actual render time
    requestAnimationFrame(() => {
      const renderTime = performance.now() - renderStart;
      
      const profile: RenderProfile = {
        component: componentName,
        renderTime,
        propsHash,
        timestamp: Date.now(),
        reRender: isReRender
      };

      this.renderProfiles.push(profile);
      
      if (renderTime > 16) { // Slower than 60fps
        this.warn(`🐌 Slow render: ${componentName} (${renderTime.toFixed(2)}ms)`);
      }
    });
  }

  /**
   * State change tracking
   */
  trackStateChange(component: string, before: any, after: any, action?: string): void {
    if (!this.config.state) return;

    const change: StateChange = {
      id: this.generateId(),
      component,
      timestamp: Date.now(),
      before: this.deepClone(before),
      after: this.deepClone(after),
      action
    };

    this.stateChanges.push(change);

    if (this.stateChanges.length > 1000) {
      this.stateChanges = this.stateChanges.slice(-500);
    }

    this.log(`🔄 State change in ${component}`, change);
  }

  /**
   * Console grouping
   */
  startGroup(label: string): void {
    console.group(label);
    this.consoleGroups.push(label);
  }

  endGroup(): void {
    if (this.consoleGroups.length > 0) {
      console.groupEnd();
      this.consoleGroups.pop();
    }
  }

  /**
   * Assertion with debugging
   */
  assert(condition: any, message: string, ...data: any[]): void {
    if (!condition) {
      this.error(`Assertion failed: ${message}`, ...data);
      console.trace();
    }
  }

  /**
   * Generate debug reports
   */
  generateReport(): any {
    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      performance: {
        marks: Array.from(this.performanceMarks.values()),
        entries: performance.getEntriesByType('measure')
      },
      network: Array.from(this.networkRequests.values()),
      state: this.stateChanges.slice(-100),
      render: this.renderProfiles.slice(-100),
      memory: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };
  }

  /**
   * Export debug data
   */
  exportData(): void {
    const report = this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear debug data
   */
  clear(): void {
    this.performanceMarks.clear();
    this.networkRequests.clear();
    this.stateChanges.length = 0;
    this.renderProfiles.length = 0;
    console.clear();
  }

  /**
   * Private helper methods
   */
  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug', 'trace'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return this.config.enabled && messageLevelIndex <= configLevelIndex;
  }

  private formatMessage(level: string, ...args: any[]): any[] {
    const timestamp = new Date().toISOString().substr(11, 12);
    return [`[${timestamp}] [${level}]`, ...args];
  }

  private moduleLog(module: string, level: string, ...args: any[]): void {
    if (this.config.modules.length > 0 && !this.config.modules.includes(module)) {
      return;
    }

    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString().substr(11, 12);
      console[level as keyof Console](`[${timestamp}] [${module.toUpperCase()}]`, ...args);
    }
  }

  private log(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(...args);
    }
  }

  private warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...args);
    }
  }

  private error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...args);
    }
  }

  private logError(type: string, details: any): void {
    this.error(`🚨 ${type}`, details);
  }

  private logPerformanceEntry(entry: PerformanceEntry): void {
    this.log(`⚡ Performance: ${entry.name} (${entry.duration?.toFixed(2)}ms)`);
  }

  private createNetworkRequest(id: string, url: any, type: 'fetch' | 'xhr', method?: string): NetworkRequest {
    const request: NetworkRequest = {
      id,
      url: typeof url === 'string' ? url : url.url,
      method: method || 'GET',
      startTime: Date.now(),
      type
    };

    this.networkRequests.set(id, request);
    this.log(`🌐 ${type.toUpperCase()} ${request.method} ${request.url}`);
    
    return request;
  }

  private completeNetworkRequest(id: string, response: any): void {
    const request = this.networkRequests.get(id);
    if (!request) return;

    request.endTime = Date.now();
    request.duration = request.endTime - request.startTime;
    request.status = response.status || response.status;
    
    this.log(`✅ ${request.method} ${request.url} (${request.status}) ${request.duration}ms`);
  }

  private failNetworkRequest(id: string, error: any): void {
    const request = this.networkRequests.get(id);
    if (!request) return;

    request.endTime = Date.now();
    request.duration = request.endTime - request.startTime;
    
    this.error(`❌ ${request.method} ${request.url} failed`, error);
  }

  private profileReactRender(root: any): void {
    // React DevTools integration
    this.log('🔄 React render', { root });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private hashObject(obj: any): string {
    return JSON.stringify(obj).split('').reduce((hash, char) => 
      ((hash << 5) - hash) + char.charCodeAt(0), 0
    ).toString();
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const cloned: any = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
    return obj;
  }
}

// Singleton instance
export const debugManager = new DebugManager();

// Export convenience functions
export const debug = debugManager.module('DEBUG');
export const timer = {
  start: (name: string, metadata?: any) => debugManager.startTimer(name, metadata),
  end: (name: string) => debugManager.endTimer(name)
};

// React hooks for debugging
export const useDebugger = (componentName: string) => {
  const moduleDebug = debugManager.module(componentName);
  
  return {
    log: moduleDebug.log,
    warn: moduleDebug.warn,
    error: moduleDebug.error,
    trace: moduleDebug.trace,
    profileRender: (props: any, isReRender?: boolean) => 
      debugManager.profileRender(componentName, props, isReRender),
    trackState: (before: any, after: any, action?: string) =>
      debugManager.trackStateChange(componentName, before, after, action),
    time: moduleDebug.time,
    timeEnd: moduleDebug.timeEnd
  };
};

// Bundle analyzer
export const bundleAnalyzer = {
  analyzeChunks: () => {
    if (typeof __webpack_require__ !== 'undefined') {
      // @ts-ignore
      const chunks = __webpack_require__.cache;
      const analysis = Object.keys(chunks).map(key => ({
        id: key,
        size: JSON.stringify(chunks[key]).length,
        module: chunks[key].id
      }));
      
      debug.log('📦 Bundle Analysis', analysis);
      return analysis;
    }
    debug.warn('Bundle analysis not available');
  },
  
  findLargeModules: (threshold: number = 10000) => {
    const analysis = bundleAnalyzer.analyzeChunks();
    if (analysis) {
      const large = analysis.filter(chunk => chunk.size > threshold);
      debug.warn('🐘 Large modules detected', large);
      return large;
    }
  }
};

// Global debug shortcuts
if (typeof window !== 'undefined') {
  (window as any).debugManager = debugManager;
  (window as any).debug = debug;
  (window as any).timer = timer;
  (window as any).bundleAnalyzer = bundleAnalyzer;
}

export default debugManager;