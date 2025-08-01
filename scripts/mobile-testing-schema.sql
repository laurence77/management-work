-- Mobile Testing and Optimization Tables

-- Mobile test results
CREATE TABLE IF NOT EXISTS mobile_test_results (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(255) UNIQUE NOT NULL,
    results JSONB NOT NULL,
    summary JSONB NOT NULL,
    test_options JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Mobile performance metrics
CREATE TABLE IF NOT EXISTS mobile_performance_metrics (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(255) REFERENCES mobile_test_results(test_id),
    device_name VARCHAR(100) NOT NULL,
    page_url TEXT NOT NULL,
    load_time_ms INTEGER,
    lcp_ms INTEGER, -- Largest Contentful Paint
    fid_ms INTEGER, -- First Input Delay
    cls_score DECIMAL(5,3), -- Cumulative Layout Shift
    lighthouse_performance INTEGER, -- 0-100 score
    lighthouse_accessibility INTEGER,
    lighthouse_best_practices INTEGER,
    lighthouse_seo INTEGER,
    resource_count INTEGER,
    total_size_bytes BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Mobile usability issues
CREATE TABLE IF NOT EXISTS mobile_usability_issues (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(255) REFERENCES mobile_test_results(test_id),
    device_name VARCHAR(100) NOT NULL,
    page_url TEXT NOT NULL,
    issue_type VARCHAR(50) NOT NULL, -- 'touch_target', 'text_size', 'viewport', etc.
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    description TEXT NOT NULL,
    element_info JSONB,
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Mobile test schedules
CREATE TABLE IF NOT EXISTS mobile_test_schedules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    test_options JSONB NOT NULL,
    schedule_cron VARCHAR(100), -- Cron expression for scheduling
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Device compatibility matrix
CREATE TABLE IF NOT EXISTS device_compatibility (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    browser_name VARCHAR(50) NOT NULL,
    browser_version VARCHAR(20) NOT NULL,
    os_name VARCHAR(50) NOT NULL,
    os_version VARCHAR(20) NOT NULL,
    compatibility_score INTEGER CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
    issues JSONB,
    last_tested TIMESTAMP DEFAULT NOW(),
    UNIQUE(device_name, browser_name, browser_version, os_name, os_version)
);

-- Mobile analytics aggregation
CREATE TABLE IF NOT EXISTS mobile_analytics_summary (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    device_category VARCHAR(50), -- 'premium_ios', 'standard_android', 'tablet', etc.
    avg_load_time_ms INTEGER,
    avg_lcp_ms INTEGER,
    avg_fid_ms INTEGER,
    avg_cls_score DECIMAL(5,3),
    tests_run INTEGER DEFAULT 0,
    issues_found INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, device_category)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mobile_test_results_test_id ON mobile_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_mobile_test_results_created_at ON mobile_test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_mobile_performance_metrics_test_device ON mobile_performance_metrics(test_id, device_name);
CREATE INDEX IF NOT EXISTS idx_mobile_usability_issues_test_severity ON mobile_usability_issues(test_id, severity);
CREATE INDEX IF NOT EXISTS idx_mobile_test_schedules_active_next_run ON mobile_test_schedules(is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_device_compatibility_device ON device_compatibility(device_name, last_tested);
CREATE INDEX IF NOT EXISTS idx_mobile_analytics_summary_date_category ON mobile_analytics_summary(date, device_category);

-- Create functions for mobile testing
CREATE OR REPLACE FUNCTION update_mobile_analytics_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily analytics summary
    INSERT INTO mobile_analytics_summary (
        date, device_category, avg_load_time_ms, avg_lcp_ms, 
        avg_fid_ms, avg_cls_score, tests_run, issues_found, critical_issues
    )
    SELECT 
        CURRENT_DATE,
        'unknown' as device_category, -- This would be determined from device mapping
        AVG(load_time_ms)::INTEGER,
        AVG(lcp_ms)::INTEGER,
        AVG(fid_ms)::INTEGER,
        AVG(cls_score),
        COUNT(*),
        COUNT(CASE WHEN load_time_ms > 5000 OR lcp_ms > 2500 THEN 1 END),
        COUNT(CASE WHEN load_time_ms > 10000 OR lcp_ms > 4000 THEN 1 END)
    FROM mobile_performance_metrics 
    WHERE DATE(created_at) = CURRENT_DATE
    ON CONFLICT (date, device_category) DO UPDATE SET
        avg_load_time_ms = EXCLUDED.avg_load_time_ms,
        avg_lcp_ms = EXCLUDED.avg_lcp_ms,
        avg_fid_ms = EXCLUDED.avg_fid_ms,
        avg_cls_score = EXCLUDED.avg_cls_score,
        tests_run = EXCLUDED.tests_run,
        issues_found = EXCLUDED.issues_found,
        critical_issues = EXCLUDED.critical_issues;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating analytics
CREATE TRIGGER trigger_update_mobile_analytics_summary
    AFTER INSERT ON mobile_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_mobile_analytics_summary();

-- Create function to get mobile test history
CREATE OR REPLACE FUNCTION get_mobile_test_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    date DATE,
    tests_run BIGINT,
    avg_performance_score NUMERIC,
    critical_issues BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(mtr.created_at) as date,
        COUNT(*) as tests_run,
        AVG((mtr.summary->>'passed')::NUMERIC / (mtr.summary->>'total_tests')::NUMERIC * 100) as avg_performance_score,
        SUM((mtr.summary->>'failed')::NUMERIC) as critical_issues
    FROM mobile_test_results mtr
    WHERE mtr.created_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
    GROUP BY DATE(mtr.created_at)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert default mobile test schedule
INSERT INTO mobile_test_schedules (
    name, 
    test_options, 
    schedule_cron,
    created_by
) VALUES (
    'Daily Mobile Performance Check',
    '{
        "devices": ["iPhone 13", "Samsung Galaxy S23", "iPad Pro"],
        "pages": ["/", "/celebrities", "/booking"],
        "includePerformance": true,
        "includeFunctionality": false,
        "includeAccessibility": true
    }',
    '0 6 * * *',
    NULL
) ON CONFLICT DO NOTHING;

-- Insert sample device compatibility data
INSERT INTO device_compatibility (
    device_name, browser_name, browser_version, os_name, os_version, compatibility_score
) VALUES
('iPhone 14 Pro', 'Safari', '16.0', 'iOS', '16.0', 95),
('iPhone 13', 'Safari', '15.0', 'iOS', '15.0', 90),
('Samsung Galaxy S23', 'Chrome', '112.0', 'Android', '13.0', 92),
('Google Pixel 7', 'Chrome', '112.0', 'Android', '13.0', 88),
('iPad Pro', 'Safari', '16.0', 'iPadOS', '16.0', 94),
('Budget Android', 'Chrome', '91.0', 'Android', '10.0', 70)
ON CONFLICT (device_name, browser_name, browser_version, os_name, os_version) DO NOTHING;
