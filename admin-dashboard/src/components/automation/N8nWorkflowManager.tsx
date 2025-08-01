import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  Upload, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Copy, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  Zap,
  Settings,
  FileText,
  BarChart3
} from 'lucide-react';

interface N8nWorkflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  tags: string[];
  lastExecution?: {
    status: 'success' | 'error' | 'running';
    startedAt: string;
    finishedAt?: string;
    executionId: string;
  };
  triggers: number;
  nodes: number;
  createdAt: string;
  updatedAt: string;
  workflow: any; // The actual n8n workflow JSON
}

interface ExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  errorMessage?: string;
  triggerEvent?: string;
}

export const N8nWorkflowManager: React.FC = () => {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingWorkflow, setUploadingWorkflow] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8nWorkflow | null>(null);
  const [workflowFile, setWorkflowFile] = useState<File | null>(null);
  const [newWorkflowData, setNewWorkflowData] = useState({
    name: '',
    description: '',
    tags: ''
  });

  // Load workflows and executions
  useEffect(() => {
    loadWorkflows();
    loadExecutions();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/n8n/workflows', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      const response = await fetch('/api/n8n/executions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExecutions(data.executions || []);
      }
    } catch (error) {
      console.error('Failed to load executions:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setWorkflowFile(file);
    }
  };

  const uploadWorkflow = async () => {
    if (!workflowFile) return;

    setUploadingWorkflow(true);
    try {
      const fileContent = await workflowFile.text();
      const workflowData = JSON.parse(fileContent);

      // Validate workflow structure
      if (!workflowData.nodes || !workflowData.name) {
        throw new Error('Invalid workflow file structure');
      }

      const formData = new FormData();
      formData.append('workflow', JSON.stringify(workflowData));
      formData.append('name', newWorkflowData.name || workflowData.name);
      formData.append('description', newWorkflowData.description);
      formData.append('tags', newWorkflowData.tags);

      const response = await fetch('/api/n8n/workflows/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (response.ok) {
        await loadWorkflows();
        setWorkflowFile(null);
        setNewWorkflowData({ name: '', description: '', tags: '' });
      }
    } catch (error) {
      console.error('Failed to upload workflow:', error);
    } finally {
      setUploadingWorkflow(false);
    }
  };

  const toggleWorkflow = async (workflowId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/n8n/workflows/${workflowId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ active })
      });

      if (response.ok) {
        await loadWorkflows();
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/n8n/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        await loadExecutions();
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`/api/n8n/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        await loadWorkflows();
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const downloadWorkflow = async (workflow: N8nWorkflow) => {
    const dataStr = JSON.stringify(workflow.workflow, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const duplicateWorkflow = async (workflow: N8nWorkflow) => {
    const duplicatedWorkflow = {
      ...workflow.workflow,
      name: `${workflow.name} (Copy)`,
      id: `copy_${Date.now()}`
    };

    try {
      const response = await fetch('/api/n8n/workflows/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          workflow: duplicatedWorkflow,
          name: duplicatedWorkflow.name,
          description: `Copy of ${workflow.description || workflow.name}`,
          tags: workflow.tags.join(', ')
        })
      });

      if (response.ok) {
        await loadWorkflows();
      }
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">n8n Workflow Manager</h2>
          <p className="text-muted-foreground">
            Upload, manage, and monitor your n8n automation workflows
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload n8n Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Workflow File (JSON)
                </label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Workflow Name
                </label>
                <Input
                  value={newWorkflowData.name}
                  onChange={(e) => setNewWorkflowData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Leave empty to use filename"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  value={newWorkflowData.description}
                  onChange={(e) => setNewWorkflowData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the workflow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tags (comma-separated)
                </label>
                <Input
                  value={newWorkflowData.tags}
                  onChange={(e) => setNewWorkflowData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="automation, lead-scoring, email"
                />
              </div>
              <Button 
                onClick={uploadWorkflow} 
                disabled={!workflowFile || uploadingWorkflow}
                className="w-full"
              >
                {uploadingWorkflow ? 'Uploading...' : 'Upload Workflow'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="workflows" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflows">
            <Settings className="h-4 w-4 mr-2" />
            Workflows ({workflows.length})
          </TabsTrigger>
          <TabsTrigger value="executions">
            <BarChart3 className="h-4 w-4 mr-2" />
            Executions ({executions.length})
          </TabsTrigger>
          <TabsTrigger value="library">
            <FileText className="h-4 w-4 mr-2" />
            Workflow Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-6">
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <Badge variant={workflow.active ? "default" : "secondary"}>
                        {workflow.active ? "Active" : "Inactive"}
                      </Badge>
                      {workflow.lastExecution && getStatusIcon(workflow.lastExecution.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeWorkflow(workflow.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWorkflow(workflow.id, !workflow.active)}
                      >
                        {workflow.active ? <Pause className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadWorkflow(workflow)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateWorkflow(workflow)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteWorkflow(workflow.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workflow.description && (
                      <p className="text-sm text-muted-foreground">{workflow.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span><strong>Nodes:</strong> {workflow.nodes}</span>
                      <span><strong>Triggers:</strong> {workflow.triggers}</span>
                      <span><strong>Updated:</strong> {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                    </div>

                    {workflow.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {workflow.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {workflow.lastExecution && (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span>Last Execution:</span>
                          <Badge variant={
                            workflow.lastExecution.status === 'success' ? 'default' : 
                            workflow.lastExecution.status === 'error' ? 'destructive' : 'secondary'
                          }>
                            {workflow.lastExecution.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {new Date(workflow.lastExecution.startedAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="executions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {executions.slice(0, 20).map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <p className="font-medium text-sm">{execution.workflowName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(execution.startedAt).toLocaleString()}
                          {execution.duration && ` • ${execution.duration}ms`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        execution.status === 'success' ? 'default' : 
                        execution.status === 'error' ? 'destructive' : 'secondary'
                      }>
                        {execution.status}
                      </Badge>
                      {execution.errorMessage && (
                        <p className="text-xs text-red-600 mt-1 max-w-xs truncate">
                          {execution.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Celebrity Performance Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitors celebrity booking performance, generates alerts, and sends email reports.
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline">Performance</Badge>
                  <Badge variant="outline">Monitoring</Badge>
                  <Badge variant="outline">Email</Badge>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Scoring & Qualification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Automatically scores and qualifies leads based on multiple factors and triggers appropriate follow-up actions.
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline">Lead Scoring</Badge>
                  <Badge variant="outline">Automation</Badge>
                  <Badge variant="outline">CRM</Badge>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};