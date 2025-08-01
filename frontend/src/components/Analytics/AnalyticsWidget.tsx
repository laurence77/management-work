import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Users, DollarSign } from 'lucide-react';

interface RealtimeMetrics {
    active_users: number;
    pending_bookings: number;
    revenue_today: number;
    new_signups_today: number;
    system_health: {
        status: string;
        response_time: number;
        uptime: number;
    };
    trending_celebrities: Array<{
        name: string;
        bookings_today: number;
    }>;
    last_updated: string;
}

const AnalyticsWidget: React.FC = () => {
    const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRealtimeMetrics = async () => {
            try {
                const response = await fetch('/api/analytics/realtime', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    setMetrics(result.data);
                }
            } catch (error) {
                console.error('Failed to fetch realtime metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRealtimeMetrics();
        const interval = setInterval(fetchRealtimeMetrics, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, []);

    if (loading || !metrics) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Live Metrics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'bg-green-500';
            case 'warning': return 'bg-yellow-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Live Metrics
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(metrics.system_health.status)}`}></div>
                </CardTitle>
                <CardDescription>
                    Real-time system performance and activity
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{metrics.active_users}</div>
                        <div className="text-xs text-gray-500">Active Users</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">${metrics.revenue_today.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Revenue Today</div>
                    </div>
                </div>

                {/* System Health */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Response Time</span>
                        <span>{Math.round(metrics.system_health.response_time)}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Uptime</span>
                        <span>{metrics.system_health.uptime.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Pending Bookings</span>
                        <Badge variant="secondary">{metrics.pending_bookings}</Badge>
                    </div>
                </div>

                {/* Trending */}
                <div>
                    <div className="text-sm font-medium mb-2">Trending Today</div>
                    <div className="space-y-1">
                        {metrics.trending_celebrities.map((celebrity, index) => (
                            <div key={index} className="flex justify-between text-xs">
                                <span>{celebrity.name}</span>
                                <span className="text-blue-600">{celebrity.bookings_today} bookings</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-xs text-gray-500 text-center pt-2 border-t">
                    Updated: {new Date(metrics.last_updated).toLocaleTimeString()}
                </div>
            </CardContent>
        </Card>
    );
};

export default AnalyticsWidget;
