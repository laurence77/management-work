import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Clock, 
  Bell, 
  Palette, 
  Globe,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface CalendarSettings {
  autoSync: boolean;
  reminderMinutes: number;
  timezone: string;
  colorId: string;
}

const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 1440, label: '1 day' },
  { value: 2880, label: '2 days' }
];

const COLOR_OPTIONS = [
  { value: '1', label: 'Lavender', color: '#7986cb' },
  { value: '2', label: 'Sage', color: '#33b679' },
  { value: '3', label: 'Grape', color: '#8e24aa' },
  { value: '4', label: 'Flamingo', color: '#e67c73' },
  { value: '5', label: 'Banana', color: '#f6c026' },
  { value: '6', label: 'Tangerine', color: '#f5511d' },
  { value: '7', label: 'Peacock', color: '#039be5' },
  { value: '8', label: 'Graphite', color: '#616161' },
  { value: '9', label: 'Blueberry', color: '#3f51b5' },
  { value: '10', label: 'Basil', color: '#0b8043' },
  { value: '11', label: 'Tomato', color: '#d50000' }
];

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST/AEDT)' }
];

export const CalendarSettings = () => {
  const [settings, setSettings] = useState<CalendarSettings>({
    autoSync: true,
    reminderMinutes: 60,
    timezone: 'America/New_York',
    colorId: '11'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/calendar', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings({
          autoSync: data.calendar_auto_sync ?? true,
          reminderMinutes: data.calendar_reminder_minutes ?? 60,
          timezone: data.calendar_timezone ?? 'America/New_York',
          colorId: data.calendar_color_id ?? '11'
        });
      }
    } catch (error) {
      console.error('Failed to fetch calendar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings/calendar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          calendar_auto_sync: settings.autoSync,
          calendar_reminder_minutes: settings.reminderMinutes,
          calendar_timezone: settings.timezone,
          calendar_color_id: settings.colorId
        })
      });

      if (response.ok) {
        toast({
          title: 'Settings Saved',
          description: 'Calendar settings have been updated successfully.',
          type: 'success'
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save calendar settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save calendar settings.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: keyof CalendarSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Calendar Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-Sync Setting */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">Auto-Sync Bookings</Label>
            <p className="text-sm text-gray-500">
              Automatically create calendar events when bookings are confirmed
            </p>
          </div>
          <Switch
            checked={settings.autoSync}
            onCheckedChange={(checked) => handleSettingChange('autoSync', checked)}
          />
        </div>

        <Separator />

        {/* Reminder Settings */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <Label className="text-base font-medium">Default Reminder</Label>
          </div>
          <p className="text-sm text-gray-500">
            How long before events should reminders be sent
          </p>
          <Select
            value={settings.reminderMinutes.toString()}
            onValueChange={(value) => handleSettingChange('reminderMinutes', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Timezone Settings */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <Label className="text-base font-medium">Default Timezone</Label>
          </div>
          <p className="text-sm text-gray-500">
            Default timezone for new calendar events
          </p>
          <Select
            value={settings.timezone}
            onValueChange={(value) => handleSettingChange('timezone', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Color Settings */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <Label className="text-base font-medium">Event Color</Label>
          </div>
          <p className="text-sm text-gray-500">
            Default color for booking events in your calendar
          </p>
          <Select
            value={settings.colorId}
            onValueChange={(value) => handleSettingChange('colorId', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: option.color }}
                    />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Current Settings Preview */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">Current Settings:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>Auto-sync: {settings.autoSync ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Bell className="h-3 w-3" />
              <span>
                Reminders: {REMINDER_OPTIONS.find(r => r.value === settings.reminderMinutes)?.label}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-3 w-3" />
              <span>
                Timezone: {TIMEZONE_OPTIONS.find(tz => tz.value === settings.timezone)?.label}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Palette className="h-3 w-3" />
              <span>
                Color: {COLOR_OPTIONS.find(c => c.value === settings.colorId)?.label}
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={saveSettings}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};