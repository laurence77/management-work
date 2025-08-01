const express = require('express');
const router = express.Router();
const EmailTemplateService = require('../services/EmailTemplateService');
const { authenticate } = require('../middleware/auth');

const emailService = new EmailTemplateService();

// Get email stats
router.get('/stats', authenticate, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const stats = await emailService.getDeliveryStats(days);
        res.json(stats);
    } catch (error) {
        console.error('Failed to get email stats:', error);
        res.status(500).json({ error: 'Failed to get email stats' });
    }
});

// Get email metrics
router.get('/metrics', authenticate, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const metrics = await emailService.getMetrics(startDate, endDate, req.query.templateType);
        res.json(metrics);
    } catch (error) {
        console.error('Failed to get email metrics:', error);
        res.status(500).json({ error: 'Failed to get email metrics' });
    }
});

// Send template email
router.post('/send', authenticate, async (req, res) => {
    try {
        const { templateName, recipientEmail, templateData } = req.body;
        
        if (!templateName || !recipientEmail) {
            return res.status(400).json({ error: 'Template name and recipient email are required' });
        }
        
        const result = await emailService.sendTemplatedEmail(templateName, recipientEmail, templateData);
        res.json(result);
    } catch (error) {
        console.error('Failed to send email:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get email templates
router.get('/templates', authenticate, async (req, res) => {
    try {
        const { data: templates, error } = await emailService.supabase
            .from('email_templates')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        res.json(templates);
    } catch (error) {
        console.error('Failed to get templates:', error);
        res.status(500).json({ error: 'Failed to get templates' });
    }
});

// Process email queue manually
router.post('/process-queue', authenticate, async (req, res) => {
    try {
        const processed = await emailService.processQueue(req.body.batchSize || 10);
        res.json({ processed });
    } catch (error) {
        console.error('Failed to process queue:', error);
        res.status(500).json({ error: 'Failed to process queue' });
    }
});

module.exports = router;