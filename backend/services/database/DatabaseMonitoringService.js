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
