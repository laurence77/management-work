import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, Star, Download, RefreshCw, Activity } from 'lucide-react';

interface AnalyticsData {
    timeframe: string;
    period: { start: string; end: string };
    booking_metrics: any;
    revenue_metrics: any;
    user_metrics: any;
    celebrity_metrics: any;
    performance_metrics: any;
    generated_at: string;
}

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color = 'blue' }) => {
    const changeColor = change && change > 0 ? 'text-green-600' : 'text-red-600';
    const TrendIcon = change && change > 0 ? TrendingUp : TrendingDown;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className={`h-4 w-4 text-${color}-600`}>{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {change !== undefined && (
                    <p className={`text-xs ${changeColor} flex items-center mt-1`}>
                        <TrendIcon className="h-3 w-3 mr-1" />
                        {Math.abs(change)}% from last period
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

const AnalyticsDashboard: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('30d');
    const [refreshing, setRefreshing] = useState(false);

    const fetchAnalytics = async (tf: string = timeframe) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/analytics/dashboard?timeframe=${tf}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                setData(result.data);
            } else {
                console.error('Failed to fetch analytics');
            }
        } catch (error) {
            console.error('Analytics fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const handleTimeframeChange = (newTimeframe: string) => {
        setTimeframe(newTimeframe);
        fetchAnalytics(newTimeframe);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAnalytics();
    };

    const exportData = async (format: string) => {
        try {
            const response = await fetch('/api/analytics/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    format,
                    timeframe,
                    metrics: ['booking_metrics', 'revenue_metrics', 'user_metrics']
                })
            });

            if (response.ok) {
                if (format === 'json') {
                    const result = await response.json();
                    console.log('Export successful:', result);
                } else {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `analytics_${timeframe}.${format}`;
                    a.click();
                }
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Failed to load analytics data</p>
                <Button onClick={() => fetchAnalytics()} className="mt-4">
                    Try Again
                </Button>
            </div>
        );
    }

    const { booking_metrics, revenue_metrics, user_metrics, celebrity_metrics, performance_metrics } = data;

    // Prepare chart data
    const revenueChartData = revenue_metrics.revenue_trends || [];
    const bookingChartData = booking_metrics.booking_trends || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                    <p className="text-gray-500 mt-1">
                        Business intelligence and performance metrics
                    </p>
                </div>
                <div className="flex gap-2">
                    <Select value={timeframe} onValueChange={handleTimeframeChange}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button 
                        variant="outline" 
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Select onValueChange={exportData}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Export" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="excel">Excel</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Revenue"
                    value={`$${revenue_metrics.total_revenue.toLocaleString()}`}
                    icon={<DollarSign />}
                    color="green"
                />
                <MetricCard
                    title="Total Bookings"
                    value={booking_metrics.total_bookings.toLocaleString()}
                    icon={<Calendar />}
                    color="blue"
                />
                <MetricCard
                    title="Active Users"
                    value={user_metrics.total_active_users.toLocaleString()}
                    icon={<Users />}
                    color="purple"
                />
                <MetricCard
                    title="Avg Response Time"
                    value={`${Math.round(performance_metrics.avg_response_time)}ms`}
                    icon={<Activity />}
                    color="orange"
                />
            </div>

            {/* Main Analytics Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="bookings">Bookings</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="celebrities">Celebrities</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Trends</CardTitle>
                                <CardDescription>Revenue over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={revenueChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Status Distribution</CardTitle>
                                <CardDescription>Current booking statuses</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {booking_metrics.completed_bookings}
                                        </div>
                                        <div className="text-sm text-gray-500">Completed</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {booking_metrics.pending_bookings}
                                        </div>
                                        <div className="text-sm text-gray-500">Pending</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-red-600">
                                            {booking_metrics.cancelled_bookings}
                                        </div>
                                        <div className="text-sm text-gray-500">Cancelled</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {Math.round(booking_metrics.completion_rate)}%
                                        </div>
                                        <div className="text-sm text-gray-500">Completion Rate</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="revenue" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <span>Total Revenue</span>
                                    <span className="font-bold">${revenue_metrics.total_revenue.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Platform Fees</span>
                                    <span className="font-bold text-green-600">${revenue_metrics.platform_fees.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Celebrity Payouts</span>
                                    <span className="font-bold">${revenue_metrics.celebrity_payouts.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Net Revenue</span>
                                    <span className="font-bold text-blue-600">${revenue_metrics.net_revenue.toLocaleString()}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="col-span-2">
                            <CardHeader>
                                <CardTitle>Payment Methods</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {Object.entries(revenue_metrics.payment_method_breakdown || {}).map(([method, count]) => (
                                        <div key={method} className="flex justify-between items-center">
                                            <span className="capitalize">{method}</span>
                                            <Badge variant="secondary">{count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Additional tabs would be implemented similarly */}
            </Tabs>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t">
                Last updated: {new Date(data.generated_at).toLocaleString()}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
