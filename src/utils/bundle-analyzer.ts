/**
 * Bundle Analysis and Optimization Tools
 */

interface BundleChunk {
  id: string;
  name: string;
  size: number;
  modules: ModuleInfo[];
  dependencies: string[];
  isAsync: boolean;
  isEntry: boolean;
}

interface ModuleInfo {
  id: string;
  name: string;
  size: number;
  type: 'js' | 'css' | 'asset' | 'json';
  source: string;
  dependencies: string[];
  isExternal: boolean;
}

interface BundleAnalysis {
  totalSize: number;
  chunks: BundleChunk[];
  duplicatedModules: ModuleInfo[];
  largeModules: ModuleInfo[];
  unusedExports: string[];
  recommendations: string[];
  treeshakingOpportunities: string[];
}

interface PerformanceMetrics {
  loadTime: number;
  parseTime: number;
  executeTime: number;
  gzippedSize: number;
  compressionRatio: number;
}

class BundleAnalyzer {
  private chunks: Map<string, BundleChunk> = new Map();
  private modules: Map<string, ModuleInfo> = new Map();
  private metrics: PerformanceMetrics | null = null;

  /**
   * Initialize bundle analysis
   */
  init(): void {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Bundle analyzer should only be used in development');
      return;
    }

    this.analyzeWebpackBundles();
    this.setupPerformanceTracking();
    this.exposeGlobalAPI();
  }

  /**
   * Analyze webpack bundles
   */
  private analyzeWebpackBundles(): void {
    // Check if webpack is available
    if (typeof __webpack_require__ === 'undefined') {
      console.warn('Webpack require function not found');
      return;
    }

    try {
      // Analyze webpack module cache
      const cache = (window as any).__webpack_require__.cache;
      if (cache) {
        this.analyzeModuleCache(cache);
      }

      // Analyze chunk loading
      const chunkLoadingGlobal = (window as any).__webpack_require__.chunkLoadingGlobal;
      if (chunkLoadingGlobal) {
        this.analyzeChunkLoading(chunkLoadingGlobal);
      }
    } catch (error) {
      console.error('Failed to analyze webpack bundles:', error);
    }
  }

  /**
   * Analyze webpack module cache
   */
  private analyzeModuleCache(cache: any): void {
    Object.keys(cache).forEach(moduleId => {
      const module = cache[moduleId];
      if (module && module.exports) {
        const moduleInfo: ModuleInfo = {
          id: moduleId,
          name: this.getModuleName(module),
          size: this.estimateModuleSize(module),
          type: this.getModuleType(module),
          source: module.id || 'unknown',
          dependencies: this.getModuleDependencies(module),
          isExternal: this.isExternalModule(module)
        };

        this.modules.set(moduleId, moduleInfo);
      }
    });
  }

  /**
   * Analyze chunk loading
   */
  private analyzeChunkLoading(chunkLoadingGlobal: any): void {
    if (Array.isArray(chunkLoadingGlobal)) {
      chunkLoadingGlobal.forEach((chunk, index) => {
        if (Array.isArray(chunk) && chunk.length >= 2) {
          const [chunkIds, modules] = chunk;
          
          const chunkInfo: BundleChunk = {
            id: String(index),
            name: `chunk-${index}`,
            size: this.estimateChunkSize(modules),
            modules: this.extractChunkModules(modules),
            dependencies: this.getChunkDependencies(modules),
            isAsync: this.isAsyncChunk(chunkIds),
            isEntry: this.isEntryChunk(chunkIds)
          };

          this.chunks.set(String(index), chunkInfo);
        }
      });
    }
  }

  /**
   * Setup performance tracking
   */
  private setupPerformanceTracking(): void {
    // Track script loading performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource' && entry.name.includes('.js')) {
          this.trackScriptPerformance(entry as PerformanceResourceTiming);
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });

    // Track bundle parsing time
    this.trackParsingTime();
  }

  /**
   * Track script performance
   */
  private trackScriptPerformance(entry: PerformanceResourceTiming): void {
    const metrics: PerformanceMetrics = {
      loadTime: entry.responseEnd - entry.requestStart,
      parseTime: entry.domContentLoadedEventEnd - entry.responseEnd,
      executeTime: entry.loadEventEnd - entry.domContentLoadedEventEnd,
      gzippedSize: entry.encodedBodySize || 0,
      compressionRatio: entry.decodedBodySize 
        ? (entry.encodedBodySize || 0) / entry.decodedBodySize 
        : 1
    };

    this.metrics = metrics;
  }

  /**
   * Track parsing time
   */
  private trackParsingTime(): void {
    const startTime = performance.now();
    
    // Use setTimeout to measure after current execution
    setTimeout(() => {
      const parseTime = performance.now() - startTime;
      console.log(`Bundle parsing time: ${parseTime.toFixed(2)}ms`);
    }, 0);
  }

  /**
   * Generate comprehensive analysis
   */
  analyze(): BundleAnalysis {
    const totalSize = this.calculateTotalSize();
    const duplicatedModules = this.findDuplicatedModules();
    const largeModules = this.findLargeModules();
    const unusedExports = this.findUnusedExports();
    const treeshakingOpportunities = this.findTreeshakingOpportunities();
    const recommendations = this.generateRecommendations(
      totalSize,
      duplicatedModules,
      largeModules,
      unusedExports
    );

    return {
      totalSize,
      chunks: Array.from(this.chunks.values()),
      duplicatedModules,
      largeModules,
      unusedExports,
      recommendations,
      treeshakingOpportunities
    };
  }

  /**
   * Calculate total bundle size
   */
  private calculateTotalSize(): number {
    return Array.from(this.modules.values())
      .reduce((total, module) => total + module.size, 0);
  }

  /**
   * Find duplicated modules
   */
  private findDuplicatedModules(): ModuleInfo[] {
    const moduleNames = new Map<string, ModuleInfo[]>();
    
    this.modules.forEach(module => {
      const name = module.name;
      if (!moduleNames.has(name)) {
        moduleNames.set(name, []);
      }
      moduleNames.get(name)!.push(module);
    });

    const duplicated: ModuleInfo[] = [];
    moduleNames.forEach((modules, name) => {
      if (modules.length > 1) {
        duplicated.push(...modules);
      }
    });

    return duplicated;
  }

  /**
   * Find large modules
   */
  private findLargeModules(threshold: number = 100000): ModuleInfo[] {
    return Array.from(this.modules.values())
      .filter(module => module.size > threshold)
      .sort((a, b) => b.size - a.size);
  }

  /**
   * Find unused exports (simplified)
   */
  private findUnusedExports(): string[] {
    // This is a simplified implementation
    // In a real scenario, you'd need static analysis
    const unusedExports: string[] = [];
    
    this.modules.forEach(module => {
      // Check if module has exports that aren't imported elsewhere
      if (module.name.includes('unused') || module.dependencies.length === 0) {
        unusedExports.push(module.name);
      }
    });

    return unusedExports;
  }

  /**
   * Find tree-shaking opportunities
   */
  private findTreeshakingOpportunities(): string[] {
    const opportunities: string[] = [];
    
    this.modules.forEach(module => {
      // Look for modules that could benefit from tree-shaking
      if (module.isExternal && module.size > 50000) {
        opportunities.push(`Large external module: ${module.name}`);
      }
      
      if (module.name.includes('lodash') && !module.name.includes('/')) {
        opportunities.push(`Use lodash-es or specific imports instead of full lodash`);
      }
      
      if (module.name.includes('moment') && !module.name.includes('locale')) {
        opportunities.push(`Consider using date-fns or day.js instead of moment.js`);
      }
    });

    return opportunities;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    totalSize: number,
    duplicatedModules: ModuleInfo[],
    largeModules: ModuleInfo[],
    unusedExports: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (totalSize > 1000000) { // 1MB
      recommendations.push('Bundle size is large. Consider code splitting and lazy loading.');
    }

    if (duplicatedModules.length > 0) {
      recommendations.push(`Found ${duplicatedModules.length} duplicated modules. Use webpack-bundle-analyzer to identify and deduplicate.`);
    }

    if (largeModules.length > 0) {
      recommendations.push(`Found ${largeModules.length} large modules. Consider dynamic imports or alternatives.`);
      largeModules.slice(0, 3).forEach(module => {
        recommendations.push(`  - ${module.name}: ${(module.size / 1024).toFixed(1)}KB`);
      });
    }

    if (unusedExports.length > 0) {
      recommendations.push(`Found ${unusedExports.length} potentially unused exports. Enable tree-shaking.`);
    }

    if (this.metrics) {
      if (this.metrics.loadTime > 1000) {
        recommendations.push('Slow script loading detected. Consider using a CDN or optimizing server response.');
      }
      
      if (this.metrics.parseTime > 100) {
        recommendations.push('Slow parsing detected. Consider reducing bundle size or using smaller libraries.');
      }
    }

    return recommendations;
  }

  /**
   * Export analysis to file
   */
  exportAnalysis(): void {
    const analysis = this.analyze();
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `bundle-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Helper methods
   */
  private getModuleName(module: any): string {
    return module.id || module.identifier || 'unknown';
  }

  private estimateModuleSize(module: any): number {
    try {
      return JSON.stringify(module).length;
    } catch {
      return 1000; // Default estimate
    }
  }

  private getModuleType(module: any): 'js' | 'css' | 'asset' | 'json' {
    const name = this.getModuleName(module);
    if (name.endsWith('.css')) return 'css';
    if (name.endsWith('.json')) return 'json';
    if (name.includes('asset')) return 'asset';
    return 'js';
  }

  private getModuleDependencies(module: any): string[] {
    if (module.dependencies && Array.isArray(module.dependencies)) {
      return module.dependencies.map((dep: any) => dep.request || dep.userRequest || 'unknown');
    }
    return [];
  }

  private isExternalModule(module: any): boolean {
    const name = this.getModuleName(module);
    return name.includes('node_modules') || name.startsWith('external');
  }

  private estimateChunkSize(modules: any): number {
    try {
      return JSON.stringify(modules).length;
    } catch {
      return 10000; // Default estimate
    }
  }

  private extractChunkModules(modules: any): ModuleInfo[] {
    // Simplified extraction
    return [];
  }

  private getChunkDependencies(modules: any): string[] {
    // Simplified dependency extraction
    return [];
  }

  private isAsyncChunk(chunkIds: any): boolean {
    return Array.isArray(chunkIds) && chunkIds.length > 0;
  }

  private isEntryChunk(chunkIds: any): boolean {
    return Array.isArray(chunkIds) && chunkIds.includes(0);
  }

  /**
   * Expose global API
   */
  private exposeGlobalAPI(): void {
    (window as any).__BUNDLE_ANALYZER__ = {
      analyze: () => this.analyze(),
      export: () => this.exportAnalysis(),
      chunks: () => Array.from(this.chunks.values()),
      modules: () => Array.from(this.modules.values()),
      metrics: () => this.metrics,
      findLargeModules: (threshold?: number) => this.findLargeModules(threshold),
      findDuplicates: () => this.findDuplicatedModules()
    };
  }
}

// Performance budget checker
export class PerformanceBudget {
  private budgets: Map<string, number> = new Map();

  constructor() {
    // Default budgets
    this.budgets.set('total', 1000000); // 1MB
    this.budgets.set('js', 500000); // 500KB
    this.budgets.set('css', 100000); // 100KB
    this.budgets.set('images', 500000); // 500KB
  }

  setBudget(type: string, size: number): void {
    this.budgets.set(type, size);
  }

  checkBudget(analysis: BundleAnalysis): { passed: boolean; violations: string[] } {
    const violations: string[] = [];
    let passed = true;

    // Check total size
    const totalBudget = this.budgets.get('total');
    if (totalBudget && analysis.totalSize > totalBudget) {
      violations.push(`Total size (${analysis.totalSize}) exceeds budget (${totalBudget})`);
      passed = false;
    }

    // Check individual chunks
    analysis.chunks.forEach(chunk => {
      const chunkBudget = this.budgets.get('chunk');
      if (chunkBudget && chunk.size > chunkBudget) {
        violations.push(`Chunk ${chunk.name} (${chunk.size}) exceeds budget (${chunkBudget})`);
        passed = false;
      }
    });

    return { passed, violations };
  }
}

// Module dependency analyzer
export class DependencyAnalyzer {
  analyzeCircularDependencies(modules: ModuleInfo[]): string[][] {
    const graph = new Map<string, string[]>();
    
    // Build dependency graph
    modules.forEach(module => {
      graph.set(module.id, module.dependencies);
    });

    // Find cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const dependencies = graph.get(node) || [];
      dependencies.forEach(dep => {
        dfs(dep, [...path, node]);
      });

      recursionStack.delete(node);
    };

    graph.forEach((_, node) => {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    });

    return cycles;
  }

  findUnusedDependencies(modules: ModuleInfo[]): string[] {
    const declared = new Set<string>();
    const used = new Set<string>();

    modules.forEach(module => {
      declared.add(module.name);
      module.dependencies.forEach(dep => used.add(dep));
    });

    return Array.from(declared).filter(dep => !used.has(dep));
  }
}

// Singleton instance
export const bundleAnalyzer = new BundleAnalyzer();

// Initialize in development
if (process.env.NODE_ENV === 'development') {
  bundleAnalyzer.init();
}

export default bundleAnalyzer;