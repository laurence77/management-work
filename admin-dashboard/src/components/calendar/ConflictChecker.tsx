import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  CheckCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface ConflictEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
}

interface ConflictResult {
  hasConflicts: boolean;
  conflicts: ConflictEvent[];
}

interface ConflictCheckerProps {
  initialDate?: string;
  initialDuration?: number;
  onConflictCheck?: (result: ConflictResult) => void;
}

export const ConflictChecker = ({ 
  initialDate = '', 
  initialDuration = 2,
  onConflictCheck 
}: ConflictCheckerProps) => {
  const [eventDate, setEventDate] = useState(initialDate);
  const [duration, setDuration] = useState(initialDuration);
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictResult | null>(null);
  const { toast } = useToast();

  const checkConflicts = async () => {
    if (!eventDate) {
      toast({
        title: 'Date Required',
        description: 'Please select an event date to check for conflicts.',
        type: 'error'
      });
      return;
    }

    try {
      setChecking(true);
      const response = await fetch('/api/calendar/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventDate: new Date(eventDate).toISOString(),
          duration
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts);
        onConflictCheck?.(data.conflicts);

        if (data.conflicts.hasConflicts) {
          toast({
            title: 'Conflicts Found',
            description: `Found ${data.conflicts.conflicts.length} scheduling conflict(s).`,
            type: 'warning'
          });
        } else {
          toast({
            title: 'No Conflicts',
            description: 'No scheduling conflicts found for this time slot.',
            type: 'success'
          });
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check conflicts');
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error);
      toast({
        title: 'Check Failed',
        description: error instanceof Error ? error.message : 'Failed to check for conflicts.',
        type: 'error'
      });
    } finally {
      setChecking(false);
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getEndTime = () => {
    if (!eventDate) return '';
    const startTime = new Date(eventDate);
    const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));
    return endTime.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (initialDate) {
      setEventDate(initialDate);
    }
  }, [initialDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Conflict Checker</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="eventDate">Event Date & Time</Label>
            <Input
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          
          <div>
            <Label htmlFor="duration">Duration (hours)</Label>
            <Input
              id="duration"
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
        </div>

        {eventDate && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                Event: {formatDateTime(eventDate).date} at {formatDateTime(eventDate).time}
                {getEndTime() && ` - ${formatDateTime(getEndTime()).time}`}
              </span>
            </div>
          </div>
        )}

        <Button 
          onClick={checkConflicts}
          disabled={checking || !eventDate}
          className="w-full"
        >
          {checking ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking Conflicts...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Check for Conflicts
            </>
          )}
        </Button>

        {conflicts && (
          <div className="space-y-3">
            {conflicts.hasConflicts ? (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {conflicts.conflicts.length} scheduling conflict(s) for this time slot.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Conflicting Events:</h4>
                  {conflicts.conflicts.map((conflict, index) => (
                    <div key={index} className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-red-900">{conflict.summary}</p>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-red-700">
                            <span>
                              {formatDateTime(conflict.start).date} at {formatDateTime(conflict.start).time}
                            </span>
                            <span>-</span>
                            <span>
                              {formatDateTime(conflict.end).time}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          Conflict
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Consider rescheduling this booking to avoid conflicts, or check if the existing events can be moved.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  No scheduling conflicts found for this time slot. The event can be safely scheduled.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm mb-2">Quick Tips:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Check conflicts before confirming any booking</li>
            <li>• Consider buffer time before and after events</li>
            <li>• Account for travel time between venues</li>
            <li>• Check both personal and business calendars</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};