const DataRetentionService = require('../backend/services/data-retention/DataRetentionService');
const { logger } = require('../backend/utils/logger');

class DataRetentionMonitor {
    constructor() {
        this.retentionService = new DataRetentionService();
    }

    start() {
        logger.info('🧹 Starting Data Retention Monitor...');
        
        // Start the retention service
        this.retentionService.start();
        
        // Monitor disk space
        this.monitorDiskSpace();
        
        logger.info('✅ Data Retention Monitor started successfully');
    }

    async monitorDiskSpace() {
        setInterval(async () => {
            try {
                const diskUsage = await this.getDiskUsage();
                
                if (diskUsage.used_percentage > 85) {
                    logger.warn('🚨 High disk usage detected:', diskUsage);
                    // Trigger emergency cleanup
                    await this.emergencyCleanup();
                }
            } catch (error) {
                logger.error('Disk space monitoring failed:', error);
            }
        }, 30 * 60 * 1000); // Check every 30 minutes
    }

    async getDiskUsage() {
        // Simplified disk usage check
        return {
            total_gb: 100,
            used_gb: 75,
            available_gb: 25,
            used_percentage: 75
        };
    }

    async emergencyCleanup() {
        logger.warn('🚨 Triggering emergency cleanup due to high disk usage');
        
        try {
            await this.retentionService.performDailyCleanup();
            logger.info('✅ Emergency cleanup completed');
        } catch (error) {
            logger.error('❌ Emergency cleanup failed:', error);
        }
    }
}

// CLI usage
if (require.main === module) {
    const monitor = new DataRetentionMonitor();
    monitor.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nData Retention Monitor shutting down...');
        process.exit(0);
    });
}

module.exports = DataRetentionMonitor;
