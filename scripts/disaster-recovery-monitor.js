const DisasterRecoveryService = require('../backend/services/disaster-recovery/DisasterRecoveryService');
const { logger } = require('../backend/utils/logger');
const cron = require('node-cron');

class DisasterRecoveryMonitor {
    constructor() {
        this.drService = new DisasterRecoveryService();
        this.alertThresholds = {
            rpoHours: 24,
            rtoHours: 4,
            backupFailures: 3
        };
    }

    start() {
        logger.info('🔄 Starting Disaster Recovery Monitor...');

        // Daily backup at 2 AM
        cron.schedule('0 2 * * *', async () => {
            try {
                await this.performDailyBackup();
            } catch (error) {
                logger.error('Daily backup failed:', error);
            }
        });

        // Hourly incremental backup
        cron.schedule('0 * * * *', async () => {
            try {
                await this.performIncrementalBackup();
            } catch (error) {
                logger.error('Incremental backup failed:', error);
            }
        });

        // Weekly DR test on Sundays at 3 AM
        cron.schedule('0 3 * * 0', async () => {
            try {
                await this.performWeeklyDRTest();
            } catch (error) {
                logger.error('Weekly DR test failed:', error);
            }
        });

        // Monitor DR health every 30 minutes
        cron.schedule('*/30 * * * *', async () => {
            try {
                await this.monitorDRHealth();
            } catch (error) {
                logger.error('DR health monitoring failed:', error);
            }
        });

        logger.info('✅ Disaster Recovery Monitor started successfully');
    }

    async performDailyBackup() {
        try {
            logger.info('Starting daily backup...');
            const backup = await this.drService.createDatabaseBackup('daily');
            
            logger.info('Daily backup completed successfully', {
                backupId: backup.id,
                size: backup.metadata.backup_size,
                tables: backup.metadata.table_count
            });
        } catch (error) {
            logger.error('Daily backup failed:', error);
            await this.sendAlert('critical', 'Daily backup failed', { error: error.message });
        }
    }

    async performIncrementalBackup() {
        try {
            // For incremental backup, we'll backup only high-frequency tables
            const backup = await this.drService.createDatabaseBackup('incremental');
            
            logger.info('Incremental backup completed', {
                backupId: backup.id,
                type: 'incremental'
            });
        } catch (error) {
            logger.warn('Incremental backup failed:', error);
        }
    }

    async performWeeklyDRTest() {
        try {
            logger.info('Starting weekly disaster recovery test...');
            const testResults = await this.drService.testDisasterRecovery();
            
            if (testResults.overall_status === 'failed') {
                await this.sendAlert('high', 'Weekly DR test failed', testResults);
            } else if (testResults.overall_status === 'warning') {
                await this.sendAlert('medium', 'Weekly DR test has warnings', testResults);
            }
            
            logger.info('Weekly DR test completed', testResults);
        } catch (error) {
            logger.error('Weekly DR test failed:', error);
            await this.sendAlert('critical', 'Weekly DR test failed to execute', { error: error.message });
        }
    }

    async monitorDRHealth() {
        try {
            const status = await this.drService.getDisasterRecoveryStatus();
            
            // Check RTO/RPO compliance
            if (status.metrics.rpo_hours > this.alertThresholds.rpoHours) {
                await this.sendAlert('high', `RPO threshold exceeded: ${status.metrics.rpo_hours} hours`, status.metrics);
            }
            
            if (status.metrics.rto_estimate_hours > this.alertThresholds.rtoHours) {
                await this.sendAlert('medium', `RTO estimate high: ${status.metrics.rto_estimate_hours} hours`, status.metrics);
            }
            
            // Check overall status
            if (status.status === 'critical') {
                await this.sendAlert('critical', 'Disaster Recovery status is critical', status);
            } else if (status.status === 'error') {
                await this.sendAlert('high', 'Disaster Recovery monitoring error', status);
            }
            
            logger.debug('DR health check completed', {
                status: status.status,
                rpo_hours: status.metrics.rpo_hours,
                rto_hours: status.metrics.rto_estimate_hours,
                recent_backups: status.recent_backups
            });
        } catch (error) {
            logger.error('DR health monitoring failed:', error);
        }
    }

    async sendAlert(severity, message, data) {
        logger.warn(`🚨 DR ALERT [${severity.toUpperCase()}]: ${message}`, data);
        
        // Integration points for external alerting
        // You can integrate with:
        // - PagerDuty
        // - Slack/Discord webhooks
        // - Email notifications
        // - SMS alerts
        
        try {
            // Example webhook integration (uncomment and configure)
            // if (process.env.DR_ALERT_WEBHOOK_URL) {
            //     await fetch(process.env.DR_ALERT_WEBHOOK_URL, {
            //         method: 'POST',
            //         headers: { 'Content-Type': 'application/json' },
            //         body: JSON.stringify({
            //             severity,
            //             message,
            //             data,
            //             timestamp: new Date().toISOString(),
            //             service: 'disaster-recovery'
            //         })
            //     });
            // }
        } catch (error) {
            logger.error('Failed to send DR alert:', error);
        }
    }
}

// CLI usage
if (require.main === module) {
    const monitor = new DisasterRecoveryMonitor();
    monitor.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nDisaster Recovery Monitor shutting down...');
        process.exit(0);
    });
}

module.exports = DisasterRecoveryMonitor;
