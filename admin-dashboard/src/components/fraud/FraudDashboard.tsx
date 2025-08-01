import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Eye,
  Ban,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { useToast } from '@/hooks/useToast';

interface FraudStatistics {
  total_assessments: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  average_risk_score: number;
  fraud_rate: number;
  blocked_bookings: number;
}

interface FraudTrend {
  date: string;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface FraudAlert {
  id: number;
  severity: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  booking_id?: number;
  bookings?: {
    client_email: string;
    client_name: string;
    celebrity_name: string;
    budget: number;
  };
}

const RISK_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981'
};

export const FraudDashboard = () => {
  const [statistics, setStatistics] = useState<FraudStatistics | null>(null);
  const [trends, setTrends] = useState<FraudTrend[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/fraud/statistics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
        setAlerts(data.recent_alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch fraud statistics:', error);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await fetch('/api/fraud/trends?days=30', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrends(data.trends || []);
      }
    } catch (error) {
      console.error('Failed to fetch fraud trends:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchStatistics(), fetchTrends()]);
    setRefreshing(false);
  };

  const markAlertAsRead = async (alertId: number) => {
    try {
      const response = await fetch(`/api/fraud/alerts/${alertId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        ));
      }
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const runBatchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fraud/batch-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ limit: 100 })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Batch Analysis Complete',
          description: data.message,
          type: 'success'
        });
        await refreshData();
      } else {
        throw new Error('Failed to run batch analysis');
      }
    } catch (error) {
      console.error('Batch analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to run batch fraud analysis.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'MEDIUM':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRiskDistributionData = () => {
    if (!statistics) return [];
    
    return [
      { name: 'High Risk', value: statistics.high_risk, color: RISK_COLORS.HIGH },
      { name: 'Medium Risk', value: statistics.medium_risk, color: RISK_COLORS.MEDIUM },
      { name: 'Low Risk', value: statistics.low_risk, color: RISK_COLORS.LOW }
    ];
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span>Fraud Detection</span>
          </h1>
          <p className="text-gray-600 mt-1">Monitor and prevent fraudulent booking activities</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          
          <Button
            onClick={runBatchAnalysis}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            Run Analysis
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Total Assessments</span>
              </div>
              <p className="text-2xl font-bold mt-2">{statistics.total_assessments.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-600">High Risk</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-red-600">{statistics.high_risk}</p>
              <p className="text-sm text-gray-500">{statistics.fraud_rate}% fraud rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-600">Avg Risk Score</span>
              </div>
              <p className="text-2xl font-bold mt-2">{statistics.average_risk_score}</p>
              <p className="text-sm text-gray-500">out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Ban className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-600">Auto Blocked</span>
              </div>
              <p className="text-2xl font-bold mt-2">{statistics.blocked_bookings}</p>
              <p className="text-sm text-gray-500">bookings blocked</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getRiskDistributionData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {getRiskDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Fraud Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {alerts.length > 0 ? (
                    alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 border rounded-lg ${!alert.is_read ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            {getSeverityIcon(alert.severity)}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{alert.title}</p>
                              <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(alert.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {!alert.is_read && (
                            <Button
                              onClick={() => markAlertAsRead(alert.id)}
                              size="sm"
                              variant="outline"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recent fraud alerts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Detection Trends (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value, name) => [value, name === 'high' ? 'High Risk' : name === 'medium' ? 'Medium Risk' : 'Low Risk']}
                  />
                  <Line type="monotone" dataKey="high" stroke={RISK_COLORS.HIGH} strokeWidth={2} />
                  <Line type="monotone" dataKey="medium" stroke={RISK_COLORS.MEDIUM} strokeWidth={2} />
                  <Line type="monotone" dataKey="low" stroke={RISK_COLORS.LOW} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Assessment Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Fraud Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg ${!alert.is_read ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge variant={alert.severity === 'HIGH' ? 'destructive' : 'secondary'}>
                              {alert.severity}
                            </Badge>
                            {!alert.is_read && (
                              <Badge variant="outline">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          {alert.bookings && (
                            <div className="mt-2 text-sm text-gray-500">
                              <p>Client: {alert.bookings.client_name} ({alert.bookings.client_email})</p>
                              <p>Celebrity: {alert.bookings.celebrity_name}</p>
                              <p>Budget: {formatCurrency(alert.bookings.budget)}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {alert.booking_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `/bookings/${alert.booking_id}`}
                          >
                            View Booking
                          </Button>
                        )}
                        {!alert.is_read && (
                          <Button
                            onClick={() => markAlertAsRead(alert.id)}
                            size="sm"
                            variant="outline"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {alerts.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No fraud alerts</p>
                    <p>Your system is secure with no suspicious activities detected.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};