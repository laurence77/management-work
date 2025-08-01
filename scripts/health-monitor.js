const HealthCheckService = require('../backend/services/health/HealthCheckService');
const { logger } = require('../backend/utils/logger');

class HealthMonitor {
    constructor() {
        this.healthService = new HealthCheckService();
        this.alertThresholds = {
            consecutiveFailures: 3,
            responseTimeWarning: 5000,
            responseTimeCritical: 10000
        };
        this.failureCount = new Map();
        this.isRunning = false;
    }

    start(intervalMs = 60000) {
        if (this.isRunning) {
            logger.warn('Health monitor is already running');
            return;
        }

        logger.info('🏥 Starting health monitor...');
        this.isRunning = true;

        this.interval = setInterval(async () => {
            try {
                await this.performCheck();
            } catch (error) {
                logger.error('Health monitor check failed:', error);
            }
        }, intervalMs);

        // Perform initial check
        this.performCheck();
    }

    stop() {
        if (!this.isRunning) return;

        logger.info('Stopping health monitor...');
        this.isRunning = false;
        
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    async performCheck() {
        const startTime = Date.now();
        
        try {
            const result = await this.healthService.performHealthCheck(false);
            const checkTime = Date.now() - startTime;

            // Log overall status
            logger.info(`Health check completed: ${result.status} (${checkTime}ms)`, {
                status: result.status,
                responseTime: result.responseTime,
                passed: result.summary.passed,
                failed: result.summary.failed,
                warnings: result.summary.warnings
            });

            // Check for alerts
            await this.checkAlerts(result);

            // Reset failure count on success
            if (result.status === 'healthy') {
                this.failureCount.clear();
            }

        } catch (error) {
            logger.error('Health check failed:', error);
            this.incrementFailureCount('system');
        }
    }

    async checkAlerts(result) {
        // Check overall system health
        if (result.status === 'unhealthy') {
            this.incrementFailureCount('system');
            
            if (this.getFailureCount('system') >= this.alertThresholds.consecutiveFailures) {
                await this.sendAlert('CRITICAL', 'System is unhealthy', result);
            }
        }

        // Check response time
        if (result.responseTime > this.alertThresholds.responseTimeCritical) {
            await this.sendAlert('CRITICAL', `Response time is critically high: ${result.responseTime}ms`, result);
        } else if (result.responseTime > this.alertThresholds.responseTimeWarning) {
            await this.sendAlert('WARNING', `Response time is high: ${result.responseTime}ms`, result);
        }

        // Check individual services
        for (const [serviceName, check] of Object.entries(result.checks)) {
            if (check.status === 'failed') {
                this.incrementFailureCount(serviceName);
                
                if (this.getFailureCount(serviceName) >= this.alertThresholds.consecutiveFailures) {
                    await this.sendAlert('CRITICAL', `Service ${serviceName} has failed`, {
                        service: serviceName,
                        error: check.error,
                        timestamp: check.timestamp
                    });
                }
            } else {
                // Reset failure count on success
                this.failureCount.delete(serviceName);
            }
        }
    }

    incrementFailureCount(service) {
        const current = this.failureCount.get(service) || 0;
        this.failureCount.set(service, current + 1);
    }

    getFailureCount(service) {
        return this.failureCount.get(service) || 0;
    }

    async sendAlert(severity, message, data) {
        logger.error(`🚨 HEALTH ALERT [${severity}]: ${message}`, data);
        
        // Here you could integrate with external alerting systems:
        // - Send to Slack/Discord webhook
        // - Send email notification
        // - Send to PagerDuty
        // - Send to Sentry
        
        try {
            // Example: Send to webhook (uncomment and configure)
            // if (process.env.ALERT_WEBHOOK_URL) {
            //     await fetch(process.env.ALERT_WEBHOOK_URL, {
            //         method: 'POST',
            //         headers: { 'Content-Type': 'application/json' },
            //         body: JSON.stringify({
            //             severity,
            //             message,
            //             data,
            //             timestamp: new Date().toISOString()
            //         })
            //     });
            // }
        } catch (error) {
            logger.error('Failed to send alert:', error);
        }
    }
}

// CLI usage
if (require.main === module) {
    const monitor = new HealthMonitor();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const intervalMs = args.includes('--interval') ? 
        parseInt(args[args.indexOf('--interval') + 1]) * 1000 : 60000;

    monitor.start(intervalMs);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, shutting down gracefully...');
        monitor.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM, shutting down gracefully...');
        monitor.stop();
        process.exit(0);
    });
}

module.exports = HealthMonitor;
