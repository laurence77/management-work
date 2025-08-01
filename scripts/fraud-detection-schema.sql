-- Fraud Detection and Payment Security Tables

-- Fraud analysis results
CREATE TABLE IF NOT EXISTS fraud_analyses (
    id SERIAL PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_factors JSONB NOT NULL,
    recommendation JSONB NOT NULL,
    requires_manual_review BOOLEAN DEFAULT false,
    should_block BOOLEAN DEFAULT false,
    confidence_score INTEGER DEFAULT 0,
    ml_model_version VARCHAR(20),
    analyzed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Manual review queue
CREATE TABLE IF NOT EXISTS manual_review_queue (
    id SERIAL PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    risk_score INTEGER NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
    assigned_to UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Device fingerprinting and history
CREATE TABLE IF NOT EXISTS device_history (
    id SERIAL PRIMARY KEY,
    fingerprint VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    screen_resolution VARCHAR(20),
    timezone VARCHAR(50),
    language VARCHAR(10),
    is_flagged BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    usage_count INTEGER DEFAULT 1
);

-- Fraud reports and investigations
CREATE TABLE IF NOT EXISTS fraud_reports (
    id SERIAL PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    user_id UUID REFERENCES users(id),
    report_type VARCHAR(50) NOT NULL, -- 'chargeback', 'identity_theft', 'card_testing', etc.
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'confirmed', 'false_positive', 'closed')),
    description TEXT,
    evidence JSONB,
    reported_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment method blacklist
CREATE TABLE IF NOT EXISTS payment_blacklist (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'card_bin', 'email', 'phone', 'ip_address'
    value VARCHAR(255) NOT NULL,
    reason TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    expires_at TIMESTAMP,
    added_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(type, value)
);

-- Transaction velocity tracking
CREATE TABLE IF NOT EXISTS transaction_velocity (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    transaction_count INTEGER DEFAULT 1,
    total_amount DECIMAL(12,2) DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    time_window_start TIMESTAMP NOT NULL,
    last_transaction_at TIMESTAMP DEFAULT NOW(),
    is_suspicious BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud detection settings
CREATE TABLE IF NOT EXISTS fraud_detection_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT single_settings_row CHECK (id = 1)
);

-- User transaction statistics (for behavioral analysis)
CREATE TABLE IF NOT EXISTS user_transaction_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) UNIQUE,
    total_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    avg_transaction_amount DECIMAL(10,2) DEFAULT 0,
    max_transaction_amount DECIMAL(10,2) DEFAULT 0,
    first_transaction_at TIMESTAMP,
    last_transaction_at TIMESTAMP,
    preferred_payment_methods TEXT[],
    common_booking_types TEXT[],
    risk_profile VARCHAR(20) DEFAULT 'unknown',
    last_updated TIMESTAMP DEFAULT NOW()
);

