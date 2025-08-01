-- n8n Automation Integration Tables
-- This migration adds tables to support n8n workflow automation

-- Automation execution logs
CREATE TABLE IF NOT EXISTS automation_logs (
    id BIGSERIAL PRIMARY KEY,
    workflow_id VARCHAR(255) NOT NULL,
    workflow_name VARCHAR(255),
    trigger_event VARCHAR(100) NOT NULL,
    input_data JSONB,
    result JSONB,
    actions_taken JSONB,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    execution_time_ms INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation rules and triggers
CREATE TABLE IF NOT EXISTS automation_rules (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100) NOT NULL, -- 'webhook', 'schedule', 'event'
    trigger_config JSONB NOT NULL,
    conditions JSONB, -- Rules for when automation should run
    actions JSONB NOT NULL, -- What actions to take
    n8n_workflow_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User automation preferences
CREATE TABLE IF NOT EXISTS user_automation_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    auto_approve_bookings BOOLEAN DEFAULT false,
    auto_approve_limit DECIMAL(10,2) DEFAULT 5000.00,
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
    smart_recommendations BOOLEAN DEFAULT true,
    marketing_automation BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Workflow performance metrics
CREATE TABLE IF NOT EXISTS automation_metrics (
    id BIGSERIAL PRIMARY KEY,
    workflow_id VARCHAR(255) NOT NULL,
    metric_type VARCHAR(100) NOT NULL, -- 'execution_time', 'success_rate', 'error_count'
    metric_value DECIMAL(10,4) NOT NULL,
    time_period VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'weekly'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smart recommendations cache
CREATE TABLE IF NOT EXISTS recommendation_cache (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    recommendation_type VARCHAR(100) NOT NULL, -- 'celebrity', 'service', 'pricing'
    context_data JSONB,
    recommendations JSONB NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    generated_by VARCHAR(100) DEFAULT 'n8n_workflow',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation event queue
CREATE TABLE IF NOT EXISTS automation_queue (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    webhook_url TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_workflow_id ON automation_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed_at ON automation_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_success ON automation_logs(success);

CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_type ON automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_automation_queue_status ON automation_queue(status);
CREATE INDEX IF NOT EXISTS idx_automation_queue_scheduled ON automation_queue(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_type ON recommendation_cache(user_id, recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires ON recommendation_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_automation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_logs (admin and service access)
CREATE POLICY "automation_logs_admin_access" ON automation_logs
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- RLS Policies for automation_rules (admin only)
CREATE POLICY "automation_rules_admin_access" ON automation_rules
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for user preferences (users can access their own)
CREATE POLICY "user_automation_preferences_owner" ON user_automation_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_automation_preferences_admin" ON user_automation_preferences
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for recommendations (users can access their own)
CREATE POLICY "recommendation_cache_owner" ON recommendation_cache
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "recommendation_cache_admin" ON recommendation_cache
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for automation queue (service access)
CREATE POLICY "automation_queue_service_access" ON automation_queue
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Insert default automation rules
INSERT INTO automation_rules (name, description, trigger_type, trigger_config, conditions, actions, priority) VALUES
('Smart Booking Approval', 'Auto-approve low-risk bookings under $10,000', 'webhook', 
 '{"endpoint": "/api/webhooks/n8n/booking-created", "method": "POST"}',
 '{"budget": {"max": 10000}, "user_type": "verified", "fraud_score": {"max": 0.3}}',
 '{"approve": true, "notify_admin": false, "send_confirmation": true}', 1),

('High-Value Booking Alert', 'Alert managers for bookings over $50,000', 'webhook',
 '{"endpoint": "/api/webhooks/n8n/booking-created", "method": "POST"}',
 '{"budget": {"min": 50000}}',
 '{"notify_managers": true, "priority": "high", "require_approval": true}', 1),

('Celebrity Performance Monitor', 'Monitor celebrity booking performance daily', 'schedule',
 '{"cron": "0 9 * * *", "timezone": "America/New_York"}',
 '{"active_celebrities": true}',
 '{"generate_report": true, "check_performance": true, "update_recommendations": true}', 2);

-- Insert default user automation preferences
INSERT INTO user_automation_preferences (user_id, auto_approve_bookings, auto_approve_limit) 
SELECT id, false, 5000.00 FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_automation_preferences);

COMMENT ON TABLE automation_logs IS 'Logs of all n8n automation workflow executions';
COMMENT ON TABLE automation_rules IS 'Configuration for automation triggers and actions';
COMMENT ON TABLE user_automation_preferences IS 'User preferences for automation features';
COMMENT ON TABLE automation_metrics IS 'Performance metrics for automation workflows';
COMMENT ON TABLE recommendation_cache IS 'Cached AI recommendations for users';
COMMENT ON TABLE automation_queue IS 'Queue for processing automation events';