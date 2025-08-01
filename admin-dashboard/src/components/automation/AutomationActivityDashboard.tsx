import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Activity, 
  Mail, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  ShoppingCart,
  UserX
} from 'lucide-react';
import { api } from '../../lib/api';

interface AutomationActivity {
  activity_type: 'booking' | 'user_behavior' | 'email_notification';
  reference_id: string;
  user_identifier: string;
  current_status: string;
  value: string;
  automation_action: string;
  activity_time: string;
  details: any;
}

interface ActivityStats {
  total_bookings: number;
  auto_approved: number;
  high_value_alerts: number;
  abandoned_bookings: number;
  emails_sent: number;
  conversion_rate: number;
  avg_response_time: number;
}

export const AutomationActivityDashboard: React.FC = () => {
  const [activities, setActivities] = useState<AutomationActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
    
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      const [activitiesData, statsData] = await Promise.all([
        api.getAutomationActivities(),
        api.getAutomationStats()
      ]);
      
      setActivities(activitiesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string, action: string) => {
    switch (type) {
      case 'booking':
        return action === 'auto_approved' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
               action === 'high_value_review' ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
               <Clock className="h-4 w-4 text-yellow-500" />;
      case 'user_behavior':
        return action === 'conversion_success' ? <TrendingUp className="h-4 w-4 text-green-500" /> :
               action === 'recovery_needed' ? <UserX className="h-4 w-4 text-red-500" /> :
               action === 'high_interest' ? <Eye className="h-4 w-4 text-blue-500" /> :
               <Users className="h-4 w-4 text-gray-500" />;
      case 'email_notification':
        return <Mail className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityBadge = (type: string, action: string) => {
    const variants = {
      auto_approved: 'default',
      high_value_review: 'destructive',
      recovery_needed: 'destructive',
      conversion_success: 'default',
      high_interest: 'secondary',
      email_sent: 'outline'
    };
    
    return (
      <Badge variant={variants[action as keyof typeof variants] || 'outline'}>
        {action.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatValue = (value: string, type: string) => {
    if (type === 'booking' && value && !isNaN(Number(value))) {
      return `$${Number(value).toLocaleString()}`;
    }
    return value;
  };

  const filteredActivities = activities.filter(activity => {
    switch (activeTab) {
      case 'bookings':
        return activity.activity_type === 'booking';
      case 'behavior':
        return activity.activity_type === 'user_behavior';
      case 'emails':
        return activity.activity_type === 'email_notification';
      default:
        return true;
    }
  });

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading automation data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Automation Activity Dashboard</h2>
          <p className="text-gray-600">Real-time view of all automated processes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
          <Button onClick={loadData} size="sm" variant="outline">
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold">{stats.total_bookings}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Auto-Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.auto_approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Value Alerts</p>
                  <p className="text-2xl font-bold text-red-600">{stats.high_value_alerts}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Emails Sent</p>
                  <p className="text-2xl font-bold">{stats.emails_sent}</p>
                </div>
                <Mail className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">All Activity</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="behavior">User Behavior</TabsTrigger>
              <TabsTrigger value="emails">Email Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No activity found for this category
                  </div>
                ) : (
                  filteredActivities.map((activity, index) => (
                    <div
                      key={`${activity.activity_type}-${activity.reference_id}-${index}`}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        {getActivityIcon(activity.activity_type, activity.automation_action)}
                        <div>
                          <div className="font-medium">
                            {activity.activity_type === 'booking' && 'Booking '}
                            {activity.activity_type === 'user_behavior' && 'User '}
                            {activity.activity_type === 'email_notification' && 'Email '}
                            #{activity.reference_id}
                          </div>
                          <div className="text-sm text-gray-600">
                            {activity.user_identifier}
                          </div>
                          {activity.details && activity.activity_type === 'booking' && (
                            <div className="text-xs text-gray-500">
                              {activity.details.celebrity} • {activity.details.event_type}
                            </div>
                          )}
                          {activity.details && activity.activity_type === 'user_behavior' && (
                            <div className="text-xs text-gray-500">
                              {activity.current_status} • {activity.details.celebrity_name || 'Unknown Celebrity'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {formatValue(activity.value, activity.activity_type)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(activity.activity_time).toLocaleString()}
                          </div>
                        </div>
                        {getActivityBadge(activity.activity_type, activity.automation_action)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <Eye className="h-4 w-4 mr-2" />
              View All Bookings
            </Button>
            <Button variant="outline" className="justify-start">
              <Users className="h-4 w-4 mr-2" />
              User Journey Analytics
            </Button>
            <Button variant="outline" className="justify-start">
              <Mail className="h-4 w-4 mr-2" />
              Email Campaign Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};