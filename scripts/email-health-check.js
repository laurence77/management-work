const EmailTemplateService = require('../backend/services/EmailTemplateService');

async function healthCheck() {
    const emailService = new EmailTemplateService();
    
    console.log('🏥 Email System Health Check');
    console.log('================================');
    
    try {
        // Check database connection
        const { data: templates } = await emailService.supabase
            .from('email_templates')
            .select('count')
            .limit(1);
        
        console.log('✅ Database connection: OK');
        
        // Check SMTP connection
        await emailService.transporter.verify();
        console.log('✅ SMTP connection: OK');
        
        // Get queue status
        const { data: queueItems } = await emailService.supabase
            .from('email_queue')
            .select('status, count(*)')
            .group('status');
        
        console.log('📊 Queue Status:');
        queueItems?.forEach(item => {
            console.log(`   ${item.status}: ${item.count}`);
        });
        
        // Get recent stats
        const stats = await emailService.getDeliveryStats(1);
        console.log('📈 Last 24h Stats:');
        console.log(`   Total: ${stats.total}`);
        console.log(`   Delivered: ${stats.delivered} (${stats.deliveryRate}%)`);
        console.log(`   Failed: ${stats.failed} (${stats.failureRate}%)`);
        
        console.log('\n🎉 Email system is healthy!');
        
    } catch (error) {
        console.error('❌ Health check failed:', error);
        process.exit(1);
    }
}

healthCheck();