#!/bin/bash

# Automated Database Performance Monitoring and Query Optimization Setup
# This script configures comprehensive database monitoring for Supabase PostgreSQL

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Setting up Database Performance Monitoring and Query Optimization...${NC}"

# Create database monitoring service
create_database_monitoring_service() {
    echo -e "${YELLOW}🔍 Creating database monitoring service...${NC}"
    
    mkdir -p backend/services/database
    
    cat > backend/services/database/DatabaseMonitoringService.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const { performance } = require('perf_hooks');

class DatabaseMonitoringService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        this.queryCache = new Map();
        this.slowQueryThreshold = 1000; // 1 second
        this.metrics = {
            queries: new Map(),
            connectionPool: {
                active: 0,
                idle: 0,
                waiting: 0
            },
            performance: {
                averageResponseTime: 0,
                slowQueries: [],
                errorRate: 0
            }
        };
    }

    // Monitor query performance
    async monitorQuery(queryName, queryFn) {
        const startTime = performance.now();
        const timestamp = new Date().toISOString();
        
        try {
            const result = await queryFn();
            const executionTime = Math.round(performance.now() - startTime);
            
            // Log query metrics
            await this.logQueryMetrics(queryName, executionTime, 'success', null, timestamp);
            
            // Check if query is slow
            if (executionTime > this.slowQueryThreshold) {
                await this.handleSlowQuery(queryName, executionTime, timestamp);
            }
            
            return result;
        } catch (error) {
            const executionTime = Math.round(performance.now() - startTime);
            await this.logQueryMetrics(queryName, executionTime, 'error', error.message, timestamp);
            throw error;
        }
    }

    // Log query metrics to database
    async logQueryMetrics(queryName, executionTime, status, errorMessage, timestamp) {
        try {
            const { error } = await this.supabase
                .from('query_performance_logs')
                .insert({
                    query_name: queryName,
                    execution_time_ms: executionTime,
                    status,
                    error_message: errorMessage,
                    timestamp,
                    metadata: {
                        slow_query: executionTime > this.slowQueryThreshold,
                        threshold_ms: this.slowQueryThreshold
                    }
                });

            if (error) {
                console.error('Failed to log query metrics:', error);
            }
        } catch (error) {
            console.error('Failed to log query metrics:', error);
        }
    }

    // Handle slow queries
    async handleSlowQuery(queryName, executionTime, timestamp) {
        console.warn(`🐌 Slow query detected: ${queryName} took ${executionTime}ms`);
        
        // Store slow query for analysis
        this.metrics.performance.slowQueries.push({
            queryName,
            executionTime,
            timestamp,
            threshold: this.slowQueryThreshold
        });

        // Keep only last 100 slow queries
        if (this.metrics.performance.slowQueries.length > 100) {
            this.metrics.performance.slowQueries = this.metrics.performance.slowQueries.slice(-100);
        }

        // Log to slow query table
        try {
            await this.supabase
                .from('slow_query_logs')
                .insert({
                    query_name: queryName,
                    execution_time_ms: executionTime,
                    timestamp,
                    threshold_ms: this.slowQueryThreshold
                });
        } catch (error) {
            console.error('Failed to log slow query:', error);
        }
    }

    // Get database performance metrics
    async getPerformanceMetrics(hours = 24) {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - hours);

            // Query performance summary
            const { data: queryMetrics, error: queryError } = await this.supabase
                .from('query_performance_logs')
                .select(`
                    query_name,
                    execution_time_ms,
                    status,
                    timestamp
                `)
                .gte('timestamp', cutoffTime.toISOString());

            if (queryError) throw queryError;

            // Slow query analysis
            const { data: slowQueries, error: slowError } = await this.supabase
                .from('slow_query_logs')
                .select('*')
                .gte('timestamp', cutoffTime.toISOString())
                .order('execution_time_ms', { ascending: false });

            if (slowError) throw slowError;

            // Calculate metrics
            const totalQueries = queryMetrics.length;
            const successfulQueries = queryMetrics.filter(q => q.status === 'success').length;
            const failedQueries = queryMetrics.filter(q => q.status === 'error').length;
            const avgResponseTime = totalQueries > 0 
                ? Math.round(queryMetrics.reduce((sum, q) => sum + q.execution_time_ms, 0) / totalQueries)
                : 0;

            // Query distribution by name
            const queryDistribution = queryMetrics.reduce((acc, query) => {
                if (!acc[query.query_name]) {
                    acc[query.query_name] = { count: 0, totalTime: 0, errors: 0 };
                }
                acc[query.query_name].count++;
                acc[query.query_name].totalTime += query.execution_time_ms;
                if (query.status === 'error') {
                    acc[query.query_name].errors++;
                }
                return acc;
            }, {});

            // Add average time for each query type
            Object.keys(queryDistribution).forEach(queryName => {
                const query = queryDistribution[queryName];
                query.avgTime = Math.round(query.totalTime / query.count);
                query.errorRate = (query.errors / query.count * 100).toFixed(2);
            });

            return {
                summary: {
                    totalQueries,
                    successfulQueries,
                    failedQueries,
                    errorRate: totalQueries > 0 ? ((failedQueries / totalQueries) * 100).toFixed(2) : 0,
                    avgResponseTime,
                    slowQueriesCount: slowQueries.length
                },
                queryDistribution,
                slowQueries: slowQueries.slice(0, 20), // Top 20 slowest
                timeRange: {
                    from: cutoffTime.toISOString(),
                    to: new Date().toISOString(),
                    hours
                }
            };
        } catch (error) {
            console.error('Failed to get performance metrics:', error);
            throw error;
        }
    }

    // Database connection monitoring
    async monitorConnections() {
        try {
            // Check active connections (this is a simplified version)
            const { data: connections, error } = await this.supabase
                .from('pg_stat_activity')
                .select('state, count(*)')
                .not('state', 'is', null);

            if (error) {
                // If we can't access pg_stat_activity, return basic info
                return {
                    error: 'Cannot access connection stats',
                    message: 'Supabase may restrict access to pg_stat_activity',
                    basic_check: 'Connection is working'
                };
            }

            const connectionStats = connections.reduce((acc, conn) => {
                acc[conn.state] = conn.count;
                return acc;
            }, {});

            return {
                connections: connectionStats,
                total: Object.values(connectionStats).reduce((sum, count) => sum + count, 0),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Table size and statistics
    async getTableStatistics() {
        try {
            // Get table sizes and row counts
            const tables = [
                'users', 'celebrities', 'bookings', 'payments', 
                'query_performance_logs', 'slow_query_logs'
            ];

            const tableStats = {};

            for (const table of tables) {
                try {
                    // Get row count
                    const { count, error: countError } = await this.supabase
                        .from(table)
                        .select('*', { count: 'exact', head: true });

                    if (!countError) {
                        tableStats[table] = {
                            row_count: count,
                            status: 'accessible'
                        };
                    } else {
                        tableStats[table] = {
                            row_count: 0,
                            status: 'error',
                            error: countError.message
                        };
                    }
                } catch (error) {
                    tableStats[table] = {
                        row_count: 0,
                        status: 'error',
                        error: error.message
                    };
                }
            }

            return {
                tables: tableStats,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to get table statistics:', error);
            throw error;
        }
    }

    // Query optimization suggestions
    async getQueryOptimizationSuggestions() {
        try {
            const metrics = await this.getPerformanceMetrics(24);
            const suggestions = [];

            // Analyze slow queries
            if (metrics.slowQueries.length > 0) {
                const frequentSlowQueries = metrics.slowQueries
                    .reduce((acc, query) => {
                        if (!acc[query.query_name]) {
                            acc[query.query_name] = { count: 0, maxTime: 0, avgTime: 0, totalTime: 0 };
                        }
                        acc[query.query_name].count++;
                        acc[query.query_name].totalTime += query.execution_time_ms;
                        acc[query.query_name].maxTime = Math.max(acc[query.query_name].maxTime, query.execution_time_ms);
                        return acc;
                    }, {});

                Object.entries(frequentSlowQueries).forEach(([queryName, stats]) => {
                    stats.avgTime = Math.round(stats.totalTime / stats.count);
                    
                    if (stats.count > 5) {
                        suggestions.push({
                            type: 'frequent_slow_query',
                            priority: 'high',
                            query: queryName,
                            issue: `Query appears ${stats.count} times with average time ${stats.avgTime}ms`,
                            suggestion: 'Consider adding indexes, optimizing query structure, or implementing caching',
                            stats
                        });
                    }
                });
            }

            // Analyze error patterns
            Object.entries(metrics.queryDistribution).forEach(([queryName, stats]) => {
                if (parseFloat(stats.errorRate) > 5) {
                    suggestions.push({
                        type: 'high_error_rate',
                        priority: 'high',
                        query: queryName,
                        issue: `Query has ${stats.errorRate}% error rate`,
                        suggestion: 'Review query logic, add error handling, or check data constraints',
                        stats
                    });
                }

                if (stats.avgTime > 2000) {
                    suggestions.push({
                        type: 'slow_average',
                        priority: 'medium',
                        query: queryName,
                        issue: `Average execution time is ${stats.avgTime}ms`,
                        suggestion: 'Consider query optimization, indexing, or result caching',
                        stats
                    });
                }
            });

            return {
                suggestions,
                summary: {
                    total: suggestions.length,
                    high_priority: suggestions.filter(s => s.priority === 'high').length,
                    medium_priority: suggestions.filter(s => s.priority === 'medium').length
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to generate optimization suggestions:', error);
            throw error;
        }
    }

    // Index recommendations
    async getIndexRecommendations() {
        const recommendations = [
            {
                table: 'bookings',
                columns: ['celebrity_id', 'status'],
                reason: 'Frequently queried together for booking lookups',
                query: 'CREATE INDEX CONCURRENTLY idx_bookings_celebrity_status ON bookings(celebrity_id, status);'
            },
            {
                table: 'bookings',
                columns: ['created_at'],
                reason: 'Used for date range queries and sorting',
                query: 'CREATE INDEX CONCURRENTLY idx_bookings_created_at ON bookings(created_at);'
            },
            {
                table: 'query_performance_logs',
                columns: ['timestamp', 'query_name'],
                reason: 'Used for performance monitoring queries',
                query: 'CREATE INDEX CONCURRENTLY idx_query_logs_timestamp_name ON query_performance_logs(timestamp, query_name);'
            },
            {
                table: 'celebrities',
                columns: ['category', 'status'],
                reason: 'Used for filtering available celebrities',
                query: 'CREATE INDEX CONCURRENTLY idx_celebrities_category_status ON celebrities(category, status);'
            }
        ];

        return {
            recommendations,
            note: 'These are general recommendations. Analyze actual query patterns before implementing.',
            implementation_note: 'Use CONCURRENTLY to avoid blocking other operations during index creation',
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = DatabaseMonitoringService;
EOF

    echo -e "${GREEN}✅ Database monitoring service created${NC}"
}

# Create database schema for monitoring
create_monitoring_schema() {
    echo -e "${YELLOW}🗄️ Creating monitoring database schema...${NC}"
    
    cat > backend/migrations/022_database_monitoring.sql << 'EOF'
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
EOF

    echo -e "${GREEN}✅ Monitoring schema created${NC}"
}

# Create database monitoring routes
create_monitoring_routes() {
    echo -e "${YELLOW}🛣️ Creating database monitoring routes...${NC}"
    
    cat > backend/routes/database-monitoring.js << 'EOF'
const express = require('express');
const router = express.Router();
const DatabaseMonitoringService = require('../services/database/DatabaseMonitoringService');
const { authenticate } = require('../middleware/auth');

const dbMonitor = new DatabaseMonitoringService();

// Get performance metrics
router.get('/metrics', authenticate, async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const metrics = await dbMonitor.getPerformanceMetrics(hours);
        res.json({ success: true, data: metrics });
    } catch (error) {
        console.error('Failed to get performance metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get connection monitoring
router.get('/connections', authenticate, async (req, res) => {
    try {
        const connections = await dbMonitor.monitorConnections();
        res.json({ success: true, data: connections });
    } catch (error) {
        console.error('Failed to get connection stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get table statistics
router.get('/tables', authenticate, async (req, res) => {
    try {
        const stats = await dbMonitor.getTableStatistics();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Failed to get table statistics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get optimization suggestions
router.get('/optimization', authenticate, async (req, res) => {
    try {
        const suggestions = await dbMonitor.getQueryOptimizationSuggestions();
        res.json({ success: true, data: suggestions });
    } catch (error) {
        console.error('Failed to get optimization suggestions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get index recommendations
router.get('/indexes', authenticate, async (req, res) => {
    try {
        const recommendations = await dbMonitor.getIndexRecommendations();
        res.json({ success: true, data: recommendations });
    } catch (error) {
        console.error('Failed to get index recommendations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Manually trigger slow query analysis
router.post('/analyze-slow-queries', authenticate, async (req, res) => {
    try {
        const { hours = 24 } = req.body;
        const metrics = await dbMonitor.getPerformanceMetrics(hours);
        const slowQueries = metrics.slowQueries;
        
        // Analysis results
        const analysis = {
            total_slow_queries: slowQueries.length,
            unique_queries: [...new Set(slowQueries.map(q => q.query_name))].length,
            slowest_query: slowQueries[0] || null,
            avg_slow_time: slowQueries.length > 0 
                ? Math.round(slowQueries.reduce((sum, q) => sum + q.execution_time_ms, 0) / slowQueries.length)
                : 0,
            recommendations: []
        };

        // Generate specific recommendations
        const queryGroups = slowQueries.reduce((acc, query) => {
            if (!acc[query.query_name]) {
                acc[query.query_name] = [];
            }
            acc[query.query_name].push(query);
            return acc;
        }, {});

        Object.entries(queryGroups).forEach(([queryName, queries]) => {
            if (queries.length > 3) {
                analysis.recommendations.push({
                    query: queryName,
                    frequency: queries.length,
                    avg_time: Math.round(queries.reduce((sum, q) => sum + q.execution_time_ms, 0) / queries.length),
                    suggestion: 'High frequency slow query - consider indexing or query optimization'
                });
            }
        });

        res.json({ success: true, data: analysis });
    } catch (error) {
        console.error('Failed to analyze slow queries:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Real-time query monitoring endpoint
router.get('/realtime', authenticate, async (req, res) => {
    try {
        // Get recent queries (last 5 minutes)
        const { data: recentQueries, error } = await dbMonitor.supabase
            .from('query_performance_logs')
            .select('*')
            .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: false });

        if (error) throw error;

        const realTimeStats = {
            recent_queries: recentQueries.slice(0, 10),
            query_count_last_5min: recentQueries.length,
            avg_response_time_last_5min: recentQueries.length > 0 
                ? Math.round(recentQueries.reduce((sum, q) => sum + q.execution_time_ms, 0) / recentQueries.length)
                : 0,
            error_count_last_5min: recentQueries.filter(q => q.status === 'error').length,
            slow_queries_last_5min: recentQueries.filter(q => q.execution_time_ms > 1000).length
        };

        res.json({ success: true, data: realTimeStats });
    } catch (error) {
        console.error('Failed to get real-time stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
EOF

    echo -e "${GREEN}✅ Database monitoring routes created${NC}"
}

# Create monitoring dashboard
create_monitoring_dashboard() {
    echo -e "${YELLOW}📊 Creating database monitoring dashboard...${NC}"
    
    mkdir -p admin-dashboard/src/components/database
    
    cat > admin-dashboard/src/components/database/DatabaseMonitoring.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { Database, Activity, AlertTriangle, TrendingUp, Clock, Zap } from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

interface DatabaseMetrics {
    summary: {
        totalQueries: number;
        successfulQueries: number;
        failedQueries: number;
        errorRate: string;
        avgResponseTime: number;
        slowQueriesCount: number;
    };
    queryDistribution: Record<string, {
        count: number;
        totalTime: number;
        avgTime: number;
        errors: number;
        errorRate: string;
    }>;
    slowQueries: Array<{
        query_name: string;
        execution_time_ms: number;
        timestamp: string;
    }>;
}

interface OptimizationSuggestion {
    type: string;
    priority: 'high' | 'medium' | 'low';
    query: string;
    issue: string;
    suggestion: string;
    stats: any;
}

export const DatabaseMonitoring: React.FC = () => {
    const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
    const [optimization, setOptimization] = useState<OptimizationSuggestion[]>([]);
    const [connections, setConnections] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('24');
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchDatabaseData();
    }, [selectedPeriod]);

    useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(fetchDatabaseData, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, selectedPeriod]);

    const fetchDatabaseData = async () => {
        try {
            setLoading(true);
            
            // Fetch metrics
            const metricsResponse = await fetch(`/api/database-monitoring/metrics?hours=${selectedPeriod}`);
            const metricsData = await metricsResponse.json();
            if (metricsData.success) setMetrics(metricsData.data);
            
            // Fetch optimization suggestions
            const optimizationResponse = await fetch('/api/database-monitoring/optimization');
            const optimizationData = await optimizationResponse.json();
            if (optimizationData.success) setOptimization(optimizationData.data.suggestions);
            
            // Fetch connections
            const connectionsResponse = await fetch('/api/database-monitoring/connections');
            const connectionsData = await connectionsResponse.json();
            if (connectionsData.success) setConnections(connectionsData.data);
            
        } catch (error) {
            console.error('Failed to fetch database data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600 bg-red-50 border-red-200';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const queryDistributionData = metrics ? {
        labels: Object.keys(metrics.queryDistribution).slice(0, 10),
        datasets: [{
            label: 'Query Count',
            data: Object.values(metrics.queryDistribution).slice(0, 10).map(q => q.count),
            backgroundColor: 'rgba(59, 130, 246, 0.8)'
        }]
    } : null;

    const responseTimeData = metrics ? {
        labels: Object.keys(metrics.queryDistribution).slice(0, 10),
        datasets: [{
            label: 'Average Response Time (ms)',
            data: Object.values(metrics.queryDistribution).slice(0, 10).map(q => q.avgTime),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.1
        }]
    } : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Database className="mr-3" size={28} />
                        Database Performance
                    </h2>
                    <p className="text-gray-600">Monitor query performance and optimization opportunities</p>
                </div>
                <div className="flex items-center space-x-4">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="1">Last hour</option>
                        <option value="24">Last 24 hours</option>
                        <option value="168">Last week</option>
                    </select>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="mr-2"
                        />
                        Auto-refresh
                    </label>
                    <button
                        onClick={fetchDatabaseData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <div className="flex items-center">
                            <Activity className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Queries</p>
                                <p className="text-2xl font-bold text-gray-900">{metrics.summary.totalQueries.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border">
                        <div className="flex items-center">
                            <Clock className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                                <p className="text-2xl font-bold text-gray-900">{metrics.summary.avgResponseTime}ms</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border">
                        <div className="flex items-center">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Error Rate</p>
                                <p className="text-2xl font-bold text-gray-900">{metrics.summary.errorRate}%</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border">
                        <div className="flex items-center">
                            <Zap className="h-8 w-8 text-yellow-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Slow Queries</p>
                                <p className="text-2xl font-bold text-gray-900">{metrics.summary.slowQueriesCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {queryDistributionData && (
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-semibold mb-4">Query Distribution</h3>
                        <Bar data={queryDistributionData} options={{ responsive: true }} />
                    </div>
                )}

                {responseTimeData && (
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-semibold mb-4">Average Response Times</h3>
                        <Line data={responseTimeData} options={{ responsive: true }} />
                    </div>
                )}
            </div>

            {/* Optimization Suggestions */}
            <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold flex items-center">
                        <TrendingUp className="mr-2" size={20} />
                        Optimization Suggestions
                    </h3>
                </div>
                <div className="p-6">
                    {optimization.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No optimization suggestions at this time</p>
                    ) : (
                        <div className="space-y-4">
                            {optimization.map((suggestion, index) => (
                                <div key={index} className={`p-4 rounded-lg border ${getPriorityColor(suggestion.priority)}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium">{suggestion.query}</h4>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                                            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {suggestion.priority.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-sm mb-2">{suggestion.issue}</p>
                                    <p className="text-sm font-medium">{suggestion.suggestion}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Slow Queries */}
            {metrics && metrics.slowQueries.length > 0 && (
                <div className="bg-white rounded-lg shadow border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold">Recent Slow Queries</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Query
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Execution Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {metrics.slowQueries.slice(0, 10).map((query, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {query.query_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                query.execution_time_ms > 5000 ? 'bg-red-100 text-red-800' :
                                                query.execution_time_ms > 2000 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {query.execution_time_ms}ms
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(query.timestamp).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
EOF

    echo -e "${GREEN}✅ Database monitoring dashboard created${NC}"
}

# Create automated monitoring script
create_monitoring_script() {
    echo -e "${YELLOW}🤖 Creating automated monitoring script...${NC}"
    
    cat > scripts/database-monitor.js << 'EOF'
const DatabaseMonitoringService = require('../backend/services/database/DatabaseMonitoringService');
const { logger } = require('../backend/utils/logger');
const cron = require('node-cron');

class DatabaseMonitor {
    constructor() {
        this.dbMonitor = new DatabaseMonitoringService();
        this.alertThresholds = {
            slowQueryTime: 5000, // 5 seconds
            errorRatePercent: 10,
            avgResponseTime: 2000
        };
    }

    start() {
        logger.info('🔍 Starting Database Monitor...');

        // Monitor every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            try {
                await this.performMonitoring();
            } catch (error) {
                logger.error('Database monitoring failed:', error);
            }
        });

        // Daily performance report at 9 AM
        cron.schedule('0 9 * * *', async () => {
            try {
                await this.generateDailyReport();
            } catch (error) {
                logger.error('Daily report generation failed:', error);
            }
        });

        // Weekly cleanup at 2 AM Sunday
        cron.schedule('0 2 * * 0', async () => {
            try {
                await this.performCleanup();
            } catch (error) {
                logger.error('Database cleanup failed:', error);
            }
        });

        logger.info('✅ Database Monitor started successfully');
    }

    async performMonitoring() {
        try {
            const metrics = await this.dbMonitor.getPerformanceMetrics(1); // Last hour
            
            // Check for alerts
            await this.checkAlerts(metrics);
            
            // Log current status
            logger.info('Database monitoring check completed', {
                totalQueries: metrics.summary.totalQueries,
                avgResponseTime: metrics.summary.avgResponseTime,
                errorRate: metrics.summary.errorRate,
                slowQueries: metrics.summary.slowQueriesCount
            });

        } catch (error) {
            logger.error('Performance monitoring failed:', error);
        }
    }

    async checkAlerts(metrics) {
        const alerts = [];

        // Check average response time
        if (metrics.summary.avgResponseTime > this.alertThresholds.avgResponseTime) {
            alerts.push({
                type: 'high_response_time',
                severity: 'warning',
                message: `Average response time is ${metrics.summary.avgResponseTime}ms (threshold: ${this.alertThresholds.avgResponseTime}ms)`,
                value: metrics.summary.avgResponseTime
            });
        }

        // Check error rate
        const errorRate = parseFloat(metrics.summary.errorRate);
        if (errorRate > this.alertThresholds.errorRatePercent) {
            alerts.push({
                type: 'high_error_rate',
                severity: 'critical',
                message: `Error rate is ${errorRate}% (threshold: ${this.alertThresholds.errorRatePercent}%)`,
                value: errorRate
            });
        }

        // Check for frequent slow queries
        if (metrics.summary.slowQueriesCount > 10) {
            alerts.push({
                type: 'frequent_slow_queries',
                severity: 'warning',
                message: `${metrics.summary.slowQueriesCount} slow queries detected in the last hour`,
                value: metrics.summary.slowQueriesCount
            });
        }

        // Check individual query performance
        Object.entries(metrics.queryDistribution).forEach(([queryName, stats]) => {
            if (stats.avgTime > this.alertThresholds.slowQueryTime) {
                alerts.push({
                    type: 'slow_query_pattern',
                    severity: 'warning',
                    message: `Query "${queryName}" averages ${stats.avgTime}ms (${stats.count} executions)`,
                    query: queryName,
                    value: stats.avgTime
                });
            }
        });

        // Send alerts
        for (const alert of alerts) {
            await this.sendAlert(alert);
        }
    }

    async sendAlert(alert) {
        logger.warn(`🚨 DATABASE ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, alert);
        
        // Here you could integrate with external alerting systems
        // Example integrations (uncomment and configure as needed):
        
        // Slack webhook
        // if (process.env.SLACK_WEBHOOK_URL) {
        //     await this.sendSlackAlert(alert);
        // }
        
        // Email notification
        // if (process.env.ALERT_EMAIL) {
        //     await this.sendEmailAlert(alert);
        // }
    }

    async generateDailyReport() {
        try {
            const metrics = await this.dbMonitor.getPerformanceMetrics(24);
            const optimization = await this.dbMonitor.getQueryOptimizationSuggestions();
            
            const report = {
                date: new Date().toISOString().split('T')[0],
                summary: metrics.summary,
                topSlowQueries: metrics.slowQueries.slice(0, 5),
                optimizationSuggestions: optimization.suggestions.filter(s => s.priority === 'high'),
                queryDistribution: Object.entries(metrics.queryDistribution)
                    .sort(([,a], [,b]) => b.avgTime - a.avgTime)
                    .slice(0, 10)
            };

            logger.info('📊 Daily Database Performance Report', report);

            // Store report in database
            await this.dbMonitor.supabase
                .from('database_health_metrics')
                .insert({
                    metric_name: 'daily_report',
                    metric_value: 1,
                    metric_unit: 'report',
                    metadata: report
                });

        } catch (error) {
            logger.error('Failed to generate daily report:', error);
        }
    }

    async performCleanup() {
        try {
            const { data, error } = await this.dbMonitor.supabase
                .rpc('cleanup_old_performance_logs');

            if (error) throw error;

            logger.info(`🧹 Database cleanup completed. Removed ${data} old records`);
        } catch (error) {
            logger.error('Database cleanup failed:', error);
        }
    }
}

// CLI usage
if (require.main === module) {
    const monitor = new DatabaseMonitor();
    monitor.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nDatabase monitor shutting down...');
        process.exit(0);
    });
}

module.exports = DatabaseMonitor;
EOF

    chmod +x scripts/database-monitor.js
    echo -e "${GREEN}✅ Database monitoring script created${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting Database Monitoring Setup...${NC}"
    
    # Create all components
    create_database_monitoring_service
    create_monitoring_schema
    create_monitoring_routes
    create_monitoring_dashboard
    create_monitoring_script
    
    echo -e "${GREEN}✅ Database Monitoring Setup Complete!${NC}"
    echo -e "${BLUE}📋 Features implemented:${NC}"
    echo "• Query performance monitoring with automated logging"
    echo "• Slow query detection and analysis"
    echo "• Real-time performance metrics and dashboards"
    echo "• Automated optimization suggestions"
    echo "• Index recommendations"
    echo "• Connection pool monitoring"
    echo "• Automated cleanup and maintenance"
    echo "• Daily performance reports"
    echo ""
    echo -e "${BLUE}📋 Usage:${NC}"
    echo "• Start monitoring: node scripts/database-monitor.js"
    echo "• Access dashboard: /admin/database-monitoring"
    echo "• API endpoints: /api/database-monitoring/*"
}

# Execute main function
main "$@"