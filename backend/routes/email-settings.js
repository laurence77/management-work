const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get all email settings
router.get('/email', async (req, res) => {
  try {
    let data = [];
    let fromDatabase = false;

    // Try to get from database first
    try {
      const { data: dbData, error } = await supabase
        .from('email_settings')
        .select('*')
        .eq('is_active', true)
        .order('setting_key');

      if (!error && dbData && dbData.length > 0) {
        data = dbData;
        fromDatabase = true;
      }
    } catch (dbError) {
      logger.warn('Database email settings not available, using environment fallback');
    }

    // If no database settings, fallback to environment variables
    if (!fromDatabase) {
      data = [
        {
          id: 1,
          setting_key: 'smtp_host',
          setting_value: process.env.SMTP_HOST || 'smtp.hostinger.com',
          description: 'SMTP Server Host',
          is_active: true
        },
        {
          id: 2,
          setting_key: 'smtp_port',
          setting_value: process.env.SMTP_PORT || '465',
          description: 'SMTP Server Port',
          is_active: true
        },
        {
          id: 3,
          setting_key: 'smtp_secure',
          setting_value: process.env.SMTP_SECURE || 'true',
          description: 'Use SSL/TLS',
          is_active: true
        },
        {
          id: 4,
          setting_key: 'smtp_user',
          setting_value: process.env.SMTP_USER || 'management@bookmyreservation.org',
          description: 'SMTP Username',
          is_active: true
        },
        {
          id: 5,
          setting_key: 'smtp_pass',
          setting_value: process.env.SMTP_PASS ? '***CONFIGURED***' : 'NOT SET',
          description: 'SMTP Password',
          is_active: true
        },
        {
          id: 6,
          setting_key: 'email_from',
          setting_value: process.env.EMAIL_FROM || '"Celebrity Booking Platform" <management@bookmyreservation.org>',
          description: 'From Email Address',
          is_active: true
        },
        {
          id: 7,
          setting_key: 'primary_email',
          setting_value: 'management@bookmyreservation.org',
          description: 'Primary Contact Email',
          is_active: true
        }
      ];
      logger.info('Using environment-based email settings');
    }

    logger.info('Email settings retrieved', { count: data?.length, source: fromDatabase ? 'database' : 'environment' });
    res.json({
      settings: data,
      source: fromDatabase ? 'database' : 'environment',
      count: data?.length || 0
    });
  } catch (error) {
    logger.error('Failed to get email settings:', error);
    res.status(500).json({ error: 'Failed to retrieve email settings' });
  }
});

// Get specific email setting
router.get('/email/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const { data, error } = await supabase
      .rpc('get_email_setting', { p_setting_key: key });

    if (error) throw error;

    res.json({ key, value: data });
  } catch (error) {
    logger.error(`Failed to get email setting ${req.params.key}:`, error);
    res.status(500).json({ error: 'Failed to retrieve setting' });
  }
});

