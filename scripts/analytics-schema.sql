-- Analytics and Business Intelligence Tables

-- Analytics access logs
CREATE TABLE IF NOT EXISTS analytics_access_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    metric_accessed VARCHAR(100),
    timeframe VARCHAR(20),
    accessed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Performance logs for analytics
CREATE TABLE IF NOT EXISTS performance_logs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50), -- 'api_call', 'page_load', 'error'
    endpoint VARCHAR(200),
    response_time INTEGER, -- in milliseconds
    load_time INTEGER, -- in milliseconds
    status_code INTEGER,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Business metrics cache
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Customer cohort analysis
CREATE TABLE IF NOT EXISTS user_cohorts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    cohort_month VARCHAR(7), -- YYYY-MM format
    signup_date DATE,
    first_booking_date DATE,
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_activity_date DATE
);

-- Booking analytics
CREATE TABLE IF NOT EXISTS booking_analytics (
    id SERIAL PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    user_id UUID REFERENCES users(id),
    celebrity_id UUID REFERENCES celebrities(id),
    booking_value DECIMAL(10,2),
    platform_fee DECIMAL(10,2),
    celebrity_payout DECIMAL(10,2),
    conversion_source VARCHAR(100), -- 'direct', 'social', 'search', etc.
    user_journey JSONB, -- Track user's path to booking
    created_at TIMESTAMP DEFAULT NOW()
);

-- Revenue analytics
CREATE TABLE IF NOT EXISTS revenue_analytics (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    platform_fees DECIMAL(12,2) DEFAULT 0,
    celebrity_payouts DECIMAL(12,2) DEFAULT 0,
    refunds DECIMAL(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    new_user_revenue DECIMAL(12,2) DEFAULT 0,
    returning_user_revenue DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Celebrity performance analytics
CREATE TABLE IF NOT EXISTS celebrity_analytics (
    id SERIAL PRIMARY KEY,
    celebrity_id UUID REFERENCES celebrities(id),
    date DATE,
    bookings_count INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    avg_rating DECIMAL(3,2),
    profile_views INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2), -- views to bookings
    response_time_hours DECIMAL(5,2),
    UNIQUE(celebrity_id, date)
);

-- User engagement analytics
CREATE TABLE IF NOT EXISTS user_engagement_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    date DATE,
    page_views INTEGER DEFAULT 0,
    session_duration INTEGER DEFAULT 0, -- in seconds
    actions_taken INTEGER DEFAULT 0,
    searches_performed INTEGER DEFAULT 0,
    celebrities_viewed INTEGER DEFAULT 0,
    bookings_attempted INTEGER DEFAULT 0,
    bookings_completed INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_access_logs_user_date ON analytics_access_logs(user_id, accessed_at);
CREATE INDEX IF NOT EXISTS idx_performance_logs_type_date ON performance_logs(type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key_expires ON analytics_cache(cache_key, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_month ON user_cohorts(cohort_month);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_date ON booking_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_analytics_date ON revenue_analytics(date);
CREATE INDEX IF NOT EXISTS idx_celebrity_analytics_date ON celebrity_analytics(celebrity_id, date);
CREATE INDEX IF NOT EXISTS idx_user_engagement_date ON user_engagement_analytics(user_id, date);

-- Create views for common analytics queries
CREATE OR REPLACE VIEW analytics_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_bookings,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
    AVG(amount) as avg_booking_value,
    SUM(amount) as total_revenue
FROM bookings 
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW daily_user_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_users,
    COUNT(CASE WHEN user_type = 'client' THEN 1 END) as new_clients,
    COUNT(CASE WHEN user_type = 'celebrity' THEN 1 END) as new_celebrities
FROM users 
GROUP BY DATE(created_at)
ORDER BY date DESC;
