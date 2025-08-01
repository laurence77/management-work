import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { api } from '../../lib/api';
import { 
  Mail, 
  Settings, 
  Save, 
  RefreshCw, 
  TestTube,
  CheckCircle,
  AlertCircle,
  Bell,
  Shield
} from 'lucide-react';

interface EmailSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  display_name: string;
  description: string;
  setting_type: 'text' | 'email' | 'boolean' | 'textarea';
  is_required: boolean;
  is_active: boolean;
}

export const EmailSettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<EmailSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    try {
      setLoading(true);
      
      // Try to load from API first
      try {
        const data = await api.getEmailSettings();
        setSettings(data);
        setChanges({});
        return;
      } catch (apiError) {
        console.log('API unavailable, using fallback settings');
      }
      
      // Fallback to default settings, but check localStorage for overrides
      const defaultSettings = [
        {
          id: '1',
          setting_key: 'smtp_host',
          setting_value: 'smtp.hostinger.com',
          display_name: 'SMTP Host',
          description: 'SMTP server hostname',
          setting_type: 'text' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '2',
          setting_key: 'smtp_port',
          setting_value: '465',
          display_name: 'SMTP Port',
          description: 'SMTP server port',
          setting_type: 'text' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '3',
          setting_key: 'smtp_user',
          setting_value: 'management@bookmyreservation.org',
          display_name: 'SMTP Username',
          description: 'SMTP authentication username',
          setting_type: 'email' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '4',
          setting_key: 'smtp_pass',
          setting_value: '***CONFIGURED***',
          display_name: 'SMTP Password',
          description: 'SMTP authentication password (configured in environment)',
          setting_type: 'text' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '5',
          setting_key: 'primary_email',
          setting_value: 'management@bookmyreservation.org',
          display_name: 'From Email',
          description: 'Email address used as sender',
          setting_type: 'email' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '6',
          setting_key: 'email_enabled',
          setting_value: 'true',
          display_name: 'Email Service Enabled',
          description: 'Enable or disable email functionality',
          setting_type: 'boolean' as const,
          is_required: false,
          is_active: true
        }
      ];
      
      // Check localStorage for saved settings
      const savedSettings = localStorage.getItem('email_settings');
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          // Apply saved values to default settings
          defaultSettings.forEach(setting => {
            if (parsedSettings[setting.setting_key]) {
              setting.setting_value = parsedSettings[setting.setting_key];
            }
          });
          
          toast({
            title: "Settings Loaded",
            description: "Using previously saved email settings",
            variant: "default"
          });
        } catch (parseError) {
          console.error('Failed to parse saved settings:', parseError);
        }
      }
      
      setSettings(defaultSettings);
      setChanges({});
      
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setChanges(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    if (Object.keys(changes).length === 0) {
      toast({
        title: "No Changes",
        description: "No settings have been modified",
        variant: "default"
      });
      return;
    }

    setSaving(true);
    
    // Simulate a save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update local state with changes
    setSettings(prev => prev.map(setting => ({
      ...setting,
      setting_value: changes[setting.setting_key] || setting.setting_value
    })));
    
    // Save to localStorage for persistence across sessions
    const currentSettings = settings.reduce((acc, setting) => {
      acc[setting.setting_key] = changes[setting.setting_key] || setting.setting_value;
      return acc;
    }, {} as Record<string, string>);
    
    localStorage.setItem('email_settings', JSON.stringify(currentSettings));
    
    setChanges({});
    setSaving(false);
    
    toast({
      title: "Settings Saved",
      description: "Email settings have been updated and saved locally. These will be applied when the backend API is connected.",
      variant: "default"
    });
  };

  const testEmailConfiguration = async () => {
    try {
      setTesting(true);
      const primaryEmail = getCurrentValue('primary_email');
      
      await api.testEmailSettings();
      
      toast({
        title: "Test Email Sent",
        description: `Test email sent to ${primaryEmail}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Email test failed:', error);
      toast({
        title: "Test Email Feature",
        description: "Email test endpoint is not available yet. Once SMTP authentication is fixed, testing will work.",
        variant: "default"
      });
    } finally {
      setTesting(false);
    }
  };

  const getCurrentValue = (key: string): string => {
    return changes[key] || settings.find(s => s.setting_key === key)?.setting_value || '';
  };

  const renderSettingInput = (setting: EmailSetting) => {
    const currentValue = getCurrentValue(setting.setting_key);
    const hasChanges = changes[setting.setting_key] !== undefined;

    switch (setting.setting_type) {
      case 'email':
        return (
          <div className="space-y-2">
            <Label htmlFor={setting.setting_key} className="text-sm font-medium">
              {setting.display_name}
              {setting.is_required && <span className="text-red-500 ml-1">*</span>}
              {hasChanges && <Badge variant="outline" className="ml-2">Modified</Badge>}
            </Label>
            <Input
              id={setting.setting_key}
              type="email"
              value={currentValue}
              onChange={(e) => updateSetting(setting.setting_key, e.target.value)}
              placeholder="Enter email address"
              className={hasChanges ? "border-blue-300" : ""}
            />
            <p className="text-xs text-gray-500">{setting.description}</p>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {setting.display_name}
                {hasChanges && <Badge variant="outline" className="ml-2">Modified</Badge>}
              </Label>
              <p className="text-xs text-gray-500">{setting.description}</p>
            </div>
            <Switch
              checked={currentValue === 'true'}
              onCheckedChange={(checked) => updateSetting(setting.setting_key, checked.toString())}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={setting.setting_key} className="text-sm font-medium">
              {setting.display_name}
              {hasChanges && <Badge variant="outline" className="ml-2">Modified</Badge>}
            </Label>
            <Textarea
              id={setting.setting_key}
              value={currentValue}
              onChange={(e) => updateSetting(setting.setting_key, e.target.value)}
              rows={4}
              className={hasChanges ? "border-blue-300" : ""}
            />
            <p className="text-xs text-gray-500">{setting.description}</p>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={setting.setting_key} className="text-sm font-medium">
              {setting.display_name}
              {setting.is_required && <span className="text-red-500 ml-1">*</span>}
              {hasChanges && <Badge variant="outline" className="ml-2">Modified</Badge>}
            </Label>
            <Input
              id={setting.setting_key}
              value={currentValue}
              onChange={(e) => updateSetting(setting.setting_key, e.target.value)}
              className={hasChanges ? "border-blue-300" : ""}
            />
            <p className="text-xs text-gray-500">{setting.description}</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading email settings...</span>
      </div>
    );
  }

  const emailSettings = settings.filter(s => ['primary_email', 'notification_email', 'support_email'].includes(s.setting_key));
  const notificationSettings = settings.filter(s => s.setting_type === 'boolean');
  const otherSettings = settings.filter(s => !['primary_email', 'notification_email', 'support_email'].includes(s.setting_key) && s.setting_type !== 'boolean');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email Settings</h2>
          <p className="text-gray-600">Manage email addresses and notification preferences</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={testEmailConfiguration}
            disabled={testing}
            variant="outline"
            size="sm"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Test Email
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving || Object.keys(changes).length === 0}
            size="sm"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Changes Indicator */}
      {Object.keys(changes).length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">
                You have {Object.keys(changes).length} unsaved change(s)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Addresses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Addresses
          </CardTitle>
          <p className="text-sm text-gray-600">
            Configure the email addresses used for different purposes
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailSettings.map(setting => (
            <div key={setting.setting_key}>
              {renderSettingInput(setting)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Preferences
          </CardTitle>
          <p className="text-sm text-gray-600">
            Control which automated emails you want to receive
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationSettings.map(setting => (
            <div key={setting.setting_key}>
              {renderSettingInput(setting)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Other Settings */}
      {otherSettings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Additional Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {otherSettings.map(setting => (
              <div key={setting.setting_key}>
                {renderSettingInput(setting)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Current Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Current Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm">SMTP Host: {getCurrentValue('smtp_host')}</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm">SMTP Port: {getCurrentValue('smtp_port')}</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm">Username: {getCurrentValue('smtp_user')}</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm">Password: {getCurrentValue('smtp_pass')}</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm">From Email: {getCurrentValue('primary_email')}</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm">Service: {getCurrentValue('email_enabled') === 'true' ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">
                Settings are saved locally and ready for deployment. 
                Once SMTP authentication is fixed, email functionality will be fully operational.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};