// Update single email setting
router.put('/email/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value && value !== '') {
      return res.status(400).json({ error: 'Value is required' });
    }

    const { data, error } = await supabase
      .rpc('update_email_setting', { 
        p_setting_key: key, 
        p_setting_value: value 
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    logger.info('Email setting updated', { key, value });
    res.json({ success: true, key, value });
  } catch (error) {
    logger.error(`Failed to update email setting ${req.params.key}:`, error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Bulk update email settings
router.post('/email/bulk-update', async (req, res) => {
  try {
    const { changes } = req.body;

    if (!changes || typeof changes !== 'object') {
      return res.status(400).json({ error: 'Changes object is required' });
    }

    const results = [];
    
    for (const [key, value] of Object.entries(changes)) {
      try {
        const { data, error } = await supabase
          .rpc('update_email_setting', { 
            p_setting_key: key, 
            p_setting_value: value 
          });

        if (error) throw error;
        results.push({ key, value, success: true });
      } catch (settingError) {
        logger.error(`Failed to update setting ${key}:`, settingError);
        results.push({ key, value, success: false, error: settingError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('Bulk email settings update completed', { 
      total: results.length, 
      successful: successCount 
    });

    res.json({ 
      success: true, 
      updated: successCount,
      total: results.length,
      results 
    });
  } catch (error) {
    logger.error('Failed to bulk update email settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Test email configuration
router.post('/email/test', async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, message' });
    }

    // Use the EmailService directly for testing
    const emailService = require('../services/emailService');
    
    const result = await emailService.sendEmail({
      to: to || 'management@bookmyreservation.org',
      subject: subject || 'Test Email from Admin Dashboard',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🧪 Email Test</h2>
          <p><strong>Message:</strong> ${message}</p>
          <hr>
          <p><strong>Configuration Test:</strong></p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT}</li>
            <li>SMTP User: ${process.env.SMTP_USER}</li>
            <li>SMTP Secure: ${process.env.SMTP_SECURE}</li>
          </ul>
          <p><small>Test sent at: ${new Date().toLocaleString()}</small></p>
        </div>
      `
    });

    logger.info('Test email sent via EmailService', { to, subject, success: result.success });
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        to,
        subject,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.message || 'Failed to send test email',
        details: 'Check SMTP configuration and credentials'
      });
    }
  } catch (error) {
    logger.error('Failed to send test email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

// Get email statistics
router.get('/email/stats', async (req, res) => {
  try {
    const { data: emailStats, error } = await supabase
      .from('email_notifications')
      .select('notification_type, status, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const stats = {
      total_sent: emailStats?.length || 0,
      by_type: {},
      by_status: {},
      recent_24h: 0
    };

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    emailStats?.forEach(email => {
      // Count by type
      stats.by_type[email.notification_type] = (stats.by_type[email.notification_type] || 0) + 1;
      
      // Count by status
      stats.by_status[email.status] = (stats.by_status[email.status] || 0) + 1;
      
      // Count recent
      if (new Date(email.created_at) > last24h) {
        stats.recent_24h++;
      }
    });

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get email stats:', error);
    res.status(500).json({ error: 'Failed to retrieve email statistics' });
  }
});

// Email Templates Management

// Get all email templates
router.get('/templates', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name');

    if (error) throw error;

    logger.info('Email templates retrieved', { count: data?.length });
    res.json(data || []);
  } catch (error) {
    logger.error('Failed to get email templates:', error);
    res.status(500).json({ error: 'Failed to retrieve email templates' });
  }
});

// Get specific email template
router.get('/templates/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', key)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    logger.error(`Failed to get email template ${req.params.key}:`, error);
    res.status(500).json({ error: 'Failed to retrieve template' });
  }
});

// Update email template
router.put('/templates/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const updates = req.body;
    
    // Add updated timestamp
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('template_key', key)
      .select()
      .single();

    if (error) throw error;

    logger.info('Email template updated', { template_key: key, updates: Object.keys(updates) });
    res.json(data);
  } catch (error) {
    logger.error(`Failed to update email template ${req.params.key}:`, error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Test email template
router.post('/templates/:key/test', async (req, res) => {
  try {
    const { key } = req.params;
    const { testData } = req.body;
    
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', key)
      .eq('is_active', true)
      .single();

    if (templateError) throw templateError;

    // Replace template variables with test data
    let subject = template.subject_template;
    let htmlContent = template.html_template;
    
    Object.entries(testData).forEach(([variable, value]) => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      subject = subject.replace(regex, value);
      htmlContent = htmlContent.replace(regex, value);
    });

    // Get admin email setting
    const { data: adminEmail } = await supabase
      .rpc('get_email_setting', { p_setting_key: 'primary_email' });

    // Send test email via Edge Function
    const emailResponse = await fetch(`${process.env.SUPABASE_URL}/functions/v1/quick-worker`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: adminEmail || 'management@bookmyreservation.org',
        subject: `[TEST] ${subject}`,
        html: htmlContent,
        type: 'template_test'
      })
    });

    const emailResult = await emailResponse.json();

    logger.info('Test email sent', { template_key: key, success: emailResult.success });
    res.json({ 
      success: true, 
      message: 'Test email sent successfully',
      template_key: key,
      email_result: emailResult
    });
  } catch (error) {
    logger.error(`Failed to send test email for template ${req.params.key}:`, error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

module.exports = router;