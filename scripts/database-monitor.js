const DatabaseMonitoringService = require('../backend/services/database/DatabaseMonitoringService');
const { logger } = require('../backend/utils/logger');
const cron = require('node-cron');

class DatabaseMonitor {
    constructor() {
        this.dbMonitor = new DatabaseMonitoringService();
        this.alertThresholds = {
            slowQueryTime: 5000, // 5 seconds
            errorRatePercent: 10,
            avgResponseTime: 2000
        };
    }

    start() {
        logger.info('🔍 Starting Database Monitor...');

        // Monitor every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            try {
                await this.performMonitoring();
            } catch (error) {
                logger.error('Database monitoring failed:', error);
            }
        });

        // Daily performance report at 9 AM
        cron.schedule('0 9 * * *', async () => {
            try {
                await this.generateDailyReport();
            } catch (error) {
                logger.error('Daily report generation failed:', error);
            }
        });

        // Weekly cleanup at 2 AM Sunday
        cron.schedule('0 2 * * 0', async () => {
            try {
                await this.performCleanup();
            } catch (error) {
                logger.error('Database cleanup failed:', error);
            }
        });

        logger.info('✅ Database Monitor started successfully');
    }

    async performMonitoring() {
        try {
            const metrics = await this.dbMonitor.getPerformanceMetrics(1); // Last hour
            
            // Check for alerts
            await this.checkAlerts(metrics);
            
            // Log current status
            logger.info('Database monitoring check completed', {
                totalQueries: metrics.summary.totalQueries,
                avgResponseTime: metrics.summary.avgResponseTime,
                errorRate: metrics.summary.errorRate,
                slowQueries: metrics.summary.slowQueriesCount
            });

        } catch (error) {
            logger.error('Performance monitoring failed:', error);
        }
    }

    async checkAlerts(metrics) {
        const alerts = [];

        // Check average response time
        if (metrics.summary.avgResponseTime > this.alertThresholds.avgResponseTime) {
            alerts.push({
                type: 'high_response_time',
                severity: 'warning',
                message: `Average response time is ${metrics.summary.avgResponseTime}ms (threshold: ${this.alertThresholds.avgResponseTime}ms)`,
                value: metrics.summary.avgResponseTime
            });
        }

        // Check error rate
        const errorRate = parseFloat(metrics.summary.errorRate);
        if (errorRate > this.alertThresholds.errorRatePercent) {
            alerts.push({
                type: 'high_error_rate',
                severity: 'critical',
                message: `Error rate is ${errorRate}% (threshold: ${this.alertThresholds.errorRatePercent}%)`,
                value: errorRate
            });
        }

        // Check for frequent slow queries
        if (metrics.summary.slowQueriesCount > 10) {
            alerts.push({
                type: 'frequent_slow_queries',
                severity: 'warning',
                message: `${metrics.summary.slowQueriesCount} slow queries detected in the last hour`,
                value: metrics.summary.slowQueriesCount
            });
        }

        // Check individual query performance
        Object.entries(metrics.queryDistribution).forEach(([queryName, stats]) => {
            if (stats.avgTime > this.alertThresholds.slowQueryTime) {
                alerts.push({
                    type: 'slow_query_pattern',
                    severity: 'warning',
                    message: `Query "${queryName}" averages ${stats.avgTime}ms (${stats.count} executions)`,
                    query: queryName,
                    value: stats.avgTime
                });
            }
        });

        // Send alerts
        for (const alert of alerts) {
            await this.sendAlert(alert);
        }
    }

    async sendAlert(alert) {
        logger.warn(`🚨 DATABASE ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, alert);
        
        // Here you could integrate with external alerting systems
        // Example integrations (uncomment and configure as needed):
        
        // Slack webhook
        // if (process.env.SLACK_WEBHOOK_URL) {
        //     await this.sendSlackAlert(alert);
        // }
        
        // Email notification
        // if (process.env.ALERT_EMAIL) {
        //     await this.sendEmailAlert(alert);
        // }
    }

    async generateDailyReport() {
        try {
            const metrics = await this.dbMonitor.getPerformanceMetrics(24);
            const optimization = await this.dbMonitor.getQueryOptimizationSuggestions();
            
            const report = {
                date: new Date().toISOString().split('T')[0],
                summary: metrics.summary,
                topSlowQueries: metrics.slowQueries.slice(0, 5),
                optimizationSuggestions: optimization.suggestions.filter(s => s.priority === 'high'),
                queryDistribution: Object.entries(metrics.queryDistribution)
                    .sort(([,a], [,b]) => b.avgTime - a.avgTime)
                    .slice(0, 10)
            };

            logger.info('📊 Daily Database Performance Report', report);

            // Store report in database
            await this.dbMonitor.supabase
                .from('database_health_metrics')
                .insert({
                    metric_name: 'daily_report',
                    metric_value: 1,
                    metric_unit: 'report',
                    metadata: report
                });

        } catch (error) {
            logger.error('Failed to generate daily report:', error);
        }
    }

    async performCleanup() {
        try {
            const { data, error } = await this.dbMonitor.supabase
                .rpc('cleanup_old_performance_logs');

            if (error) throw error;

            logger.info(`🧹 Database cleanup completed. Removed ${data} old records`);
        } catch (error) {
            logger.error('Database cleanup failed:', error);
        }
    }
}

// CLI usage
if (require.main === module) {
    const monitor = new DatabaseMonitor();
    monitor.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nDatabase monitor shutting down...');
        process.exit(0);
    });
}

module.exports = DatabaseMonitor;
