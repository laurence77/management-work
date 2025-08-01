import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Users, 
  MessageSquare, 
  TrendingUp,
  Zap,
  Wifi,
  WifiOff,
  Bell,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useRealtimeSubscription, useMultipleRealtimeSubscriptions } from '@/hooks/useRealtimeSubscription';
import { supabase, realtimeHelpers } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';

interface RealtimeEvent {
  id: string;
  type: 'booking_created' | 'booking_updated' | 'celebrity_updated' | 'chat_message' | 'user_online';
  title: string;
  description: string;
  timestamp: string;
  data: any;
}

export const RealtimeDashboard = () => {
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({});
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
  const { toast } = useToast();

  // Set up multiple realtime subscriptions
  const { connections } = useMultipleRealtimeSubscriptions([
    {
      options: { table: 'bookings', event: '*' },
      callback: (payload) => handleRealtimeEvent('bookings', payload),
    },
    {
      options: { table: 'celebrities', event: '*' },
      callback: (payload) => handleRealtimeEvent('celebrities', payload),
    },
    {
      options: { table: 'chat_messages', event: '*' },
      callback: (payload) => handleRealtimeEvent('chat_messages', payload),
    },
    {
      options: { table: 'app_users', event: '*' },
      callback: (payload) => handleRealtimeEvent('app_users', payload),
    },
  ]);

  useEffect(() => {
    // Update connection status
    const status: Record<string, boolean> = {};
    connections.forEach(conn => {
      status[conn.table] = conn.isConnected;
    });
    setConnectionStatus(status);
  }, [connections]);

  const handleRealtimeEvent = (table: string, payload: any) => {
    console.log(`Realtime event from ${table}:`, payload);

    const eventId = `${table}_${payload.eventType}_${Date.now()}`;
    let eventTitle = '';
    let eventDescription = '';
    let eventType: RealtimeEvent['type'] = 'booking_created';

    switch (table) {
      case 'bookings':
        if (payload.eventType === 'INSERT') {
          eventTitle = 'New Booking Created';
          eventDescription = `Booking for "${payload.new.event_name}" has been created`;
          eventType = 'booking_created';
        } else if (payload.eventType === 'UPDATE') {
          eventTitle = 'Booking Updated';
          eventDescription = `Booking "${payload.new.event_name}" status changed to ${payload.new.status}`;
          eventType = 'booking_updated';
        }
        break;

      case 'celebrities':
        if (payload.eventType === 'UPDATE') {
          eventTitle = 'Celebrity Profile Updated';
          eventDescription = `${payload.new.name} profile has been modified`;
          eventType = 'celebrity_updated';
        }
        break;

      case 'chat_messages':
        if (payload.eventType === 'INSERT') {
          eventTitle = 'New Chat Message';
          eventDescription = `New message in chat room`;
          eventType = 'chat_message';
        }
        break;

      case 'app_users':
        if (payload.eventType === 'UPDATE' && payload.new.last_activity) {
          eventTitle = 'User Activity';
          eventDescription = `User ${payload.new.first_name} ${payload.new.last_name} is active`;
          eventType = 'user_online';
        }
        break;
    }

    const newEvent: RealtimeEvent = {
      id: eventId,
      type: eventType,
      title: eventTitle,
      description: eventDescription,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    setRealtimeEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events

    // Show toast notification for important events
    if (['booking_created', 'booking_updated'].includes(eventType)) {
      toast({
        title: eventTitle,
        description: eventDescription,
        type: 'info',
      });
    }
  };

  const toggleRealtime = () => {
    setIsRealtimeEnabled(!isRealtimeEnabled);
    // Implementation would handle enabling/disabling subscriptions
  };

  const clearEvents = () => {
    setRealtimeEvents([]);
  };

  const getEventIcon = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'booking_created':
      case 'booking_updated':
        return <Calendar className="h-4 w-4" />;
      case 'celebrity_updated':
        return <Users className="h-4 w-4" />;
      case 'chat_message':
        return <MessageSquare className="h-4 w-4" />;
      case 'user_online':
        return <Activity className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'booking_created':
        return 'bg-green-100 text-green-800';
      case 'booking_updated':
        return 'bg-blue-100 text-blue-800';
      case 'celebrity_updated':
        return 'bg-purple-100 text-purple-800';
      case 'chat_message':
        return 'bg-yellow-100 text-yellow-800';
      case 'user_online':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const overallConnectionStatus = Object.values(connectionStatus).some(connected => connected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Realtime Dashboard</h2>
            <p className="text-gray-600">Live updates across the platform</p>
          </div>
          <Badge 
            variant="outline" 
            className={
              overallConnectionStatus 
                ? "bg-green-100 text-green-800 border-green-300" 
                : "bg-red-100 text-red-800 border-red-300"
            }
          >
            {overallConnectionStatus ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearEvents}
          >
            Clear Events
          </Button>
          <Button 
            variant={isRealtimeEnabled ? "default" : "outline"}
            size="sm" 
            onClick={toggleRealtime}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isRealtimeEnabled ? 'Disable' : 'Enable'} Realtime
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(connectionStatus).map(([table, isConnected]) => (
          <Card key={table}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium capitalize">{table.replace('_', ' ')}</p>
                  <p className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Realtime Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Live Events</span>
                </CardTitle>
                <Badge variant="outline">
                  {realtimeEvents.length} events
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {realtimeEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No realtime events yet</p>
                    <p className="text-sm">Events will appear here as they happen</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {realtimeEvents.map((event) => (
                      <div key={event.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                {event.title}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {event.description}
                            </p>
                            <Badge 
                              variant="outline" 
                              className={`mt-2 text-xs ${getEventColor(event.type)}`}
                            >
                              {event.type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics and Info */}
        <div className="space-y-4">
          {/* Event Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(
                realtimeEvents.reduce((acc, event) => {
                  acc[event.type] = (acc[event.type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Realtime Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Realtime Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Live Bookings</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Chat Messages</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">User Presence</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Analytics Updates</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Notifications</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Technical Info */}
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Supabase Realtime</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Real-time subscriptions to PostgreSQL changes with Row Level Security (RLS) 
                    ensuring users only see data they're authorized to access.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">PostgreSQL Changes</Badge>
                    <Badge variant="outline" className="text-xs">RLS Security</Badge>
                    <Badge variant="outline" className="text-xs">WebSockets</Badge>
                    <Badge variant="outline" className="text-xs">Presence</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};