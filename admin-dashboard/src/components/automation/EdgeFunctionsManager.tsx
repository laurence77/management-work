import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Mail,
  FileText,
  Calendar,
  BarChart3,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface EdgeFunction {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  lastRun: string;
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  triggers: string[];
  icon: React.ComponentType<any>;
  color: string;
}

interface FunctionLog {
  id: string;
  function_name: string;
  status: 'success' | 'error';
  duration: number;
  timestamp: string;
  input: any;
  output: any;
  error?: string;
}

export const EdgeFunctionsManager = () => {
  const [functions, setFunctions] = useState<EdgeFunction[]>([]);
  const [logs, setLogs] = useState<FunctionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const { toast } = useToast();

  const edgeFunctions: EdgeFunction[] = [
    {
      name: 'booking-notifications',
      description: 'Automated email and push notifications for booking events',
      status: 'active',
      lastRun: '2 minutes ago',
      totalRuns: 1247,
      successRate: 98.2,
      avgDuration: 1.3,
      triggers: ['booking.created', 'booking.confirmed', 'booking.cancelled'],
      icon: Mail,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      name: 'analytics-processor',
      description: 'Real-time analytics processing and metric generation',
      status: 'active',
      lastRun: '30 seconds ago',
      totalRuns: 8932,
      successRate: 99.7,
      avgDuration: 0.8,
      triggers: ['database.insert', 'database.update', 'database.delete'],
      icon: BarChart3,
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'file-processor',
      description: 'File upload processing, compression, and metadata extraction',
      status: 'active',
      lastRun: '5 minutes ago',
      totalRuns: 456,
      successRate: 96.8,
      avgDuration: 4.2,
      triggers: ['file.uploaded', 'manual.trigger'],
      icon: FileText,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      name: 'calendar-sync',
      description: 'Calendar integration and event synchronization',
      status: 'active',
      lastRun: '1 hour ago',
      totalRuns: 234,
      successRate: 94.5,
      avgDuration: 2.1,
      triggers: ['booking.confirmed', 'booking.updated', 'manual.sync'],
      icon: Calendar,
      color: 'bg-yellow-100 text-yellow-800'
    }
  ];

  useEffect(() => {
    loadFunctions();
    loadLogs();
  }, []);

  const loadFunctions = async () => {
    try {
      setLoading(true);
      // In production, this would fetch from Supabase Edge Functions API
      setFunctions(edgeFunctions);
    } catch (error: any) {
      console.error('Failed to load functions:', error);
      toast({
        title: 'Failed to load functions',
        description: error.message || 'Something went wrong.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      // Simulate loading logs
      const mockLogs: FunctionLog[] = [
        {
          id: '1',
          function_name: 'booking-notifications',
          status: 'success',
          duration: 1.2,
          timestamp: new Date(Date.now() - 60000).toISOString(),
          input: { booking_id: 'abc123', type: 'confirmed' },
          output: { emails_sent: 2, notifications_created: 1 }
        },
        {
          id: '2',
          function_name: 'analytics-processor',
          status: 'success',
          duration: 0.7,
          timestamp: new Date(Date.now() - 30000).toISOString(),
          input: { table: 'bookings', event: 'INSERT' },
          output: { metrics_updated: 3 }
        },
        {
          id: '3',
          function_name: 'file-processor',
          status: 'error',
          duration: 3.1,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          input: { file_path: 'uploads/image.jpg', action: 'compress' },
          output: null,
          error: 'File compression failed: Invalid format'
        }
      ];
      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const toggleFunction = async (functionName: string, enable: boolean) => {
    try {
      // In production, call Supabase Edge Functions management API
      console.log(`${enable ? 'Enabling' : 'Disabling'} function:`, functionName);
      
      setFunctions(prev => 
        prev.map(fn => 
          fn.name === functionName 
            ? { ...fn, status: enable ? 'active' : 'inactive' }
            : fn
        )
      );

      toast({
        title: `Function ${enable ? 'Enabled' : 'Disabled'}`,
        description: `${functionName} has been ${enable ? 'enabled' : 'disabled'}.`,
        type: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Function Toggle Failed',
        description: error.message || 'Something went wrong.',
        type: 'error',
      });
    }
  };

  const triggerFunction = async (functionName: string) => {
    try {
      // In production, call the edge function directly
      console.log('Manually triggering function:', functionName);
      
      toast({
        title: 'Function Triggered',
        description: `${functionName} has been manually triggered.`,
        type: 'success',
      });

      // Refresh logs after triggering
      setTimeout(loadLogs, 1000);
    } catch (error: any) {
      toast({
        title: 'Function Trigger Failed',
        description: error.message || 'Something went wrong.',
        type: 'error',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'inactive': return PauseCircle;
      case 'error': return XCircle;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Edge Functions</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading functions..." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edge Functions</h2>
            <p className="text-gray-600">Supabase serverless automation</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Functions Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {functions.map((func) => {
          const Icon = func.icon;
          const StatusIcon = getStatusIcon(func.status);
          
          return (
            <Card key={func.name} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${func.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className={getStatusColor(func.status)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {func.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{func.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{func.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Success Rate</p>
                    <p className="font-semibold">{func.successRate}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg Duration</p>
                    <p className="font-semibold">{func.avgDuration}s</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Runs</p>
                    <p className="font-semibold">{func.totalRuns.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Run</p>
                    <p className="font-semibold">{func.lastRun}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Triggers:</p>
                  <div className="flex flex-wrap gap-1">
                    {func.triggers.map((trigger, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {trigger}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => triggerFunction(func.name)}
                    className="flex-1"
                  >
                    <PlayCircle className="h-3 w-3 mr-1" />
                    Trigger
                  </Button>
                  <Button 
                    size="sm" 
                    variant={func.status === 'active' ? 'destructive' : 'default'}
                    onClick={() => toggleFunction(func.name, func.status !== 'active')}
                    className="flex-1"
                  >
                    {func.status === 'active' ? (
                      <>
                        <PauseCircle className="h-3 w-3 mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3 w-3 mr-1" />
                        Enable
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Function Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Function Logs</span>
            <Badge variant="outline">{logs.length} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No function logs available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium">{log.function_name}</span>
                        <Badge 
                          variant="outline" 
                          className={log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {log.status === 'success' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {log.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {log.duration}s
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Input:</p>
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.input, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-1">
                            {log.status === 'success' ? 'Output:' : 'Error:'}
                          </p>
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                            {log.status === 'success' 
                              ? JSON.stringify(log.output, null, 2)
                              : log.error
                            }
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card className="border-l-4 border-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Supabase Edge Functions</h3>
              <p className="text-sm text-gray-600 mb-3">
                Server-side TypeScript functions that run close to your users for minimal latency. 
                These functions handle automated workflows like notifications, file processing, 
                analytics, and calendar synchronization with built-in authentication and database access.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">TypeScript/JavaScript</Badge>
                <Badge variant="outline" className="text-xs">Deno Runtime</Badge>
                <Badge variant="outline" className="text-xs">Global Distribution</Badge>
                <Badge variant="outline" className="text-xs">Auto Scaling</Badge>
                <Badge variant="outline" className="text-xs">Built-in Auth</Badge>
                <Badge variant="outline" className="text-xs">Database Access</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};