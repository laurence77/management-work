const { supabase, supabaseAdmin } = require('../config/supabase');
const nodemailer = require('nodemailer');

class EmailTemplateService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
        
        // Default templates (fallback if database is unavailable)
        this.defaultTemplates = {
            booking_confirmation: {
                subject: 'Booking Confirmation - {{celebrity_name}}',
                html_content: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Booking Confirmation</h2>
                        <p>Dear {{client_name}},</p>
                        <p>We're excited to confirm your booking request for <strong>{{celebrity_name}}</strong>.</p>
                        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
                            <h3>Booking Details:</h3>
                            <p><strong>Celebrity:</strong> {{celebrity_name}}</p>
                            <p><strong>Event Date:</strong> {{event_date}}</p>
                            <p><strong>Event Type:</strong> {{event_type}}</p>
                            <p><strong>Budget:</strong> {{budget}}</p>
                            <p><strong>Status:</strong> {{status}}</p>
                        </div>
                        <p>Our team will be in touch within 24 hours to discuss the next steps.</p>
                        <p>Best regards,<br>The EliteConnect Team</p>
                    </div>
                `,
                text_content: 'Dear {{client_name}}, We have confirmed your booking for {{celebrity_name}} on {{event_date}}.'
            },
            booking_approved: {
                subject: '✅ Booking Approved - {{celebrity_name}}',
                html_content: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #28a745;">🎉 Booking Approved!</h2>
                        <p>Dear {{client_name}},</p>
                        <p>Great news! Your booking request for <strong>{{celebrity_name}}</strong> has been approved.</p>
                        <div style="background: #d4edda; padding: 20px; margin: 20px 0; border-radius: 5px;">
                            <h3>Confirmed Details:</h3>
                            <p><strong>Celebrity:</strong> {{celebrity_name}}</p>
                            <p><strong>Event Date:</strong> {{event_date}}</p>
                            <p><strong>Budget:</strong> {{budget}}</p>
                        </div>
                        <p>Our team will contact you within 48 hours with next steps.</p>
                        <p>Best regards,<br>The EliteConnect Team</p>
                    </div>
                `,
                text_content: 'Great news! Your booking for {{celebrity_name}} has been approved.'
            },
            booking_cancelled: {
                subject: 'Booking Cancellation - {{celebrity_name}}',
                html_content: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc3545;">Booking Cancellation</h2>
                        <p>Dear {{client_name}},</p>
                        <p>We regret to inform you that your booking for <strong>{{celebrity_name}}</strong> has been cancelled.</p>
                        <p><strong>Reason:</strong> {{cancellation_reason}}</p>
                        <p>Please contact us for alternative options.</p>
                        <p>Best regards,<br>The EliteConnect Team</p>
                    </div>
                `,
                text_content: 'Your booking for {{celebrity_name}} has been cancelled. Reason: {{cancellation_reason}}'
            }
        };
    }

    async initTransporter() {
        try {
            if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.log('📧 Email not configured. Using simulation mode.');
                return;
            }

            this.transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: parseInt(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            await this.transporter.verify();
            console.log('📧 Email transporter configured successfully');
        } catch (error) {
            console.log('📧 Email config failed, using simulation:', error.message);
            this.transporter = null;
        }
    }

    async getTemplate(templateKey) {
        try {
            // Try database first
            const { data, error } = await supabase
                .from('email_templates')
                .select('*')
                .eq('template_key', templateKey)
                .eq('is_active', true)
                .single();

            if (!error && data) {
                return data;
            }
        } catch (error) {
            console.log('Database template fetch failed, using default');
        }

        // Fallback to default templates
        return this.defaultTemplates[templateKey] || null;
    }

    replaceVariables(content, variables) {
        let result = content;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value || '');
        }
        return result;
    }

    async sendEmail(templateKey, to, variables = {}) {
        try {
            const template = await this.getTemplate(templateKey);
            if (!template) {
                throw new Error(`Template '${templateKey}' not found`);
            }

            const subject = this.replaceVariables(template.subject, variables);
            const html = this.replaceVariables(template.html_content, variables);
            const text = this.replaceVariables(template.text_content, variables);

            const mailOptions = {
                from: process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@eliteconnect.com',
                to: to,
                subject: subject,
                html: html,
                text: text
            };

            if (this.transporter) {
                const result = await this.transporter.sendMail(mailOptions);
                console.log(`📧 Email sent successfully to ${to}: ${subject}`);
                return {
                    success: true,
                    messageId: result.messageId
                };
            } else {
                // Simulation mode
                console.log(`📧 EMAIL SIMULATION - To: ${to}, Subject: ${subject}`);
                return {
                    success: true,
                    messageId: 'simulated-' + Date.now(),
                    simulated: true
                };
            }
        } catch (error) {
            console.error('Email sending failed:', error);
            throw error;
        }
    }

    // Pre-built functions for common scenarios
    async sendBookingConfirmation(booking) {
        return this.sendEmail('booking_confirmation', booking.client_email, {
            client_name: booking.client_name,
            celebrity_name: booking.celebrity_name,
            event_date: booking.event_date,
            event_type: booking.event_type,
            budget: booking.budget,
            status: booking.status
        });
    }

    async sendBookingApproval(booking) {
        return this.sendEmail('booking_approved', booking.client_email, {
            client_name: booking.client_name,
            celebrity_name: booking.celebrity_name,
            event_date: booking.event_date,
            budget: booking.budget
        });
    }

    async sendBookingCancellation(booking) {
        return this.sendEmail('booking_cancelled', booking.client_email, {
            client_name: booking.client_name,
            celebrity_name: booking.celebrity_name,
            event_date: booking.event_date,
            cancellation_reason: booking.cancellation_reason || 'Not specified'
        });
    }

    // Add email to queue
    async addToQueue(templateId, recipientEmail, templateData, priority = 5) {
        const { data, error } = await this.supabase
            .from('email_queue')
            .insert({
                template_id: templateId,
                recipient_email: recipientEmail,
                template_data: templateData,
                priority: priority
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Update queue status
    async updateQueueStatus(queueId, status, errorMessage = null) {
        const updates = {
            status: status,
            last_attempt_at: new Date().toISOString()
        };

        if (errorMessage) {
            updates.error_message = errorMessage;
        }

        const { error } = await this.supabase
            .from('email_queue')
            .update(updates)
            .eq('id', queueId);

        if (error) throw error;
    }

    // Log email delivery
    async logDelivery(templateId, recipientEmail, logData) {
        const { error } = await this.supabase
            .from('email_delivery_logs')
            .insert({
                template_id: templateId,
                recipient_email: recipientEmail,
                ...logData
            });

        if (error) throw error;
    }

    // Process email queue
    async processQueue(batchSize = 10) {
        const { data: queueItems, error } = await this.supabase
            .from('email_queue')
            .select('*, email_templates(*)')
            .eq('status', 'pending')
            .lt('attempts', 'max_attempts')
            .lte('scheduled_at', new Date().toISOString())
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(batchSize);

        if (error) throw error;

        for (const item of queueItems) {
            try {
                await this.processQueueItem(item);
            } catch (error) {
                console.error(`Failed to process queue item ${item.id}:`, error);
            }
        }

        return queueItems.length;
    }

    // Process individual queue item
    async processQueueItem(queueItem) {
        try {
            // Increment attempts
            await this.supabase
                .from('email_queue')
                .update({
                    attempts: queueItem.attempts + 1,
                    last_attempt_at: new Date().toISOString()
                })
                .eq('id', queueItem.id);

            // Send email
            await this.sendTemplatedEmail(
                queueItem.email_templates.name,
                queueItem.recipient_email,
                queueItem.template_data
            );

        } catch (error) {
            // Update queue with error
            await this.updateQueueStatus(queueItem.id, 'failed', error.message);
            throw error;
        }
    }

    // Get email metrics
    async getMetrics(startDate, endDate, templateType = null) {
        let query = this.supabase
            .from('email_metrics')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        if (templateType) {
            query = query.eq('template_type', templateType);
        }

        const { data, error } = await query.order('date', { ascending: true });
        if (error) throw error;

        return data;
    }

    // Get delivery stats
    async getDeliveryStats(days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await this.supabase
            .from('email_delivery_logs')
            .select('status, created_at')
            .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const stats = {
            total: data.length,
            sent: data.filter(d => d.status === 'sent').length,
            delivered: data.filter(d => d.status === 'delivered').length,
            failed: data.filter(d => d.status === 'failed').length,
            pending: data.filter(d => d.status === 'pending').length
        };

        stats.deliveryRate = stats.total > 0 ? (stats.delivered / stats.total * 100).toFixed(2) : 0;
        stats.failureRate = stats.total > 0 ? (stats.failed / stats.total * 100).toFixed(2) : 0;

        return stats;
    }
}

module.exports = new EmailTemplateService();
