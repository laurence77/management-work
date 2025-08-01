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
