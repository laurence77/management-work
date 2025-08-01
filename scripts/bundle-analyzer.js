#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Bundle Analyzer Script
 * Analyzes bundle sizes and provides optimization recommendations
 */

class BundleAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.adminRoot = path.join(this.projectRoot, 'admin-dashboard');
    this.results = {
      main: {},
      admin: {},
      recommendations: []
    };
  }

  /**
   * Analyze bundle sizes for both applications
   */
  async analyzeBundles() {
    console.log('🔍 Starting bundle analysis...\n');

    try {
      // Build both applications
      console.log('📦 Building main application...');
      await this.buildApplication('main');
      
      console.log('📦 Building admin dashboard...');
      await this.buildApplication('admin');

      // Analyze bundle sizes
      console.log('📊 Analyzing bundle sizes...\n');
      this.results.main = await this.analyzeBundleSize('main');
      this.results.admin = await this.analyzeBundleSize('admin');

      // Generate recommendations
      this.generateRecommendations();

      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Build application
   */
  async buildApplication(app) {
    const workingDir = app === 'main' ? this.projectRoot : this.adminRoot;
    
    try {
      execSync('npm run build', { 
        cwd: workingDir, 
        stdio: 'pipe' 
      });
    } catch (error) {
      throw new Error(`Failed to build ${app} application: ${error.message}`);
    }
  }

  /**
   * Analyze bundle size for an application
   */
  async analyzeBundleSize(app) {
    const distPath = app === 'main' 
      ? path.join(this.projectRoot, 'dist')
      : path.join(this.adminRoot, 'dist');

    if (!fs.existsSync(distPath)) {
      throw new Error(`Build directory not found for ${app}: ${distPath}`);
    }

    const analysis = {
      totalSize: 0,
      gzippedSize: 0,
      chunks: [],
      assets: {
        js: [],
        css: [],
        images: [],
        other: []
      }
    };

    // Analyze all files in dist directory
    await this.analyzeDirectory(distPath, analysis, '');

    // Calculate gzipped sizes
    analysis.gzippedSize = Math.round(analysis.totalSize * 0.3); // Rough estimate

    return analysis;
  }

  /**
   * Recursively analyze directory
   */
  async analyzeDirectory(dirPath, analysis, relativePath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        await this.analyzeDirectory(fullPath, analysis, relativeFilePath);
      } else {
        const stats = fs.statSync(fullPath);
        const size = stats.size;
        analysis.totalSize += size;

        const fileInfo = {
          name: entry.name,
          path: relativeFilePath,
          size: size,
          sizeKB: Math.round(size / 1024),
          sizeMB: Math.round(size / 1024 / 1024 * 100) / 100
        };

        // Categorize files
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.js') {
          analysis.assets.js.push(fileInfo);
          
          // Check if it's a chunk
          if (entry.name.includes('chunk') || entry.name.includes('vendor')) {
            analysis.chunks.push(fileInfo);
          }
        } else if (ext === '.css') {
          analysis.assets.css.push(fileInfo);
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
          analysis.assets.images.push(fileInfo);
        } else {
          analysis.assets.other.push(fileInfo);
        }
      }
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Check main app bundle size
    const mainTotalMB = this.results.main.totalSize / 1024 / 1024;
    if (mainTotalMB > 2) {
      recommendations.push({
        type: 'warning',
        app: 'main',
        issue: 'Large bundle size',
        description: `Main app bundle is ${mainTotalMB.toFixed(2)}MB, consider more aggressive code splitting`,
        priority: 'high'
      });
    }

    // Check admin app bundle size
    const adminTotalMB = this.results.admin.totalSize / 1024 / 1024;
    if (adminTotalMB > 3) {
      recommendations.push({
        type: 'warning',
        app: 'admin',
        issue: 'Large bundle size',
        description: `Admin app bundle is ${adminTotalMB.toFixed(2)}MB, consider lazy loading more components`,
        priority: 'medium'
      });
    }

    // Check for large individual JS files
    [...this.results.main.assets.js, ...this.results.admin.assets.js].forEach(file => {
      if (file.sizeKB > 500) {
        recommendations.push({
          type: 'optimization',
          app: file.path.includes('admin-dashboard') ? 'admin' : 'main',
          issue: 'Large JavaScript file',
          description: `${file.name} is ${file.sizeKB}KB, consider splitting or tree shaking`,
          priority: 'medium'
        });
      }
    });

    // Check for unoptimized images
    [...this.results.main.assets.images, ...this.results.admin.assets.images].forEach(file => {
      if (file.sizeKB > 100 && !file.name.includes('.webp')) {
        recommendations.push({
          type: 'optimization',
          app: file.path.includes('admin-dashboard') ? 'admin' : 'main',
          issue: 'Unoptimized image',
          description: `${file.name} is ${file.sizeKB}KB, consider WebP format and compression`,
          priority: 'low'
        });
      }
    });

    // Check chunk distribution
    if (this.results.main.chunks.length < 3) {
      recommendations.push({
        type: 'suggestion',
        app: 'main',
        issue: 'Insufficient code splitting',
        description: 'Consider implementing more granular code splitting for better caching',
        priority: 'medium'
      });
    }

    this.results.recommendations = recommendations;
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('📋 Bundle Analysis Report');
    console.log('========================\n');

    // Main application summary
    console.log('🎯 Main Application');
    console.log('------------------');
    this.printAppSummary(this.results.main);

    // Admin application summary
    console.log('\n🔧 Admin Dashboard');
    console.log('------------------');
    this.printAppSummary(this.results.admin);

    // Detailed breakdowns
    console.log('\n📊 Detailed Analysis');
    console.log('-------------------');
    
    console.log('\n📦 Main App JavaScript Files:');
    this.printFileList(this.results.main.assets.js);
    
    console.log('\n📦 Admin App JavaScript Files:');
    this.printFileList(this.results.admin.assets.js);

    // Recommendations
    console.log('\n💡 Optimization Recommendations');
    console.log('==============================');
    
    if (this.results.recommendations.length === 0) {
      console.log('✅ No critical optimization issues found!');
    } else {
      this.results.recommendations.forEach((rec, index) => {
        const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`${emoji} ${index + 1}. [${rec.app.toUpperCase()}] ${rec.issue}`);
        console.log(`   ${rec.description}\n`);
      });
    }

    // Performance benchmarks
    console.log('\n⚡ Performance Benchmarks');
    console.log('========================');
    this.printPerformanceBenchmarks();

    // Save detailed report
    this.saveDetailedReport();
  }

  /**
   * Print application summary
   */
  printAppSummary(analysis) {
    const totalMB = (analysis.totalSize / 1024 / 1024).toFixed(2);
    const gzippedMB = (analysis.gzippedSize / 1024 / 1024).toFixed(2);
    
    console.log(`📦 Total Size: ${totalMB}MB (${gzippedMB}MB gzipped)`);
    console.log(`🎯 JavaScript Files: ${analysis.assets.js.length}`);
    console.log(`🎨 CSS Files: ${analysis.assets.css.length}`);
    console.log(`🖼️  Images: ${analysis.assets.images.length}`);
    console.log(`📊 Chunks: ${analysis.chunks.length}`);
  }

  /**
   * Print file list with sizes
   */
  printFileList(files) {
    const sortedFiles = files.sort((a, b) => b.size - a.size).slice(0, 5);
    
    sortedFiles.forEach(file => {
      const sizeStr = file.sizeMB > 0 ? `${file.sizeMB}MB` : `${file.sizeKB}KB`;
      console.log(`  📄 ${file.name}: ${sizeStr}`);
    });
    
    if (files.length > 5) {
      console.log(`  ... and ${files.length - 5} more files`);
    }
  }

  /**
   * Print performance benchmarks
   */
  printPerformanceBenchmarks() {
    const mainSize = this.results.main.gzippedSize / 1024;
    const adminSize = this.results.admin.gzippedSize / 1024;
    
    console.log('🌐 Loading Time Estimates (3G connection):');
    console.log(`   Main App: ~${Math.ceil(mainSize / 50)}s`);
    console.log(`   Admin App: ~${Math.ceil(adminSize / 50)}s`);
    
    console.log('\n📱 Mobile Performance:');
    console.log(`   Main App: ${mainSize < 200 ? '✅ Good' : mainSize < 400 ? '⚠️ Fair' : '❌ Poor'}`);
    console.log(`   Admin App: ${adminSize < 300 ? '✅ Good' : adminSize < 600 ? '⚠️ Fair' : '❌ Poor'}`);
    
    console.log('\n🚀 Optimization Status:');
    const totalRecommendations = this.results.recommendations.length;
    const highPriority = this.results.recommendations.filter(r => r.priority === 'high').length;
    
    if (totalRecommendations === 0) {
      console.log('   ✅ Fully optimized');
    } else if (highPriority === 0) {
      console.log('   🟡 Minor optimizations available');
    } else {
      console.log('   🔴 Optimization needed');
    }
  }

  /**
   * Save detailed report to file
   */
  saveDetailedReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      main: this.results.main,
      admin: this.results.admin,
      recommendations: this.results.recommendations,
      summary: {
        mainSizeMB: (this.results.main.totalSize / 1024 / 1024).toFixed(2),
        adminSizeMB: (this.results.admin.totalSize / 1024 / 1024).toFixed(2),
        totalRecommendations: this.results.recommendations.length,
        highPriorityIssues: this.results.recommendations.filter(r => r.priority === 'high').length
      }
    };

    const reportPath = path.join(this.projectRoot, 'bundle-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
    case 'full':
      const analyzer = new BundleAnalyzer();
      analyzer.analyzeBundles();
      break;
      
    case 'quick':
      console.log('🚀 Quick bundle analysis (no build)...');
      // Quick analysis without building
      const quickAnalyzer = new BundleAnalyzer();
      Promise.all([
        quickAnalyzer.analyzeBundleSize('main').catch(() => ({ totalSize: 0, assets: { js: [] } })),
        quickAnalyzer.analyzeBundleSize('admin').catch(() => ({ totalSize: 0, assets: { js: [] } }))
      ]).then(([main, admin]) => {
        quickAnalyzer.results.main = main;
        quickAnalyzer.results.admin = admin;
        quickAnalyzer.generateRecommendations();
        quickAnalyzer.generateReport();
      });
      break;
      
    default:
      console.log(`
📊 Bundle Analyzer

Usage: node scripts/bundle-analyzer.js <command>

Commands:
  analyze   - Full analysis with fresh builds
  full      - Same as analyze
  quick     - Quick analysis using existing builds

Examples:
  node scripts/bundle-analyzer.js analyze
  node scripts/bundle-analyzer.js quick
`);
  }
}

module.exports = { BundleAnalyzer };