import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { api } from '../../lib/api';
import { 
  Mail, 
  Edit3, 
  Save, 
  RefreshCw, 
  Eye,
  Code,
  Type,
  Palette,
  Send
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  subject_template: string;
  html_template: string;
  text_template: string;
  description: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const EmailTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [changes, setChanges] = useState<Partial<EmailTemplate>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.getEmailTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } catch (error) {
      console.error('Failed to load email templates:', error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate || Object.keys(changes).length === 0) {
      toast({
        title: "No Changes",
        description: "No changes to save",
        variant: "default"
      });
      return;
    }

    try {
      setSaving(true);
      await api.updateEmailTemplate(selectedTemplate.template_key, changes);
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id 
          ? { ...t, ...changes, updated_at: new Date().toISOString() }
          : t
      ));
      
      setSelectedTemplate(prev => prev ? { ...prev, ...changes } : null);
      setChanges({});
      
      toast({
        title: "Template Saved",
        description: "Email template updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save email template",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const testData = {
        booking_id: 'TEST-12345',
        client_name: 'John Doe',
        client_email: 'john@example.com',
        celebrity_name: 'A-List Celebrity',
        event_type: 'Corporate Event',
        budget: '75000',
        event_date: '2025-09-15',
        dashboard_url: 'http://localhost:5173',
        approved_at: new Date().toLocaleString(),
        user_name: 'Test User',
        user_email: 'user@example.com',
        hours_since: '2',
        user_id: 'user123'
      };

      await api.testEmailTemplate(selectedTemplate.template_key, testData);
      
      toast({
        title: "Test Email Sent",
        description: `Test email sent using ${selectedTemplate.template_name} template`,
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test email",
        variant: "destructive"
      });
    }
  };

  const updateTemplate = (field: keyof EmailTemplate, value: string) => {
    setChanges(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getCurrentValue = (field: keyof EmailTemplate): string => {
    if (field in changes) {
      return changes[field] as string;
    }
    return selectedTemplate?.[field] as string || '';
  };

  const renderPreview = () => {
    if (!selectedTemplate) return null;

    const template = previewMode === 'html' 
      ? getCurrentValue('html_template')
      : getCurrentValue('text_template');

    // Replace template variables with sample data for preview
    const sampleData = {
      booking_id: 'SAMPLE-123',
      client_name: 'John Doe',
      celebrity_name: 'Celebrity Name',
      budget: '75000',
      event_type: 'Corporate Event',
      event_date: '2025-09-15'
    };

    let preview = template;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4" />
          <span className="font-medium">Template Preview</span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant={previewMode === 'html' ? 'default' : 'outline'}
              onClick={() => setPreviewMode('html')}
            >
              HTML
            </Button>
            <Button
              size="sm"
              variant={previewMode === 'text' ? 'default' : 'outline'}
              onClick={() => setPreviewMode('text')}
            >
              Text
            </Button>
          </div>
        </div>
        
        {previewMode === 'html' ? (
          <div 
            className="border bg-white p-4 rounded min-h-[300px]"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        ) : (
          <pre className="border bg-white p-4 rounded min-h-[300px] whitespace-pre-wrap">
            {preview}
          </pre>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Email Templates...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Template Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Create and edit professional email templates for automated notifications
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Templates</Label>
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{template.template_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {template.template_key}
                        </p>
                      </div>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Template Editor */}
            <div className="lg:col-span-2 space-y-4">
              {selectedTemplate && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      {selectedTemplate.template_name}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={testTemplate}
                        variant="outline"
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Test Email
                      </Button>
                      <Button
                        onClick={saveTemplate}
                        disabled={saving || Object.keys(changes).length === 0}
                        size="sm"
                      >
                        {saving ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="content" className="w-full">
                    <TabsList>
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-4">
                      <div>
                        <Label htmlFor="subject">Subject Template</Label>
                        <Input
                          id="subject"
                          value={getCurrentValue('subject_template')}
                          onChange={(e) => updateTemplate('subject_template', e.target.value)}
                          placeholder="Email subject with {{variables}}"
                        />
                      </div>

                      <div>
                        <Label htmlFor="html">HTML Template</Label>
                        <Textarea
                          id="html"
                          value={getCurrentValue('html_template')}
                          onChange={(e) => updateTemplate('html_template', e.target.value)}
                          placeholder="HTML email content with {{variables}}"
                          className="min-h-[300px] font-mono text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="text">Text Template</Label>
                        <Textarea
                          id="text"
                          value={getCurrentValue('text_template')}
                          onChange={(e) => updateTemplate('text_template', e.target.value)}
                          placeholder="Plain text email content with {{variables}}"
                          className="min-h-[150px]"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="preview">
                      {renderPreview()}
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                      <div>
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                          id="name"
                          value={getCurrentValue('template_name')}
                          onChange={(e) => updateTemplate('template_name', e.target.value)}
                          placeholder="Display name for this template"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={getCurrentValue('description')}
                          onChange={(e) => updateTemplate('description', e.target.value)}
                          placeholder="Description of when this template is used"
                        />
                      </div>

                      <div>
                        <Label>Available Variables</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedTemplate.variables?.map((variable) => (
                            <Badge key={variable} variant="outline">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Use these variables in your templates. They will be replaced with actual values when emails are sent.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};