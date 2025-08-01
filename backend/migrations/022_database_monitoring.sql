-- Database Performance Monitoring Tables

-- Query Performance Logs
CREATE TABLE IF NOT EXISTS query_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_name VARCHAR(255) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    user_id UUID REFERENCES auth.users(id)
);

-- Slow Query Logs
CREATE TABLE IF NOT EXISTS slow_query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_name VARCHAR(255) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    threshold_ms INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    query_params JSONB,
    optimization_suggestions TEXT[],
    resolved BOOLEAN DEFAULT false
);

-- Database Health Metrics
CREATE TABLE IF NOT EXISTS database_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Connection Pool Stats
CREATE TABLE IF NOT EXISTS connection_pool_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_connections INTEGER DEFAULT 0,
    idle_connections INTEGER DEFAULT 0,
    waiting_connections INTEGER DEFAULT 0,
    total_connections INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_performance_logs_timestamp ON query_performance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_query_performance_logs_query_name ON query_performance_logs(query_name);
CREATE INDEX IF NOT EXISTS idx_query_performance_logs_execution_time ON query_performance_logs(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_slow_query_logs_timestamp ON slow_query_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_slow_query_logs_execution_time ON slow_query_logs(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_database_health_metrics_timestamp ON database_health_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_database_health_metrics_name ON database_health_metrics(metric_name);

-- RLS Policies
ALTER TABLE query_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_pool_stats ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role full access to query_performance_logs" ON query_performance_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to slow_query_logs" ON slow_query_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to database_health_metrics" ON database_health_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to connection_pool_stats" ON connection_pool_stats
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for automated cleanup
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_performance_logs 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM slow_query_logs 
    WHERE timestamp < NOW() - INTERVAL '90 days' AND resolved = true;
    
    DELETE FROM database_health_metrics 
    WHERE timestamp < NOW() - INTERVAL '60 days';
    
    DELETE FROM connection_pool_stats 
    WHERE timestamp < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate query performance statistics
CREATE OR REPLACE FUNCTION get_query_performance_summary(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    query_name VARCHAR,
    total_executions BIGINT,
    avg_execution_time NUMERIC,
    max_execution_time INTEGER,
    min_execution_time INTEGER,
    error_count BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qpl.query_name,
        COUNT(*) as total_executions,
        ROUND(AVG(qpl.execution_time_ms), 2) as avg_execution_time,
        MAX(qpl.execution_time_ms) as max_execution_time,
        MIN(qpl.execution_time_ms) as min_execution_time,
        COUNT(*) FILTER (WHERE qpl.status = 'error') as error_count,
        ROUND((COUNT(*) FILTER (WHERE qpl.status = 'success')::NUMERIC / COUNT(*) * 100), 2) as success_rate
    FROM query_performance_logs qpl
    WHERE qpl.timestamp >= NOW() - (hours_back || ' hours')::INTERVAL
    GROUP BY qpl.query_name
    ORDER BY avg_execution_time DESC;
END;
$$ LANGUAGE plpgsql;
