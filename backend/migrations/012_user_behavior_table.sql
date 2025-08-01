-- User Behavior Tracking Table
CREATE TABLE IF NOT EXISTS user_behavior (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    session_id VARCHAR(255),
    page_url TEXT,
    celebrity_id VARCHAR(255),
    booking_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_user_behavior_user_id (user_id),
    INDEX idx_user_behavior_event_type (event_type),
    INDEX idx_user_behavior_timestamp (timestamp),
    INDEX idx_user_behavior_celebrity_id (celebrity_id)
);

-- User Journey Analytics View
CREATE OR REPLACE VIEW user_journey_analytics AS
SELECT 
    user_id,
    COUNT(*) as total_events,
    COUNT(DISTINCT event_type) as unique_event_types,
    MIN(timestamp) as first_interaction,
    MAX(timestamp) as last_interaction,
    EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/60 as session_duration_minutes,
    COUNT(CASE WHEN event_type = 'booking_view' THEN 1 END) as booking_views,
    COUNT(CASE WHEN event_type = 'booking_started' THEN 1 END) as booking_attempts,
    COUNT(CASE WHEN event_type = 'booking_completed' THEN 1 END) as booking_completions,
    COUNT(CASE WHEN event_type = 'booking_abandoned' THEN 1 END) as booking_abandonments,
    CASE 
        WHEN COUNT(CASE WHEN event_type = 'booking_completed' THEN 1 END) > 0 THEN 'converted'
        WHEN COUNT(CASE WHEN event_type = 'booking_abandoned' THEN 1 END) > 0 THEN 'abandoned'
        WHEN COUNT(CASE WHEN event_type = 'booking_started' THEN 1 END) > 0 THEN 'in_progress'
        ELSE 'browsing'
    END as journey_status
FROM user_behavior
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY user_id;

-- Abandoned Booking Recovery View
CREATE OR REPLACE VIEW abandoned_bookings AS
SELECT 
    ub.user_id,
    ub.celebrity_id,
    ub.booking_id,
    ub.event_data->>'budget' as budget,
    ub.event_data->>'user_name' as user_name,
    ub.event_data->>'user_email' as user_email,
    ub.timestamp as abandoned_at,
    EXTRACT(EPOCH FROM (NOW() - ub.timestamp))/3600 as hours_since_abandonment
FROM user_behavior ub
WHERE ub.event_type = 'booking_abandoned'
AND ub.timestamp > NOW() - INTERVAL '7 days'
AND NOT EXISTS (
    SELECT 1 FROM user_behavior ub2 
    WHERE ub2.user_id = ub.user_id 
    AND ub2.event_type = 'booking_completed'
    AND ub2.timestamp > ub.timestamp
);

-- Grant permissions
GRANT ALL ON user_behavior TO authenticated;
GRANT ALL ON user_journey_analytics TO authenticated;
GRANT ALL ON abandoned_bookings TO authenticated;