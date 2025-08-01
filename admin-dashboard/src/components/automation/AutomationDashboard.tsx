import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAutomation } from '../../hooks/useAutomation';
import { AutomationActivityDashboard } from './AutomationActivityDashboard';
import { N8nWorkflowManager } from './N8nWorkflowManager';
import { Activity, Zap, TrendingUp, Clock, CheckCircle, XCircle, Settings, BarChart3, Workflow } from 'lucide-react';

export const AutomationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('activity');
  const { 
    rules, 
    logs, 
    metrics, 
    loading, 
    error, 
    toggleRule,
    triggerManualAutomation 
  } = useAutomation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">
            <BarChart3 className="h-4 w-4 mr-2" />
            Live Activity
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <Settings className="h-4 w-4 mr-2" />
            Workflow Management
          </TabsTrigger>
          <TabsTrigger value="n8n">
            <Workflow className="h-4 w-4 mr-2" />
            n8n Workflows
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <AutomationActivityDashboard />
        </TabsContent>

        <TabsContent value="workflows" className="mt-6">
      {/* Automation Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_executions || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.success_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.success_rate && metrics.success_rate > 95 ? (
                <span className="text-green-600">Excellent performance</span>
              ) : (
                <span className="text-yellow-600">Needs optimization</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.average_execution_time || 0}ms</div>
            <p className="text-xs text-muted-foreground">Processing time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.active_workflows || 0}</div>
            <p className="text-xs text-muted-foreground">Running now</p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your automated workflows and triggers
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{rule.name}</h3>
                    <Badge variant={rule.priority === 1 ? "destructive" : rule.priority === 2 ? "default" : "secondary"}>
                      {rule.priority === 1 ? "High" : rule.priority === 2 ? "Medium" : "Low"} Priority
                    </Badge>
                    <Badge variant={rule.trigger_type === "webhook" ? "outline" : "secondary"}>
                      {rule.trigger_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerManualAutomation(rule.id, {})}
                  >
                    Test Run
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Automation Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest automation workflow results
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {log.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{log.workflow_name || log.workflow_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.trigger_event} • {new Date(log.executed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={log.success ? "secondary" : "destructive"}>
                    {log.success ? "Success" : "Failed"}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.execution_time_ms}ms
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Trigger common automation workflows manually
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Zap className="h-6 w-6" />
              <span>Process Pending Bookings</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <TrendingUp className="h-6 w-6" />
              <span>Update Celebrity Metrics</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Activity className="h-6 w-6" />
              <span>Generate Analytics Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="n8n" className="mt-6">
          <N8nWorkflowManager />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Coming Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Advanced analytics and reporting features will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};