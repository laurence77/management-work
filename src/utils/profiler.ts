/**
 * Advanced Performance Profiler for Development
 */

interface ProfilerConfig {
  enabled: boolean;
  autoProfile: boolean;
  sampleRate: number;
  maxSamples: number;
  trackMemory: boolean;
  trackNetwork: boolean;
  trackUserInteractions: boolean;
}

interface PerformanceSample {
  timestamp: number;
  fps: number;
  memory?: MemoryInfo;
  network?: NetworkActivity;
  userInteraction?: UserInteraction;
  customMetrics?: Record<string, number>;
}

interface MemoryInfo {
  used: number;
  total: number;
  limit: number;
}

interface NetworkActivity {
  activeRequests: number;
  completedRequests: number;
  failedRequests: number;
  totalDataTransferred: number;
}

interface UserInteraction {
  type: string;
  element: string;
  timestamp: number;
  responseTime?: number;
}

interface ProfilerReport {
  duration: number;
  samples: PerformanceSample[];
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  memoryLeaks: MemoryLeak[];
  slowOperations: SlowOperation[];
  recommendations: string[];
}

interface MemoryLeak {
  component: string;
  growth: number;
  samples: number[];
}

interface SlowOperation {
  name: string;
  duration: number;
  timestamp: number;
  stackTrace?: string;
}

class PerformanceProfiler {
  private config: ProfilerConfig;
  private samples: PerformanceSample[] = [];
  private isRunning: boolean = false;
  private samplingInterval?: number;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private networkActivity: NetworkActivity;
  private userInteractions: UserInteraction[] = [];
  private customMetrics: Map<string, number> = new Map();
  private memoryBaseline?: MemoryInfo;

  constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      autoProfile: false,
      sampleRate: 100, // ms
      maxSamples: 1000,
      trackMemory: true,
      trackNetwork: true,
      trackUserInteractions: true
    };

    this.networkActivity = {
      activeRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      totalDataTransferred: 0
    };

    if (this.config.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize profiler
   */
  private initialize(): void {
    this.setupFrameTracking();
    this.setupMemoryTracking();
    this.setupNetworkTracking();
    this.setupUserInteractionTracking();
    this.setupLongTaskObserver();

    if (this.config.autoProfile) {
      this.start();
    }
  }

  /**
   * Start profiling
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.samples = [];
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.memoryBaseline = this.getMemoryInfo();

    console.log('🔍 Performance profiling started');

    this.samplingInterval = window.setInterval(() => {
      this.takeSample();
    }, this.config.sampleRate);

    this.startFrameCounter();
  }

  /**
   * Stop profiling and generate report
   */
  stop(): ProfilerReport {
    if (!this.isRunning) {
      throw new Error('Profiler is not running');
    }

    this.isRunning = false;
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
    }

    console.log('🔍 Performance profiling stopped');
    return this.generateReport();
  }

  /**
   * Configure profiler
   */
  configure(config: Partial<ProfilerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add custom metric
   */
  addMetric(name: string, value: number): void {
    this.customMetrics.set(name, value);
  }

  /**
   * Profile a specific function
   */
  profileFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - start;
      
      this.addMetric(`function.${name}`, duration);
      
      if (duration > 16) { // Slower than 60fps
        this.recordSlowOperation(name, duration);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordSlowOperation(`${name}:error`, duration);
      throw error;
    }
  }

  /**
   * Profile async function
   */
  async profileAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.addMetric(`async.${name}`, duration);
      
      if (duration > 100) { // Arbitrary threshold for async operations
        this.recordSlowOperation(name, duration);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordSlowOperation(`${name}:error`, duration);
      throw error;
    }
  }

  /**
   * Mark important events
   */
  mark(name: string, metadata?: any): void {
    performance.mark(name);
    this.addMetric(`mark.${name}`, performance.now());
    
    if (metadata) {
      console.log(`📍 Profiler mark: ${name}`, metadata);
    }
  }

  /**
   * Measure time between marks
   */
  measure(name: string, startMark: string, endMark: string): number {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name, 'measure')[0];
    
    if (measure) {
      this.addMetric(`measure.${name}`, measure.duration);
      return measure.duration;
    }
    
    return 0;
  }

  /**
   * Take a performance sample
   */
  private takeSample(): void {
    if (this.samples.length >= this.config.maxSamples) {
      this.samples.shift(); // Remove oldest sample
    }

    const sample: PerformanceSample = {
      timestamp: Date.now(),
      fps: this.calculateFPS()
    };

    if (this.config.trackMemory) {
      sample.memory = this.getMemoryInfo();
    }

    if (this.config.trackNetwork) {
      sample.network = { ...this.networkActivity };
    }

    if (this.config.trackUserInteractions && this.userInteractions.length > 0) {
      sample.userInteraction = this.userInteractions[this.userInteractions.length - 1];
    }

    // Add custom metrics
    if (this.customMetrics.size > 0) {
      sample.customMetrics = Object.fromEntries(this.customMetrics);
      this.customMetrics.clear();
    }

    this.samples.push(sample);
  }

  /**
   * Setup frame tracking for FPS calculation
   */
  private setupFrameTracking(): void {
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  }

  /**
   * Start frame counter
   */
  private startFrameCounter(): void {
    const countFrame = () => {
      if (this.isRunning) {
        this.frameCount++;
        requestAnimationFrame(countFrame);
      }
    };
    requestAnimationFrame(countFrame);
  }

  /**
   * Calculate current FPS
   */
  private calculateFPS(): number {
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed >= 1000) { // Calculate FPS every second
      const fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFrameTime = now;
      return fps;
    }
    
    return 60; // Default assumption
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): MemoryInfo | undefined {
    if (!(performance as any).memory) return undefined;

    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    };
  }

  /**
   * Setup memory tracking
   */
  private setupMemoryTracking(): void {
    if (!this.config.trackMemory || !(performance as any).memory) return;

    // Monitor for potential memory leaks
    setInterval(() => {
      if (this.isRunning) {
        const current = this.getMemoryInfo();
        if (current && this.memoryBaseline) {
          const growth = current.used - this.memoryBaseline.used;
          if (growth > 50) { // 50MB growth
            console.warn('🧠 Potential memory leak detected', {
              growth: `${growth}MB`,
              current: current.used,
              baseline: this.memoryBaseline.used
            });
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Setup network tracking
   */
  private setupNetworkTracking(): void {
    if (!this.config.trackNetwork) return;

    // Hook into fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      this.networkActivity.activeRequests++;
      
      try {
        const response = await originalFetch(...args);
        this.networkActivity.activeRequests--;
        this.networkActivity.completedRequests++;
        
        // Estimate data transfer
        if (response.headers.get('content-length')) {
          this.networkActivity.totalDataTransferred += 
            parseInt(response.headers.get('content-length')!);
        }
        
        return response;
      } catch (error) {
        this.networkActivity.activeRequests--;
        this.networkActivity.failedRequests++;
        throw error;
      }
    };
  }

  /**
   * Setup user interaction tracking
   */
  private setupUserInteractionTracking(): void {
    if (!this.config.trackUserInteractions) return;

    const trackInteraction = (type: string) => (event: Event) => {
      const target = event.target as HTMLElement;
      const interaction: UserInteraction = {
        type,
        element: target.tagName + (target.id ? `#${target.id}` : '') + 
                (target.className ? `.${target.className.split(' ')[0]}` : ''),
        timestamp: Date.now()
      };

      this.userInteractions.push(interaction);
      
      // Keep only recent interactions
      if (this.userInteractions.length > 100) {
        this.userInteractions = this.userInteractions.slice(-50);
      }

      // Measure response time for clicks
      if (type === 'click') {
        requestAnimationFrame(() => {
          interaction.responseTime = Date.now() - interaction.timestamp;
        });
      }
    };

    ['click', 'scroll', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, trackInteraction(eventType), { passive: true });
    });
  }

  /**
   * Setup long task observer
   */
  private setupLongTaskObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.recordSlowOperation(
              `LongTask:${entry.name}`,
              entry.duration,
              new Error().stack
            );
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task observer not available');
    }
  }

  /**
   * Record slow operation
   */
  private recordSlowOperation(name: string, duration: number, stackTrace?: string): void {
    console.warn(`🐌 Slow operation detected: ${name} (${duration.toFixed(2)}ms)`);
    
    // Store for report
    this.addMetric(`slow.${name}`, duration);
  }

  /**
   * Generate performance report
   */
  private generateReport(): ProfilerReport {
    const duration = this.samples.length > 0 
      ? this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp
      : 0;

    const fpsSamples = this.samples.map(s => s.fps).filter(fps => fps > 0);
    const averageFPS = fpsSamples.reduce((sum, fps) => sum + fps, 0) / fpsSamples.length || 0;
    const minFPS = Math.min(...fpsSamples);
    const maxFPS = Math.max(...fpsSamples);

    const memoryLeaks = this.detectMemoryLeaks();
    const slowOperations = this.getSlowOperations();
    const recommendations = this.generateRecommendations(averageFPS, memoryLeaks, slowOperations);

    const report: ProfilerReport = {
      duration,
      samples: this.samples,
      averageFPS,
      minFPS: isFinite(minFPS) ? minFPS : 0,
      maxFPS: isFinite(maxFPS) ? maxFPS : 0,
      memoryLeaks,
      slowOperations,
      recommendations
    };

    console.log('📊 Performance Report Generated', report);
    return report;
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];
    
    if (!this.config.trackMemory) return leaks;

    const memorySamples = this.samples
      .filter(s => s.memory)
      .map(s => s.memory!.used);

    if (memorySamples.length < 10) return leaks;

    // Simple trend analysis
    const firstHalf = memorySamples.slice(0, Math.floor(memorySamples.length / 2));
    const secondHalf = memorySamples.slice(Math.floor(memorySamples.length / 2));

    const firstAverage = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAverage = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const growth = secondAverage - firstAverage;

    if (growth > 10) { // 10MB growth
      leaks.push({
        component: 'Global',
        growth,
        samples: memorySamples
      });
    }

    return leaks;
  }

  /**
   * Get slow operations
   */
  private getSlowOperations(): SlowOperation[] {
    const operations: SlowOperation[] = [];
    
    for (const [key, value] of this.customMetrics.entries()) {
      if (key.startsWith('slow.')) {
        operations.push({
          name: key.replace('slow.', ''),
          duration: value,
          timestamp: Date.now()
        });
      }
    }

    return operations.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    averageFPS: number,
    memoryLeaks: MemoryLeak[],
    slowOperations: SlowOperation[]
  ): string[] {
    const recommendations: string[] = [];

    if (averageFPS < 30) {
      recommendations.push('🎯 Low FPS detected. Consider optimizing render performance.');
    }

    if (memoryLeaks.length > 0) {
      recommendations.push('🧠 Memory leaks detected. Check for unreleased resources.');
    }

    if (slowOperations.length > 5) {
      recommendations.push('🐌 Multiple slow operations detected. Profile individual functions.');
    }

    if (this.networkActivity.failedRequests > this.networkActivity.completedRequests * 0.1) {
      recommendations.push('🌐 High network failure rate. Check error handling.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance looks good!');
    }

    return recommendations;
  }

  /**
   * Export report to file
   */
  exportReport(report: ProfilerReport): void {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const profiler = new PerformanceProfiler();

// React hook for component profiling
export const useProfiler = (componentName: string) => {
  return {
    profileRender: (fn: () => any) => profiler.profileFunction(`render.${componentName}`, fn),
    profileEffect: (fn: () => any) => profiler.profileFunction(`effect.${componentName}`, fn),
    mark: (name: string) => profiler.mark(`${componentName}.${name}`),
    addMetric: (name: string, value: number) => profiler.addMetric(`${componentName}.${name}`, value)
  };
};

// Global profiler shortcuts
if (typeof window !== 'undefined') {
  (window as any).profiler = profiler;
}

export default profiler;