#!/bin/bash

# Production Email Templates and Delivery Monitoring Setup
# This script configures comprehensive email template management and monitoring in Supabase

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Production Email Templates and Delivery Monitoring...${NC}"

# Create email templates directory structure
create_email_templates_structure() {
    echo -e "${YELLOW}📁 Creating email templates directory structure...${NC}"
    
    mkdir -p email-templates/{welcome,booking,payment,notification,admin}
    mkdir -p email-templates/assets/{images,css}
    mkdir -p email-monitoring/{logs,reports,analytics}
    
    echo -e "${GREEN}✅ Directory structure created${NC}"
}

# Create Supabase database schema for email templates
create_email_schema() {
    echo -e "${YELLOW}🗄️ Creating email templates database schema...${NC}"
    
    cat > backend/migrations/021_email_templates.sql << 'EOF'
-- Email Templates Management
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    template_type VARCHAR(100) NOT NULL,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Email Delivery Logs
CREATE TABLE IF NOT EXISTS email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES email_templates(id),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    provider VARCHAR(100),
    provider_message_id VARCHAR(255),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Metrics
CREATE TABLE IF NOT EXISTS email_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    template_type VARCHAR(100),
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_complained INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, template_type)
);

-- Email Queue for reliability
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES email_templates(id),
    recipient_email VARCHAR(255) NOT NULL,
    template_data JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 5,
    max_attempts INTEGER DEFAULT 3,
    attempts INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_recipient ON email_delivery_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_status ON email_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_created_at ON email_delivery_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_metrics_date ON email_metrics(date);

-- RLS Policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read templates
CREATE POLICY "Allow authenticated users to read email templates" ON email_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to manage everything
CREATE POLICY "Allow service role full access to email tables" ON email_templates
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to delivery logs" ON email_delivery_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to metrics" ON email_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to queue" ON email_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for email metrics
CREATE OR REPLACE FUNCTION update_email_metrics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO email_metrics (date, template_type, emails_sent, emails_delivered, emails_opened, emails_clicked)
    VALUES (
        CURRENT_DATE,
        (SELECT template_type FROM email_templates WHERE id = NEW.template_id),
        CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
        CASE WHEN NEW.opened_at IS NOT NULL THEN 1 ELSE 0 END,
        CASE WHEN NEW.clicked_at IS NOT NULL THEN 1 ELSE 0 END
    )
    ON CONFLICT (date, template_type)
    DO UPDATE SET
        emails_sent = email_metrics.emails_sent + CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
        emails_delivered = email_metrics.emails_delivered + CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
        emails_opened = email_metrics.emails_opened + CASE WHEN NEW.opened_at IS NOT NULL THEN 1 ELSE 0 END,
        emails_clicked = email_metrics.emails_clicked + CASE WHEN NEW.clicked_at IS NOT NULL THEN 1 ELSE 0 END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic metrics updates
CREATE TRIGGER update_email_metrics_trigger
    AFTER INSERT OR UPDATE ON email_delivery_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_email_metrics();
EOF

    echo -e "${GREEN}✅ Email schema created${NC}"
}

# Create email template service
create_email_service() {
    echo -e "${YELLOW}📧 Creating email template service...${NC}"
    
    mkdir -p backend/services
    
    cat > backend/services/EmailTemplateService.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');

class EmailTemplateService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Get email template by name
    async getTemplate(templateName) {
        const { data, error } = await this.supabase
            .from('email_templates')
            .select('*')
            .eq('name', templateName)
            .eq('is_active', true)
            .single();

        if (error) throw new Error(`Template not found: ${templateName}`);
        return data;
    }

    // Render template with data
    renderTemplate(template, data) {
        const htmlTemplate = handlebars.compile(template.html_content);
        const textTemplate = handlebars.compile(template.text_content || '');
        
        return {
            html: htmlTemplate(data),
            text: textTemplate(data),
            subject: handlebars.compile(template.subject)(data)
        };
    }

    // Send email using template
    async sendTemplatedEmail(templateName, recipientEmail, templateData = {}) {
        try {
            // Get template
            const template = await this.getTemplate(templateName);
            
            // Render content
            const rendered = this.renderTemplate(template, templateData);
            
            // Add to queue first
            const queueEntry = await this.addToQueue(template.id, recipientEmail, templateData);
            
            // Send email
            const result = await this.transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to: recipientEmail,
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text,
                headers: {
                    'X-Template-Name': templateName,
                    'X-Queue-ID': queueEntry.id
                }
            });

            // Log delivery
            await this.logDelivery(template.id, recipientEmail, {
                status: 'sent',
                provider: 'smtp',
                provider_message_id: result.messageId,
                subject: rendered.subject,
                sent_at: new Date().toISOString()
            });

            // Update queue status
            await this.updateQueueStatus(queueEntry.id, 'sent');

            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Email sending failed:', error);
            
            // Log failure
            await this.logDelivery(template.id, recipientEmail, {
                status: 'failed',
                error_message: error.message,
                subject: rendered?.subject || 'Unknown'
            });

            throw error;
        }
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

module.exports = EmailTemplateService;
EOF

    echo -e "${GREEN}✅ Email service created${NC}"
}

# Create default email templates
create_default_templates() {
    echo -e "${YELLOW}📄 Creating default email templates...${NC}"
    
    # Welcome email template
    cat > email-templates/welcome/welcome.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Celebrity Booking Platform</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome {{firstName}}!</h1>
        </div>
        <div class="content">
            <h2>Thank you for joining Celebrity Booking Platform</h2>
            <p>Hi {{firstName}},</p>
            <p>We're excited to have you on board! Your account has been successfully created and you can now start exploring our amazing celebrity booking services.</p>
            
            <p>Here's what you can do next:</p>
            <ul>
                <li>Browse our celebrity directory</li>
                <li>Submit booking requests</li>
                <li>Manage your profile and preferences</li>
                <li>Track your booking status</li>
            </ul>
            
            <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <p>Best regards,<br>The Celebrity Booking Platform Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Celebrity Booking Platform. All rights reserved.</p>
            <p><a href="{{unsubscribeUrl}}">Unsubscribe</a> | <a href="{{supportUrl}}">Support</a></p>
        </div>
    </div>
</body>
</html>
EOF

    # Booking confirmation template
    cat > email-templates/booking/confirmation.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .booking-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #059669; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .button { background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Confirmed!</h1>
        </div>
        <div class="content">
            <h2>Your booking has been confirmed</h2>
            <p>Hi {{clientName}},</p>
            <p>Great news! Your booking request has been confirmed. Here are the details:</p>
            
            <div class="booking-details">
                <h3>Booking Details</h3>
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Celebrity:</strong> {{celebrityName}}</p>
                <p><strong>Event Date:</strong> {{eventDate}}</p>
                <p><strong>Event Time:</strong> {{eventTime}}</p>
                <p><strong>Location:</strong> {{eventLocation}}</p>
                <p><strong>Duration:</strong> {{duration}}</p>
                <p><strong>Total Amount:</strong> ${{totalAmount}}</p>
                <p><strong>Status:</strong> {{status}}</p>
            </div>
            
            <p>Next steps:</p>
            <ul>
                <li>Review the contract details in your dashboard</li>
                <li>Complete the payment process</li>
                <li>Coordinate event logistics with our team</li>
            </ul>
            
            <a href="{{bookingUrl}}" class="button">View Booking Details</a>
            
            <p>Our team will be in touch shortly to coordinate the final details.</p>
            
            <p>Best regards,<br>The Celebrity Booking Platform Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Celebrity Booking Platform. All rights reserved.</p>
            <p><a href="{{supportUrl}}">Contact Support</a></p>
        </div>
    </div>
</body>
</html>
EOF

    # Payment receipt template
    cat > email-templates/payment/receipt.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .receipt-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .amount { font-size: 24px; font-weight: bold; color: #059669; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f3f4f6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Receipt</h1>
        </div>
        <div class="content">
            <h2>Payment Successful</h2>
            <p>Hi {{clientName}},</p>
            <p>Thank you for your payment. Your transaction has been processed successfully.</p>
            
            <div class="receipt-details">
                <h3>Payment Details</h3>
                <p><strong>Transaction ID:</strong> {{transactionId}}</p>
                <p><strong>Date:</strong> {{paymentDate}}</p>
                <p><strong>Amount Paid:</strong> <span class="amount">${{amountPaid}}</span></p>
                <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
                <p><strong>Status:</strong> {{paymentStatus}}</p>
            </div>
            
            <div class="receipt-details">
                <h3>Booking Information</h3>
                <table>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                    <tr>
                        <td>{{celebrityName}} - {{eventDate}}</td>
                        <td>${{bookingAmount}}</td>
                    </tr>
                    {{#if platformFee}}
                    <tr>
                        <td>Platform Fee</td>
                        <td>${{platformFee}}</td>
                    </tr>
                    {{/if}}
                    {{#if taxes}}
                    <tr>
                        <td>Taxes</td>
                        <td>${{taxes}}</td>
                    </tr>
                    {{/if}}
                    <tr style="border-top: 2px solid #333; font-weight: bold;">
                        <td>Total</td>
                        <td>${{totalAmount}}</td>
                    </tr>
                </table>
            </div>
            
            <p>This receipt serves as confirmation of your payment. Please keep it for your records.</p>
            
            <p>Best regards,<br>The Celebrity Booking Platform Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Celebrity Booking Platform. All rights reserved.</p>
            <p><a href="{{supportUrl}}">Contact Support</a></p>
        </div>
    </div>
</body>
</html>
EOF

    echo -e "${GREEN}✅ Default templates created${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting Email Templates and Monitoring Setup...${NC}"
    
    # Check if required packages are installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is required but not installed${NC}"
        exit 1
    fi
    
    # Create all components
    create_email_templates_structure
    create_email_schema
    create_email_service
    create_default_templates
    
    echo -e "${GREEN}✅ Email Templates and Monitoring Setup Complete!${NC}"
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Install packages: npm install nodemailer handlebars node-cron"
    echo "2. Run database migrations"
    echo "3. Seed email templates"
    echo "4. Configure SMTP settings in .env"
    echo "5. Start email worker for queue processing"
}

# Execute main function
main "$@"