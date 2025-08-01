const EmailTemplateService = require('../services/EmailTemplateService');
const cron = require('node-cron');

class EmailWorker {
    constructor() {
        this.emailService = new EmailTemplateService();
        this.isRunning = false;
    }

    start() {
        console.log('🚀 Starting Email Worker...');
        
        // Process queue every minute
        cron.schedule('* * * * *', async () => {
            if (this.isRunning) return;
            
            try {
                this.isRunning = true;
                const processed = await this.emailService.processQueue(50);
                
                if (processed > 0) {
                    console.log(`📧 Processed ${processed} emails from queue`);
                }
            } catch (error) {
                console.error('❌ Email queue processing failed:', error);
            } finally {
                this.isRunning = false;
            }
        });

        // Cleanup old logs daily at 2 AM
        cron.schedule('0 2 * * *', async () => {
            try {
                await this.cleanupOldLogs();
                console.log('🧹 Email logs cleanup completed');
            } catch (error) {
                console.error('❌ Email logs cleanup failed:', error);
            }
        });

        console.log('✅ Email Worker started successfully');
    }

    async cleanupOldLogs() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

        const { error } = await this.emailService.supabase
            .from('email_delivery_logs')
            .delete()
            .lt('created_at', cutoffDate.toISOString());

        if (error) throw error;
    }
}

// Start worker if this file is run directly
if (require.main === module) {
    const worker = new EmailWorker();
    worker.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('📧 Email Worker shutting down...');
        process.exit(0);
    });
}

module.exports = EmailWorker;