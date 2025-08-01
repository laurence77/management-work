import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Settings,
  AlertTriangle,
  Link,
  Unlink,
  RotateCw,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface CalendarStatus {
  connected: boolean;
  lastSync: string | null;
  email?: string;
  error?: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  htmlLink?: string;
}

interface SyncResult {
  bookingId: number;
  success: boolean;
  eventId?: string;
  error?: string;
}

export const CalendarIntegration = () => {
  const [status, setStatus] = useState<CalendarStatus>({ connected: false, lastSync: null });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const { toast } = useToast();

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch calendar status:', error);
    }
  };

  const fetchCalendarEvents = async () => {
    if (!status.connected) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/events', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectCalendar = async () => {
    try {
      const response = await fetch('/api/calendar/authorize', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Open authorization URL in new window
        window.open(data.authUrl, 'calendar-auth', 'width=500,height=600');
        
        // Poll for connection status
        const pollInterval = setInterval(async () => {
          await fetchCalendarStatus();
          if (status.connected) {
            clearInterval(pollInterval);
            toast({
              title: 'Calendar Connected',
              description: 'Google Calendar has been successfully connected.',
              type: 'success'
            });
          }
        }, 2000);
        
        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect to Google Calendar.',
        type: 'error'
      });
    }
  };

  const disconnectCalendar = async () => {
    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        setStatus({ connected: false, lastSync: null });
        setEvents([]);
        toast({
          title: 'Calendar Disconnected',
          description: 'Google Calendar has been disconnected.',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      toast({
        title: 'Disconnection Failed',
        description: 'Failed to disconnect Google Calendar.',
        type: 'error'
      });
    }
  };

  const syncAllBookings = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/calendar/sync-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSyncResults(data.results || []);
        await fetchCalendarStatus();
        
        const successful = data.results.filter((r: SyncResult) => r.success).length;
        const failed = data.results.filter((r: SyncResult) => !r.success).length;
        
        toast({
          title: 'Sync Complete',
          description: `${successful} bookings synced successfully${failed > 0 ? `, ${failed} failed` : ''}.`,
          type: successful > 0 ? 'success' : 'error'
        });
      }
    } catch (error) {
      console.error('Failed to sync bookings:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync bookings to calendar.',
        type: 'error'
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchCalendarStatus();
  }, []);

  useEffect(() => {
    if (status.connected) {
      fetchCalendarEvents();
    }
  }, [status.connected]);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Google Calendar Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="font-medium">
                  {status.connected ? 'Connected' : 'Not Connected'}
                </p>
                {status.email && (
                  <p className="text-sm text-gray-500">{status.email}</p>
                )}
                {status.lastSync && (
                  <p className="text-sm text-gray-500">
                    Last sync: {new Date(status.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {status.connected ? (
                <>
                  <Button
                    onClick={syncAllBookings}
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RotateCw className="h-4 w-4 mr-2" />
                        Sync All
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={disconnectCalendar}
                    variant="outline"
                    size="sm"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={connectCalendar}>
                  <Link className="h-4 w-4 mr-2" />
                  Connect Calendar
                </Button>
              )}
            </div>
          </div>

          {status.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          )}

          {!status.connected && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Connect your Google Calendar to automatically sync booking events and check for conflicts.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <span>Sync Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      Booking #{result.bookingId}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Synced
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        Failed
                      </Badge>
                    )}
                    {result.error && (
                      <span className="text-xs text-gray-500">{result.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Calendar Events */}
      {status.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Upcoming Events</span>
              </div>
              <Button
                onClick={fetchCalendarEvents}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading events...</span>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{event.summary}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.start).toLocaleDateString()} at{' '}
                        {new Date(event.start).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {event.location && (
                        <p className="text-sm text-gray-500">{event.location}</p>
                      )}
                    </div>
                    {event.htmlLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(event.htmlLink, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {events.length > 5 && (
                  <div className="text-center pt-3">
                    <Button
                      variant="outline"
                      onClick={() => window.open('https://calendar.google.com', '_blank')}
                    >
                      View All Events
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming events found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Calendar Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-medium">Auto-Sync Bookings</h3>
              </div>
              <p className="text-sm text-gray-600">
                Automatically create calendar events when bookings are confirmed
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-medium">Conflict Detection</h3>
              </div>
              <p className="text-sm text-gray-600">
                Check for scheduling conflicts before confirming bookings
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-medium">Email Reminders</h3>
              </div>
              <p className="text-sm text-gray-600">
                Automatic email reminders before booking events
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-medium">Real-time Updates</h3>
              </div>
              <p className="text-sm text-gray-600">
                Calendar events update automatically when bookings change
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};