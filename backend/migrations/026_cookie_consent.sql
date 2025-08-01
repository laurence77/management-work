-- Cookie Consent Management

-- Cookie Consents
CREATE TABLE IF NOT EXISTS cookie_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    essential BOOLEAN DEFAULT true,
    analytics BOOLEAN DEFAULT false,
    marketing BOOLEAN DEFAULT false,
    personalization BOOLEAN DEFAULT false,
    consent_version VARCHAR(10) DEFAULT '1.0',
    consent_method VARCHAR(50) DEFAULT 'banner',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cookie Usage Logs
CREATE TABLE IF NOT EXISTS cookie_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cookie_name VARCHAR(255) NOT NULL,
    cookie_type VARCHAR(50) NOT NULL,
    purpose TEXT,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cookie Definitions
CREATE TABLE IF NOT EXISTS cookie_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    purpose TEXT NOT NULL,
    duration VARCHAR(100),
    provider VARCHAR(255),
    is_essential BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cookie_consents_user_id ON cookie_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_created_at ON cookie_consents(created_at);
CREATE INDEX IF NOT EXISTS idx_cookie_usage_logs_user_id ON cookie_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cookie_usage_logs_cookie_name ON cookie_usage_logs(cookie_name);
CREATE INDEX IF NOT EXISTS idx_cookie_usage_logs_used_at ON cookie_usage_logs(used_at);
CREATE INDEX IF NOT EXISTS idx_cookie_definitions_category ON cookie_definitions(category);
CREATE INDEX IF NOT EXISTS idx_cookie_definitions_name ON cookie_definitions(name);

-- RLS Policies
ALTER TABLE cookie_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_definitions ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own consents
CREATE POLICY "Users can manage their own cookie consents" ON cookie_consents
    FOR ALL USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access to cookie_consents" ON cookie_consents
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to cookie_usage_logs" ON cookie_usage_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to cookie_definitions" ON cookie_definitions
    FOR ALL USING (auth.role() = 'service_role');

-- Public read access to cookie definitions
CREATE POLICY "Public read access to cookie definitions" ON cookie_definitions
    FOR SELECT USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_cookie_consent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cookie_consents_timestamp
    BEFORE UPDATE ON cookie_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_cookie_consent_timestamp();

-- Insert default cookie definitions
INSERT INTO cookie_definitions (name, category, purpose, duration, provider, is_essential, description) VALUES
('session_token', 'essential', 'User authentication', 'Session', 'Platform', true, 'Keeps you logged in securely'),
('csrf_token', 'essential', 'Security protection', 'Session', 'Platform', true, 'Protects against cross-site request forgery'),
('load_balancer', 'essential', 'Load balancing', '1 hour', 'Platform', true, 'Ensures optimal server distribution'),
('_ga', 'analytics', 'Google Analytics', '2 years', 'Google', false, 'Distinguishes unique users'),
('_gid', 'analytics', 'Google Analytics', '24 hours', 'Google', false, 'Distinguishes unique users'),
('_gat', 'analytics', 'Google Analytics', '1 minute', 'Google', false, 'Used to throttle request rate'),
('fbp', 'marketing', 'Facebook Pixel', '3 months', 'Facebook', false, 'Tracks conversions and retargeting'),
('_gcl_au', 'marketing', 'Google AdSense', '3 months', 'Google', false, 'Used for ad targeting'),
('user_preferences', 'personalization', 'User preferences', '1 year', 'Platform', false, 'Remembers your settings'),
('theme_preference', 'personalization', 'Theme selection', '1 year', 'Platform', false, 'Remembers light/dark mode choice'),
('language_preference', 'personalization', 'Language setting', '1 year', 'Platform', false, 'Remembers your language choice')
ON CONFLICT (name) DO NOTHING;
