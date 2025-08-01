-- Disaster Recovery Management

-- Disaster Recovery Logs
CREATE TABLE IF NOT EXISTS disaster_recovery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    environment VARCHAR(50) DEFAULT 'development',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backup Schedules
CREATE TABLE IF NOT EXISTS backup_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    schedule_cron VARCHAR(100) NOT NULL,
    backup_type VARCHAR(50) DEFAULT 'incremental',
    is_active BOOLEAN DEFAULT true,
    tables_to_backup TEXT[],
    retention_days INTEGER DEFAULT 30,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE
);

-- Recovery Test Results
CREATE TABLE IF NOT EXISTS recovery_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id VARCHAR(255) NOT NULL,
    test_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    rto_achieved_minutes INTEGER,
    rpo_achieved_minutes INTEGER,
    tables_tested TEXT[],
    success_rate NUMERIC(5,2),
    issues_found TEXT[],
    recommendations TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DR Infrastructure Status
CREATE TABLE IF NOT EXISTS dr_infrastructure_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    health_score INTEGER DEFAULT 100,
    last_tested TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disaster_recovery_logs_backup_id ON disaster_recovery_logs(backup_id);
CREATE INDEX IF NOT EXISTS idx_disaster_recovery_logs_event_type ON disaster_recovery_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_disaster_recovery_logs_created_at ON disaster_recovery_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_backup_schedules_active ON backup_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_next_run ON backup_schedules(next_run);

CREATE INDEX IF NOT EXISTS idx_recovery_test_results_test_type ON recovery_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_recovery_test_results_created_at ON recovery_test_results(created_at);

CREATE INDEX IF NOT EXISTS idx_dr_infrastructure_status_component ON dr_infrastructure_status(component);
CREATE INDEX IF NOT EXISTS idx_dr_infrastructure_status_region ON dr_infrastructure_status(region);

-- RLS Policies
ALTER TABLE disaster_recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE dr_infrastructure_status ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role full access to disaster_recovery_logs" ON disaster_recovery_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to backup_schedules" ON backup_schedules
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to recovery_test_results" ON recovery_test_results
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to dr_infrastructure_status" ON dr_infrastructure_status
    FOR ALL USING (auth.role() = 'service_role');

-- Functions
CREATE OR REPLACE FUNCTION cleanup_old_dr_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM disaster_recovery_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM recovery_test_results 
    WHERE created_at < NOW() - INTERVAL '180 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default backup schedules
INSERT INTO backup_schedules (name, schedule_cron, backup_type, tables_to_backup, retention_days, metadata) VALUES
('Daily Critical Backup', '0 2 * * *', 'full', ARRAY['users', 'bookings', 'payments', 'celebrities'], 30, '{"priority": "critical", "description": "Daily backup of critical business data"}'),
('Hourly Incremental', '0 * * * *', 'incremental', ARRAY['bookings', 'payments', 'user_sessions'], 7, '{"priority": "high", "description": "Hourly backup of high-frequency data"}'),
('Weekly Full Backup', '0 1 * * 0', 'full', ARRAY['users', 'celebrities', 'bookings', 'payments', 'contracts', 'user_profiles', 'booking_history'], 90, '{"priority": "standard", "description": "Weekly comprehensive backup"}')
ON CONFLICT DO NOTHING;

-- Insert default infrastructure components
INSERT INTO dr_infrastructure_status (component, region, status, health_score, metadata) VALUES
('Database Primary', 'us-east-1', 'healthy', 100, '{"type": "supabase", "criticality": "critical"}'),
('Database Backup', 'us-west-2', 'healthy', 95, '{"type": "s3", "criticality": "high"}'),
('Application Server', 'us-east-1', 'healthy', 100, '{"type": "compute", "criticality": "critical"}'),
('CDN', 'global', 'healthy', 98, '{"type": "cloudflare", "criticality": "medium"}')
ON CONFLICT DO NOTHING;
