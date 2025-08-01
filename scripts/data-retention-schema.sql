-- Data Retention and Cleanup Tables

-- Data retention logs
CREATE TABLE IF NOT EXISTS data_retention_logs (
    id SERIAL PRIMARY KEY,
    cleanup_type VARCHAR(50), -- 'daily', 'weekly', 'monthly_archive'
    summary JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User data requests (GDPR compliance)
CREATE TABLE IF NOT EXISTS user_data_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    request_type VARCHAR(20) CHECK (request_type IN ('deletion', 'export', 'correction')),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Temporary uploads tracking
CREATE TABLE IF NOT EXISTS temp_uploads (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    file_name VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    upload_purpose VARCHAR(100),
    is_permanent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Failed payment attempts (for cleanup)
CREATE TABLE IF NOT EXISTS failed_payment_attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    payment_method VARCHAR(50),
    amount DECIMAL(10,2),
    failure_reason TEXT,
    error_code VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notification logs (for cleanup)
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    notification_type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    delivery_method VARCHAR(20), -- 'email', 'sms', 'push', 'in_app'
    delivery_status VARCHAR(20), -- 'sent', 'delivered', 'failed', 'bounced'
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_retention_logs_type_date ON data_retention_logs(cleanup_type, created_at);
CREATE INDEX IF NOT EXISTS idx_user_data_requests_user_status ON user_data_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_temp_uploads_created_permanent ON temp_uploads(created_at, is_permanent);
CREATE INDEX IF NOT EXISTS idx_failed_payments_date ON failed_payment_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_date ON notification_logs(user_id, created_at);

-- Create function for cleanup queries
CREATE OR REPLACE FUNCTION execute_cleanup_query(query TEXT)
RETURNS TABLE(affected_rows INTEGER) AS $$
BEGIN
    EXECUTE query;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function to get table statistics
CREATE OR REPLACE FUNCTION get_table_statistics()
RETURNS TABLE(
    table_name TEXT,
    table_size TEXT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        n_tup_ins + n_tup_upd + n_tup_del as row_count
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-mark temp uploads for cleanup
CREATE OR REPLACE FUNCTION mark_old_temp_uploads()
RETURNS trigger AS $$
BEGIN
    -- Mark temp uploads older than 24 hours for cleanup
    UPDATE temp_uploads 
    SET is_permanent = false 
    WHERE created_at < NOW() - INTERVAL '24 hours' 
    AND is_permanent = true
    AND upload_purpose = 'temporary';
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_old_temp_uploads
    AFTER INSERT ON temp_uploads
    EXECUTE FUNCTION mark_old_temp_uploads();

-- Add data retention policies to system settings
INSERT INTO system_settings (key, value, description, category) VALUES
('data_retention_enabled', 'true', 'Enable automated data retention and cleanup', 'data_retention'),
('cleanup_batch_size', '1000', 'Number of records to process in each cleanup batch', 'data_retention'),
('archive_storage_enabled', 'false', 'Enable archiving to external storage before deletion', 'data_retention'),
('user_data_request_auto_approve', 'false', 'Automatically approve user data deletion requests', 'data_retention')
ON CONFLICT (key) DO NOTHING;
