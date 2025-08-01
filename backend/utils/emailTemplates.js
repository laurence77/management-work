const { createClient } = require('@supabase/supabase-js');
const { logger } = require('./logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Render an email template with provided data
 * @param {string} templateKey - The template key (e.g., 'high_value_alert')
 * @param {object} data - The data to replace template variables
 * @returns {Promise<{subject: string, html: string, text: string}>}
 */
async function renderEmailTemplate(templateKey, data) {
  try {
    // Get template from database
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (error) {
      logger.error('Failed to get email template:', error);
      throw new Error(`Template not found: ${templateKey}`);
    }

    // Replace template variables
    let subject = template.subject_template;
    let html = template.html_template;
    let text = template.text_template || '';

    // Replace all variables in the format {{variable}}
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      html = html.replace(regex, value);
      text = text.replace(regex, value);
    });

    // Add default dashboard URL if not provided
    if (!data.dashboard_url) {
      const dashboardUrl = process.env.NODE_ENV === 'production' 
        ? 'https://admin.yourdomain.com'
        : 'http://localhost:5173';
      
      subject = subject.replace(/{{dashboard_url}}/g, dashboardUrl);
      html = html.replace(/{{dashboard_url}}/g, dashboardUrl);
      text = text.replace(/{{dashboard_url}}/g, dashboardUrl);
    }

    logger.info('Email template rendered', { 
      template_key: templateKey, 
      variables: Object.keys(data) 
    });

    return {
      subject,
      html,
      text,
      template_name: template.template_name
    };
  } catch (error) {
    logger.error('Failed to render email template:', error);
    throw error;
  }
}

/**
 * Send email using template
 * @param {string} templateKey - The template key
 * @param {object} data - Template data
 * @param {string} notificationType - Type for logging
 * @returns {Promise<object>}
 */
async function sendTemplatedEmail(templateKey, data, notificationType = 'general') {
  try {
    // Render template
    const rendered = await renderEmailTemplate(templateKey, data);
    
    // Get email settings
    const { data: targetEmail } = await supabase
      .rpc('get_email_setting', { p_setting_key: 'primary_email' });

    // Send via Edge Function
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/quick-worker`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: targetEmail || 'management@bookmyreservation.org',
        subject: rendered.subject,
        html: rendered.html,
        type: notificationType
      })
    });

    const result = await response.json();

    // Log email notification
    await supabase
      .from('email_notifications')
      .insert({
        to_email: targetEmail || 'management@bookmyreservation.org',
        subject: rendered.subject,
        body: rendered.html,
        notification_type: notificationType,
        status: result.success ? 'sent' : 'failed',
        created_at: new Date().toISOString(),
        metadata: {
          template_key: templateKey,
          template_name: rendered.template_name,
          edge_function_result: result
        }
      });

    logger.info('Templated email sent', { 
      template_key: templateKey,
      notification_type: notificationType,
      success: result.success 
    });

    return result;
  } catch (error) {
    logger.error('Failed to send templated email:', error);
    throw error;
  }
}

/**
 * Get available template variables for a template
 * @param {string} templateKey - The template key
 * @returns {Promise<string[]>}
 */
async function getTemplateVariables(templateKey) {
  try {
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('variables')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    return template.variables || [];
  } catch (error) {
    logger.error('Failed to get template variables:', error);
    return [];
  }
}

module.exports = {
  renderEmailTemplate,
  sendTemplatedEmail,
  getTemplateVariables
};