import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar, 
  Star,
  Eye,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { QuickStatCard } from '@/components/ui/mobile-card';

interface MetricData {
  period: string;
  revenue: number;
  bookings: number;
  users: number;
  completionRate: number;
}

interface PlatformMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  totalBookings: number;
  bookingsGrowth: number;
  totalUsers: number;
  usersGrowth: number;
  avgBookingValue: number;
  bookingValueGrowth: number;
  conversionRate: number;
  conversionGrowth: number;
  userRetention: number;
  retentionGrowth: number;
}

const AdminMetrics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);

  // Sample data - in real app, this would come from API
  const chartData: MetricData[] = [
    { period: 'Jan', revenue: 65000, bookings: 120, users: 340, completionRate: 92 },
    { period: 'Feb', revenue: 78000, bookings: 145, users: 398, completionRate: 94 },
    { period: 'Mar', revenue: 92000, bookings: 167, users: 456, completionRate: 89 },
    { period: 'Apr', revenue: 105000, bookings: 189, users: 523, completionRate: 96 },
    { period: 'May', revenue: 118000, bookings: 201, users: 587, completionRate: 93 },
    { period: 'Jun', revenue: 134000, bookings: 234, users: 645, completionRate: 97 },
    { period: 'Jul', revenue: 145000, bookings: 256, users: 712, completionRate: 95 },
  ];

  const metrics: PlatformMetrics = {
    totalRevenue: 892750,
    revenueGrowth: 12.3,
    totalBookings: 1567,
    bookingsGrowth: 8.7,
    totalUsers: 4128,
    usersGrowth: 15.2,
    avgBookingValue: 569.8,
    bookingValueGrowth: 4.1,
    conversionRate: 3.2,
    conversionGrowth: 0.8,
    userRetention: 78.5,
    retentionGrowth: 2.3
  };

  const categoryData = [
    { name: 'A-List Celebrities', value: 45, color: '#fbbf24' },
    { name: 'Musicians', value: 25, color: '#3b82f6' },
    { name: 'Actors', value: 18, color: '#10b981' },
    { name: 'Athletes', value: 12, color: '#f59e0b' },
  ];

  const paymentMethodData = [
    { name: 'Bitcoin', value: 35, color: '#f7931a' },
    { name: 'Ethereum', value: 28, color: '#627eea' },
    { name: 'USDT', value: 20, color: '#26a17b' },
    { name: 'Other Crypto', value: 17, color: '#8b5cf6' },
  ];

  const topCelebrities = [
    { name: 'Taylor Swift', bookings: 23, revenue: 345000, growth: 15.2 },
    { name: 'Robert Downey Jr.', bookings: 18, revenue: 287000, growth: 8.7 },
    { name: 'Beyoncé', bookings: 16, revenue: 256000, growth: 22.1 },
    { name: 'Leonardo DiCaprio', bookings: 14, revenue: 234000, growth: 6.3 },
    { name: 'Scarlett Johansson', bookings: 12, revenue: 198000, growth: 11.4 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.dataKey === 'revenue' ? `$${entry.value.toLocaleString()}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mobile-container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="mobile-heading font-bold text-foreground">
            Platform Metrics
          </h1>
          <p className="mobile-text text-muted-foreground">
            Comprehensive analytics and performance insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="touch-target">
            <Filter className="h-4 w-4 mr-2" />
            <span className="sr-only-mobile">Filters</span>
          </Button>
          <Button variant="outline" size="sm" className="touch-target">
            <Download className="h-4 w-4 mr-2" />
            <span className="sr-only-mobile">Export</span>
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="mobile-grid">
        <QuickStatCard
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: metrics.revenueGrowth, isPositive: metrics.revenueGrowth > 0 }}
        />
        
        <QuickStatCard
          title="Total Bookings"
          value={metrics.totalBookings.toLocaleString()}
          icon={Calendar}
          trend={{ value: metrics.bookingsGrowth, isPositive: metrics.bookingsGrowth > 0 }}
        />
        
        <QuickStatCard
          title="Platform Users"
          value={metrics.totalUsers.toLocaleString()}
          icon={Users}
          trend={{ value: metrics.usersGrowth, isPositive: metrics.usersGrowth > 0 }}
        />
        
        <QuickStatCard
          title="Avg Booking Value"
          value={`$${metrics.avgBookingValue.toLocaleString()}`}
          icon={TrendingUp}
          trend={{ value: metrics.bookingValueGrowth, isPositive: metrics.bookingValueGrowth > 0 }}
        />
        
        <QuickStatCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          icon={Eye}
          trend={{ value: metrics.conversionGrowth, isPositive: metrics.conversionGrowth > 0 }}
        />
        
        <QuickStatCard
          title="User Retention"
          value={`${metrics.userRetention}%`}
          icon={CheckCircle}
          trend={{ value: metrics.retentionGrowth, isPositive: metrics.retentionGrowth > 0 }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Monthly revenue performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="period" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Booking Activity
            </CardTitle>
            <CardDescription>Monthly booking volume and completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="period" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="bookings"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completionRate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Booking Categories
            </CardTitle>
            <CardDescription>Distribution by celebrity category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              Payment Distribution
            </CardTitle>
            <CardDescription>Payment methods used by customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Performing Celebrities
          </CardTitle>
          <CardDescription>Highest earning celebrities this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCelebrities.map((celebrity, index) => (
              <div key={celebrity.name} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{celebrity.name}</p>
                    <p className="text-sm text-muted-foreground">{celebrity.bookings} bookings</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${celebrity.revenue.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end">
                    {celebrity.growth > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs ${
                      celebrity.growth > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {celebrity.growth > 0 ? '+' : ''}{celebrity.growth}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Time</p>
                <p className="text-2xl font-bold">2.4s</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-4">
              <Progress value={76} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">24% faster than last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Uptime</p>
                <p className="text-2xl font-bold">99.9%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-4">
              <Progress value={99.9} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">Excellent reliability</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold">1,247</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-4">
              <Progress value={67} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">Peak: 1,850 sessions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">0.02%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <div className="mt-4">
              <Progress value={2} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">Well below 1% target</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMetrics;