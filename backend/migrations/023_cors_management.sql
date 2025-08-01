-- CORS Domain Management

-- Domain Whitelist
CREATE TABLE IF NOT EXISTS cors_domain_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    environment VARCHAR(50) NOT NULL DEFAULT 'development',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    last_verified TIMESTAMP WITH TIME ZONE
);

-- CORS Request Logs
CREATE TABLE IF NOT EXISTS cors_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin VARCHAR(255) NOT NULL,
    allowed BOOLEAN NOT NULL,
    reason VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CORS Security Events
CREATE TABLE IF NOT EXISTS cors_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    origin VARCHAR(255),
    severity VARCHAR(50) DEFAULT 'medium',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cors_domain_whitelist_domain ON cors_domain_whitelist(domain);
CREATE INDEX IF NOT EXISTS idx_cors_domain_whitelist_environment ON cors_domain_whitelist(environment);
CREATE INDEX IF NOT EXISTS idx_cors_domain_whitelist_active ON cors_domain_whitelist(is_active);

CREATE INDEX IF NOT EXISTS idx_cors_request_logs_origin ON cors_request_logs(origin);
CREATE INDEX IF NOT EXISTS idx_cors_request_logs_created_at ON cors_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cors_request_logs_allowed ON cors_request_logs(allowed);

CREATE INDEX IF NOT EXISTS idx_cors_security_events_type ON cors_security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_cors_security_events_created_at ON cors_security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_cors_security_events_resolved ON cors_security_events(resolved);

-- RLS Policies
ALTER TABLE cors_domain_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE cors_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cors_security_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role full access to cors_domain_whitelist" ON cors_domain_whitelist
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to cors_request_logs" ON cors_request_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to cors_security_events" ON cors_security_events
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for CORS management
CREATE OR REPLACE FUNCTION cleanup_old_cors_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cors_request_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Archive old security events
    UPDATE cors_security_events 
    SET resolved = true
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND resolved = false;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get CORS statistics
CREATE OR REPLACE FUNCTION get_cors_statistics(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    total_requests BIGINT,
    allowed_requests BIGINT,
    blocked_requests BIGINT,
    unique_origins BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE allowed = true) as allowed_requests,
        COUNT(*) FILTER (WHERE allowed = false) as blocked_requests,
        COUNT(DISTINCT origin) as unique_origins,
        ROUND(
            (COUNT(*) FILTER (WHERE allowed = true)::NUMERIC / COUNT(*) * 100), 
            2
        ) as success_rate
    FROM cors_request_logs
    WHERE created_at >= NOW() - (hours_back || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Insert default production domains
INSERT INTO cors_domain_whitelist (domain, environment, metadata) VALUES
('bookmyreservation.org', 'production', '{"type": "main_domain", "verified": true}'),
('www.bookmyreservation.org', 'production', '{"type": "www_subdomain", "verified": true}'),
('admin.bookmyreservation.org', 'production', '{"type": "admin_subdomain", "verified": true}'),
('api.bookmyreservation.org', 'production', '{"type": "api_subdomain", "verified": true}')
ON CONFLICT (domain) DO NOTHING;

-- Insert staging domains
INSERT INTO cors_domain_whitelist (domain, environment, metadata) VALUES
('staging.bookmyreservation.org', 'staging', '{"type": "staging_domain", "verified": true}'),
('admin-staging.bookmyreservation.org', 'staging', '{"type": "staging_admin", "verified": true}'),
('api-staging.bookmyreservation.org', 'staging', '{"type": "staging_api", "verified": true}')
ON CONFLICT (domain) DO NOTHING;

-- Insert development domains
INSERT INTO cors_domain_whitelist (domain, environment, metadata) VALUES
('localhost:3000', 'development', '{"type": "dev_frontend", "verified": true}'),
('localhost:3001', 'development', '{"type": "dev_admin", "verified": true}'),
('localhost:8080', 'development', '{"type": "dev_main", "verified": true}'),
('127.0.0.1:3000', 'development', '{"type": "dev_frontend_ip", "verified": true}')
ON CONFLICT (domain) DO NOTHING;
