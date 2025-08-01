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