-- IP address reputation and geolocation
CREATE TABLE IF NOT EXISTS ip_reputation (
    id SERIAL PRIMARY KEY,
    ip_address INET UNIQUE NOT NULL,
    reputation_score INTEGER DEFAULT 50 CHECK (reputation_score >= 0 AND reputation_score <= 100),
    is_vpn BOOLEAN DEFAULT false,
    is_tor BOOLEAN DEFAULT false,
    is_proxy BOOLEAN DEFAULT false,
    country_code VARCHAR(2),
    city VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    isp VARCHAR(255),
    threat_categories TEXT[],
    last_seen TIMESTAMP DEFAULT NOW(),
    first_seen TIMESTAMP DEFAULT NOW(),
    lookup_count INTEGER DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fraud_analyses_transaction ON fraud_analyses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fraud_analyses_risk_level ON fraud_analyses(risk_level, analyzed_at);
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_status ON manual_review_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_device_history_fingerprint ON device_history(fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_history_user ON device_history(user_id, last_seen);
CREATE INDEX IF NOT EXISTS idx_fraud_reports_status ON fraud_reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_blacklist_type_value ON payment_blacklist(type, value);
CREATE INDEX IF NOT EXISTS idx_transaction_velocity_user ON transaction_velocity(user_id, time_window_start);
CREATE INDEX IF NOT EXISTS idx_transaction_velocity_ip ON transaction_velocity(ip_address, time_window_start);
CREATE INDEX IF NOT EXISTS idx_user_transaction_stats_user ON user_transaction_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_address ON ip_reputation(ip_address);

-- Create functions for fraud detection
CREATE OR REPLACE FUNCTION update_user_transaction_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user transaction statistics after each transaction
    INSERT INTO user_transaction_stats (
        user_id, total_transactions, total_amount, avg_transaction_amount,
        max_transaction_amount, first_transaction_at, last_transaction_at
    )
    SELECT 
        NEW.user_id,
        COUNT(*),
        SUM(amount),
        AVG(amount),
        MAX(amount),
        MIN(created_at),
        MAX(created_at)
    FROM transactions 
    WHERE user_id = NEW.user_id AND status = 'completed'
    ON CONFLICT (user_id) DO UPDATE SET
        total_transactions = EXCLUDED.total_transactions,
        total_amount = EXCLUDED.total_amount,
        avg_transaction_amount = EXCLUDED.avg_transaction_amount,
        max_transaction_amount = EXCLUDED.max_transaction_amount,
        last_transaction_at = EXCLUDED.last_transaction_at,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating user stats
CREATE TRIGGER trigger_update_user_transaction_stats
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_user_transaction_stats();

-- Create function for velocity tracking
CREATE OR REPLACE FUNCTION track_transaction_velocity()
RETURNS TRIGGER AS $$
DECLARE
    window_start TIMESTAMP;
BEGIN
    window_start := date_trunc('hour', NEW.created_at);
    
    -- Update or insert velocity tracking
    INSERT INTO transaction_velocity (
        user_id, ip_address, transaction_count, total_amount,
        failed_count, time_window_start, last_transaction_at
    ) VALUES (
        NEW.user_id, 
        NEW.ip_address::INET,
        1,
        COALESCE(NEW.amount, 0),
        CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
        window_start,
        NEW.created_at
    )
    ON CONFLICT (user_id, time_window_start) DO UPDATE SET
        transaction_count = transaction_velocity.transaction_count + 1,
        total_amount = transaction_velocity.total_amount + COALESCE(NEW.amount, 0),
        failed_count = transaction_velocity.failed_count + 
                      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
        last_transaction_at = NEW.created_at,
        is_suspicious = (transaction_velocity.transaction_count + 1 > 5) OR 
                       (transaction_velocity.total_amount + COALESCE(NEW.amount, 0) > 50000) OR
                       (transaction_velocity.failed_count + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END > 3);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for velocity tracking
CREATE TRIGGER trigger_track_transaction_velocity
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION track_transaction_velocity();

-- Insert default fraud detection settings
INSERT INTO fraud_detection_settings (id, settings) VALUES (
    1,
    '{
        "risk_thresholds": {
            "low": 30,
            "medium": 60,
            "high": 80,
            "critical": 90
        },
        "velocity_limits": {
            "max_transactions_per_hour": 5,
            "max_amount_per_hour": 50000,
            "max_failed_attempts_per_hour": 3
        },
        "auto_block_enabled": true,
        "manual_review_threshold": 80,
        "notification_threshold": 90
    }'
) ON CONFLICT (id) DO NOTHING;

-- Insert some sample blacklist entries
INSERT INTO payment_blacklist (type, value, reason, severity) VALUES
('card_bin', '123456', 'Known fraudulent BIN range', 'high'),
('ip_address', '192.168.1.100', 'Previous fraud attempts', 'medium'),
('email', 'fraud@example.com', 'Identity theft case', 'critical')
ON CONFLICT (type, value) DO NOTHING;
