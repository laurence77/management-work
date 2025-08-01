-- GDPR Compliance Tables

-- User Consents
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    marketing_consent BOOLEAN DEFAULT false,
    analytics_consent BOOLEAN DEFAULT false,
    personalization_consent BOOLEAN DEFAULT false,
    third_party_consent BOOLEAN DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consent_method VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- GDPR Requests Log
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    fulfilled_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    notes TEXT
);

-- Data Processing Records
CREATE TABLE IF NOT EXISTS data_processing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processing_activity VARCHAR(255) NOT NULL,
    data_categories TEXT[] NOT NULL,
    legal_basis VARCHAR(100) NOT NULL,
    purposes TEXT[] NOT NULL,
    retention_period VARCHAR(100),
    data_subjects VARCHAR(100),
    recipients TEXT[],
    transfers_to_third_countries BOOLEAN DEFAULT false,
    safeguards_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Privacy Policy Versions
CREATE TABLE IF NOT EXISTS privacy_policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    is_current BOOLEAN DEFAULT false,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Breach Log
CREATE TABLE IF NOT EXISTS data_breach_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(100) NOT NULL UNIQUE,
    severity VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    data_types_affected TEXT[],
    individuals_affected_count INTEGER,
    discovery_date TIMESTAMP WITH TIME ZONE NOT NULL,
    containment_date TIMESTAMP WITH TIME ZONE,
    notification_required BOOLEAN DEFAULT false,
    authority_notified_at TIMESTAMP WITH TIME ZONE,
    individuals_notified_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'investigating',
    remediation_steps TEXT[],
    lessons_learned TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_processing_records_activity ON data_processing_records(processing_activity);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_versions_current ON privacy_policy_versions(is_current);
CREATE INDEX IF NOT EXISTS idx_data_breach_log_severity ON data_breach_log(severity);
CREATE INDEX IF NOT EXISTS idx_data_breach_log_status ON data_breach_log(status);

-- RLS Policies
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_log ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own consents
CREATE POLICY "Users can manage their own consents" ON user_consents
    FOR ALL USING (auth.uid() = user_id);

-- Users can view their own GDPR requests
CREATE POLICY "Users can view their own GDPR requests" ON gdpr_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access to user_consents" ON user_consents
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to gdpr_requests" ON gdpr_requests
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to data_processing_records" ON data_processing_records
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to privacy_policy_versions" ON privacy_policy_versions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to data_breach_log" ON data_breach_log
    FOR ALL USING (auth.role() = 'service_role');

-- Functions
CREATE OR REPLACE FUNCTION update_consent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_consents_timestamp
    BEFORE UPDATE ON user_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_consent_timestamp();

-- Insert default data processing records
INSERT INTO data_processing_records (
    processing_activity, 
    data_categories, 
    legal_basis, 
    purposes, 
    retention_period, 
    data_subjects, 
    recipients
) VALUES
(
    'User Account Management',
    ARRAY['identity', 'contact', 'authentication'],
    'contract',
    ARRAY['service delivery', 'account security', 'customer support'],
    'Until account deletion',
    'platform users',
    ARRAY['internal staff', 'cloud service providers']
),
(
    'Booking Processing',
    ARRAY['identity', 'financial', 'communication'],
    'contract',
    ARRAY['booking fulfillment', 'payment processing', 'communication facilitation'],
    '7 years',
    'clients and celebrities',
    ARRAY['payment processors', 'email service providers']
),
(
    'Marketing Communications',
    ARRAY['contact', 'preferences', 'behavior'],
    'consent',
    ARRAY['promotional communications', 'service updates', 'personalization'],
    'Until consent withdrawn',
    'platform users',
    ARRAY['email marketing services', 'analytics providers']
),
(
    'Platform Analytics',
    ARRAY['usage', 'technical', 'behavior'],
    'legitimate_interest',
    ARRAY['service improvement', 'performance optimization', 'feature development'],
    '26 months',
    'platform users',
    ARRAY['analytics providers', 'cloud infrastructure']
)
ON CONFLICT DO NOTHING;

-- Insert current privacy policy version
INSERT INTO privacy_policy_versions (
    version,
    content,
    is_current,
    effective_date
) VALUES (
    '1.0',
    'Initial privacy policy for Celebrity Booking Platform - see privacy policy page for full content',
    true,
    NOW()
) ON CONFLICT DO NOTHING;
