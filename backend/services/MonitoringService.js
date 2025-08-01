const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./LoggingService');

/**
 * Application Monitoring and Health Check Service
 * Comprehensive system monitoring with metrics collection
 */

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        responseTimeSum: 0,
        responseTimeCount: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        errors: 0,
        connectionPool: {
          active: 0,
          idle: 0,
          waiting: 0
        }
      },
      cache: {
        hits: 0,
        misses: 0,
        errors: 0
      },
      system: {
        uptime: process.uptime(),
        startTime: Date.now()
      }
    };
    
    this.healthChecks = new Map();
    this.alerts = [];
    this.thresholds = {
      responseTime: 1000,
      errorRate: 0.05,
      memoryUsage: 0.9,
      cpuUsage: 0.8,
      diskUsage: 0.9
    };
    
    this.setupPeriodicMetrics();
    this.registerDefaultHealthChecks();
    
    logger.info('📊 Monitoring service initialized');
  }
  
  setupPeriodicMetrics() {
    // Collect system metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
    
    // Clean old metrics every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }
  
  async collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const loadAvg = os.loadavg();
      
      this.metrics.system = {
        ...this.metrics.system,
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        loadAverage: {
          '1m': loadAvg[0],
          '5m': loadAvg[1],
          '15m': loadAvg[2]
        },
        uptime: process.uptime(),
        freeMem: os.freemem(),
        totalMem: os.totalmem(),
        platform: os.platform(),
        nodeVersion: process.version
      };
      
      // Check for alerts
      await this.checkAlerts();
      
    } catch (error) {
      logger.error('Failed to collect system metrics', error);
    }
  }
  
  async checkAlerts() {
    const alerts = [];
    
    // Memory usage alert
    const memUsagePercent = this.metrics.system.memory.heapUsed / this.metrics.system.memory.heapTotal;
    if (memUsagePercent > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'memory',
        severity: 'high',
        message: `High memory usage: ${(memUsagePercent * 100).toFixed(1)}%`,
        value: memUsagePercent,
        threshold: this.thresholds.memoryUsage
      });
    }
    
    // Response time alert
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime > this.thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'medium',
        message: `High average response time: ${avgResponseTime}ms`,
        value: avgResponseTime,
        threshold: this.thresholds.responseTime
      });
    }
    
    // Error rate alert
    const errorRate = this.getErrorRate();
    if (errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        value: errorRate,
        threshold: this.thresholds.errorRate
      });
    }
    
    // Log new alerts
    for (const alert of alerts) {
      if (!this.alerts.find(a => a.type === alert.type && a.severity === alert.severity)) {
        logger.warn('System Alert', alert);
        this.alerts.push({
          ...alert,
          timestamp: Date.now(),
          acknowledged: false
        });
      }
    }
    
    // Clean acknowledged alerts older than 1 hour
    this.alerts = this.alerts.filter(alert => 
      !alert.acknowledged || (Date.now() - alert.timestamp) < 3600000);
  }
  
  registerDefaultHealthChecks() {
    // Database health check
    this.registerHealthCheck('database', async () => {
      try {
        const { checkDatabaseHealth } = require('../config/database');
        const health = await checkDatabaseHealth();
        
        return {
          status: health.supabase || health.postgresql ? 'healthy' : 'unhealthy',
          details: health,
          responseTime: Date.now()
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          responseTime: Date.now()
        };
      }
    });
    
    // Cache health check
    this.registerHealthCheck('cache', async () => {
      try {
        const cacheService = require('./CacheService');
        const stats = await cacheService.getStats();
        
        return {
          status: 'healthy',
          details: stats,
          responseTime: Date.now()
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          responseTime: Date.now()
        };
      }
    });
    
    // Disk space health check
    this.registerHealthCheck('disk', async () => {
      try {
        const stats = await fs.stat(process.cwd());
        const diskUsage = await this.getDiskUsage();
        
        return {
          status: diskUsage.usage < this.thresholds.diskUsage ? 'healthy' : 'unhealthy',
          details: diskUsage,
          responseTime: Date.now()
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          responseTime: Date.now()
        };
      }
    });
    
    // External services health check
    this.registerHealthCheck('external', async () => {
      const services = [];
      
      // Check CDN (Cloudinary)
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const cloudinary = require('cloudinary').v2;
          await cloudinary.api.ping();
          services.push({ name: 'cloudinary', status: 'healthy' });
        } catch (error) {
          services.push({ name: 'cloudinary', status: 'unhealthy', error: error.message });
        }
      }
      
      // Check email service
      if (process.env.SMTP_HOST) {
        try {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true'
          });
          
          await transporter.verify();
          services.push({ name: 'smtp', status: 'healthy' });
        } catch (error) {
          services.push({ name: 'smtp', status: 'unhealthy', error: error.message });
        }
      }
      
      const allHealthy = services.every(service => service.status === 'healthy');
      
      return {
        status: allHealthy ? 'healthy' : 'degraded',
        details: { services },
        responseTime: Date.now()
      };
    });
  }
  
  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
    logger.info(`Registered health check: ${name}`);
  }
  
  async runHealthCheck(name) {
    const checkFunction = this.healthChecks.get(name);
    if (!checkFunction) {
      throw new Error(`Health check '${name}' not found`);
    }
    
    const startTime = Date.now();
    
    try {
      const result = await checkFunction();
      const duration = Date.now() - startTime;
      
      return {
        name,
        ...result,
        duration,
        timestamp: Date.now()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name,
        status: 'unhealthy',
        error: error.message,
        duration,
        timestamp: Date.now()
      };
    }
  }
  
  async runAllHealthChecks() {
    const results = {};
    const promises = [];
    
    for (const [name] of this.healthChecks) {
      promises.push(
        this.runHealthCheck(name).then(result => {
          results[name] = result;
        })
      );
    }
    
    await Promise.all(promises);
    
    const overallStatus = Object.values(results).every(r => r.status === 'healthy') 
      ? 'healthy' 
      : Object.values(results).some(r => r.status === 'unhealthy')
      ? 'unhealthy'
      : 'degraded';
    
    return {
      status: overallStatus,
      timestamp: Date.now(),
      checks: results
    };
  }
  
  // Metrics recording methods
  recordRequest(method, path, statusCode, responseTime) {
    this.metrics.requests.total++;
    this.metrics.requests.responseTimeSum += responseTime;
    this.metrics.requests.responseTimeCount++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }
  }
  
  recordDatabaseQuery(duration, error = false) {
    this.metrics.database.queries++;
    
    if (error) {
      this.metrics.database.errors++;
    }
    
    if (duration > 1000) {
      this.metrics.database.slowQueries++;
    }
  }
  
  recordCacheOperation(hit = true, error = false) {
    if (error) {
      this.metrics.cache.errors++;
    } else if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
  }
  
  updateConnectionPool(active, idle, waiting) {
    this.metrics.database.connectionPool = { active, idle, waiting };
  }
  
  // Metrics calculation methods
  getAverageResponseTime() {
    return this.metrics.requests.responseTimeCount > 0
      ? Math.round(this.metrics.requests.responseTimeSum / this.metrics.requests.responseTimeCount)
      : 0;
  }
  
  getErrorRate() {
    return this.metrics.requests.total > 0
      ? this.metrics.requests.errors / this.metrics.requests.total
      : 0;
  }
  
  getCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    return total > 0 ? this.metrics.cache.hits / total : 0;
  }
  
  async getDiskUsage() {
    try {
      const stats = await fs.stat(process.cwd());
      // This is a simplified version - in production you'd use a proper disk usage library
      return {
        usage: 0.1, // Placeholder
        free: os.freemem(),
        total: os.totalmem()
      };
    } catch (error) {
      return { usage: 0, free: 0, total: 0, error: error.message };
    }
  }
  
  // Get comprehensive metrics
  getMetrics() {
    return {
      ...this.metrics,
      calculated: {
        averageResponseTime: this.getAverageResponseTime(),
        errorRate: this.getErrorRate(),
        cacheHitRate: this.getCacheHitRate(),
        requestsPerSecond: this.metrics.requests.total / process.uptime(),
        memoryUsagePercent: this.metrics.system.memory ? 
          (this.metrics.system.memory.heapUsed / this.metrics.system.memory.heapTotal) * 100 : 0
      },
      alerts: this.alerts.filter(alert => !alert.acknowledged),
      timestamp: Date.now()
    };
  }
  
  // Get system information
  getSystemInfo() {
    return {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      os: {
        type: os.type(),
        release: os.release(),
        hostname: os.hostname(),
        uptime: os.uptime()
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        cwd: process.cwd(),
        execPath: process.execPath,
        argv: process.argv
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: Date.now()
    };
  }
  
  // Acknowledge alert
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      logger.info('Alert acknowledged', { alertId, type: alert.type });
    }
  }
  
  // Clean up old metrics
  cleanupOldMetrics() {
    // Reset counters periodically to prevent overflow
    if (this.metrics.requests.total > 1000000) {
      const ratio = 100000 / this.metrics.requests.total;
      
      this.metrics.requests.total = Math.round(this.metrics.requests.total * ratio);
      this.metrics.requests.success = Math.round(this.metrics.requests.success * ratio);
      this.metrics.requests.errors = Math.round(this.metrics.requests.errors * ratio);
      this.metrics.requests.responseTimeSum = Math.round(this.metrics.requests.responseTimeSum * ratio);
      this.metrics.requests.responseTimeCount = Math.round(this.metrics.requests.responseTimeCount * ratio);
      
      logger.info('Metrics counters reset to prevent overflow');
    }
  }
  
  // Export metrics in Prometheus format
  getPrometheusMetrics() {
    const metrics = this.getMetrics();
    
    let output = '';
    
    // Request metrics
    output += `# HELP http_requests_total Total number of HTTP requests\n`;
    output += `# TYPE http_requests_total counter\n`;
    output += `http_requests_total{status="success"} ${metrics.requests.success}\n`;
    output += `http_requests_total{status="error"} ${metrics.requests.errors}\n`;
    
    // Response time
    output += `# HELP http_request_duration_ms Average HTTP request duration in milliseconds\n`;
    output += `# TYPE http_request_duration_ms gauge\n`;
    output += `http_request_duration_ms ${metrics.calculated.averageResponseTime}\n`;
    
    // Memory usage
    output += `# HELP process_memory_usage_bytes Process memory usage in bytes\n`;
    output += `# TYPE process_memory_usage_bytes gauge\n`;
    if (metrics.system.memory) {
      output += `process_memory_usage_bytes{type="heap_used"} ${metrics.system.memory.heapUsed}\n`;
      output += `process_memory_usage_bytes{type="heap_total"} ${metrics.system.memory.heapTotal}\n`;
      output += `process_memory_usage_bytes{type="rss"} ${metrics.system.memory.rss}\n`;
    }
    
    // Cache metrics
    output += `# HELP cache_operations_total Total number of cache operations\n`;
    output += `# TYPE cache_operations_total counter\n`;
    output += `cache_operations_total{result="hit"} ${metrics.cache.hits}\n`;
    output += `cache_operations_total{result="miss"} ${metrics.cache.misses}\n`;
    output += `cache_operations_total{result="error"} ${metrics.cache.errors}\n`;
    
    return output;
  }
  
  // Shutdown cleanup
  shutdown() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    logger.info('Monitoring service shut down');
  }
}

// Create and export singleton instance
const monitoringService = new MonitoringService();

// Cleanup on process exit
process.on('SIGINT', () => monitoringService.shutdown());
process.on('SIGTERM', () => monitoringService.shutdown());

module.exports = monitoringService;