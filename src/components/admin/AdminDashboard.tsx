import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Star, 
  Bell,
  Settings,
  Filter,
  Download,
  RefreshCw,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuickStatCard, MobileCard, MobileCardHeader, MobileCardTitle, MobileCardContent } from '@/components/ui/mobile-card';

interface DashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
  totalBookings: number;
  bookingsGrowth: number;
  activeUsers: number;
  usersGrowth: number;
  completionRate: number;
  completionGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'booking' | 'payment' | 'user' | 'celebrity';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error' | 'warning';
  amount?: number;
}

interface BookingMetrics {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 892750,
    revenueGrowth: 12.5,
    totalBookings: 1247,
    bookingsGrowth: 8.3,
    activeUsers: 3892,
    usersGrowth: 15.2,
    completionRate: 94.7,
    completionGrowth: 2.1
  });

  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  const recentActivity: RecentActivity[] = [
    {
      id: '1',
      type: 'booking',
      title: 'New VIP Booking',
      description: 'John Doe booked Taylor Swift for private event',
      timestamp: '2 minutes ago',
      status: 'success',
      amount: 75000
    },
    {
      id: '2',
      type: 'payment',
      title: 'Payment Verified',
      description: 'Crypto payment confirmed for booking #BKG-2024-001',
      timestamp: '5 minutes ago',
      status: 'success',
      amount: 45000
    },
    {
      id: '3',
      type: 'user',
      title: 'New Premium User',
      description: 'Sarah Johnson upgraded to VIP membership',
      timestamp: '12 minutes ago',
      status: 'success'
    },
    {
      id: '4',
      type: 'celebrity',
      title: 'Availability Updated',
      description: 'Robert Downey Jr. updated calendar availability',
      timestamp: '18 minutes ago',
      status: 'pending'
    },
    {
      id: '5',
      type: 'payment',
      title: 'Payment Issue',
      description: 'Transaction verification failed for booking #BKG-2024-002',
      timestamp: '23 minutes ago',
      status: 'error',
      amount: 28000
    }
  ];

  const bookingMetrics: BookingMetrics[] = [
    { status: 'Confirmed', count: 687, percentage: 55.1, color: 'bg-green-500' },
    { status: 'Pending', count: 312, percentage: 25.0, color: 'bg-yellow-500' },
    { status: 'Completed', count: 203, percentage: 16.3, color: 'bg-blue-500' },
    { status: 'Cancelled', count: 45, percentage: 3.6, color: 'bg-red-500' }
  ];

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    
    return variants[status as keyof typeof variants] || variants.pending;
  };

  return (
    <div className="mobile-container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="mobile-heading font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="mobile-text text-muted-foreground">
            Monitor your platform performance and manage operations
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
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
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="touch-target"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only-mobile ml-2">Refresh</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="touch-target">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Dashboard Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mobile-grid">
        <QuickStatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: stats.revenueGrowth, isPositive: stats.revenueGrowth > 0 }}
        />
        
        <QuickStatCard
          title="Total Bookings"
          value={stats.totalBookings.toLocaleString()}
          icon={Calendar}
          trend={{ value: stats.bookingsGrowth, isPositive: stats.bookingsGrowth > 0 }}
        />
        
        <QuickStatCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          icon={Users}
          trend={{ value: stats.usersGrowth, isPositive: stats.usersGrowth > 0 }}
        />
        
        <QuickStatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={TrendingUp}
          trend={{ value: stats.completionGrowth, isPositive: stats.completionGrowth > 0 }}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="finances">Finances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Status Distribution */}
            <MobileCard>
              <MobileCardHeader icon={Calendar}>
                <MobileCardTitle>Booking Distribution</MobileCardTitle>
              </MobileCardHeader>
              <MobileCardContent>
                <div className="space-y-4">
                  {bookingMetrics.map((metric) => (
                    <div key={metric.status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${metric.color}`} />
                        <span className="mobile-text font-medium">{metric.status}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24">
                          <Progress value={metric.percentage} className="h-2" />
                        </div>
                        <span className="mobile-text text-muted-foreground w-12 text-right">
                          {metric.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </MobileCardContent>
            </MobileCard>

            {/* Recent Activity */}
            <MobileCard>
              <MobileCardHeader icon={Bell}>
                <MobileCardTitle>Recent Activity</MobileCardTitle>
              </MobileCardHeader>
              <MobileCardContent>
                <div className="space-y-4">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(activity.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {activity.timestamp}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                        {activity.amount && (
                          <p className="text-xs font-semibold text-primary mt-1">
                            ${activity.amount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </MobileCardContent>
            </MobileCard>
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MobileCard>
                <MobileCardHeader>
                  <MobileCardTitle>Booking Management</MobileCardTitle>
                </MobileCardHeader>
                <MobileCardContent>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button className="btn-luxury">View All Bookings</Button>
                      <Button variant="outline">Pending Approvals</Button>
                      <Button variant="outline">Payment Issues</Button>
                    </div>
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select an action above to manage bookings</p>
                    </div>
                  </div>
                </MobileCardContent>
              </MobileCard>
            </div>
            
            <div>
              <MobileCard>
                <MobileCardHeader>
                  <MobileCardTitle>Quick Actions</MobileCardTitle>
                </MobileCardHeader>
                <MobileCardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Bookings
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Bookings
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Refund Requests
                    </Button>
                  </div>
                </MobileCardContent>
              </MobileCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <MobileCard>
            <MobileCardHeader icon={Users}>
              <MobileCardTitle>User Management</MobileCardTitle>
            </MobileCardHeader>
            <MobileCardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold text-primary">3,892</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
                <div className="text-center p-4 bg-green-500/5 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">487</div>
                  <div className="text-sm text-muted-foreground">VIP Members</div>
                </div>
                <div className="text-center p-4 bg-blue-500/5 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">1,234</div>
                  <div className="text-sm text-muted-foreground">Active This Month</div>
                </div>
                <div className="text-center p-4 bg-orange-500/5 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">156</div>
                  <div className="text-sm text-muted-foreground">New This Week</div>
                </div>
              </div>
            </MobileCardContent>
          </MobileCard>
        </TabsContent>

        <TabsContent value="finances" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MobileCard>
              <MobileCardHeader icon={DollarSign}>
                <MobileCardTitle>Revenue Overview</MobileCardTitle>
              </MobileCardHeader>
              <MobileCardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="text-lg font-semibold">$234,567</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Month</span>
                    <span className="text-lg font-semibold">$198,432</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Growth</span>
                    <span className="text-lg font-semibold text-green-600">+18.2%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
              </MobileCardContent>
            </MobileCard>
            
            <MobileCard>
              <MobileCardHeader>
                <MobileCardTitle>Payment Methods</MobileCardTitle>
              </MobileCardHeader>
              <MobileCardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Crypto Payments</span>
                    <span className="text-sm font-medium">68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bank Transfers</span>
                    <span className="text-sm font-medium">32%</span>
                  </div>
                  <Progress value={32} className="h-2" />
                </div>
              </MobileCardContent>
            </MobileCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;