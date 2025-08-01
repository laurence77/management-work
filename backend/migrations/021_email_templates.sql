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
