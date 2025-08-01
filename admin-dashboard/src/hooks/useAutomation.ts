import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  is_active: boolean;
  priority: number;
}

interface AutomationLog {
  id: string;
  workflow_id: string;
  workflow_name: string;
  trigger_event: string;
  success: boolean;
  executed_at: string;
  execution_time_ms: number;
}

interface AutomationMetrics {
  total_executions: number;
  success_rate: number;
  average_execution_time: number;
  active_workflows: number;
}

export const useAutomation = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch automation rules
  const fetchRules = async () => {
    try {
      const response = await api.get('/api/automation/rules');
      setRules(response.data.rules || []);
    } catch (err) {
      setError('Failed to fetch automation rules');
      console.error('Automation rules error:', err);
    }
  };

  // Fetch automation logs
  const fetchLogs = async (limit = 50) => {
    try {
      const response = await api.get(`/api/automation/logs?limit=${limit}`);
      setLogs(response.data.logs || []);
    } catch (err) {
      setError('Failed to fetch automation logs');
      console.error('Automation logs error:', err);
    }
  };

  // Fetch automation metrics
  const fetchMetrics = async () => {
    try {
      const response = await api.get('/api/automation/metrics');
      setMetrics(response.data.metrics);
    } catch (err) {
      setError('Failed to fetch automation metrics');
      console.error('Automation metrics error:', err);
    }
  };

  // Toggle automation rule
  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await api.patch(`/api/automation/rules/${ruleId}`, { is_active: isActive });
      await fetchRules(); // Refresh rules
      return true;
    } catch (err) {
      setError('Failed to toggle automation rule');
      console.error('Toggle rule error:', err);
      return false;
    }
  };

  // Trigger manual automation
  const triggerManualAutomation = async (workflowId: string, data: any) => {
    try {
      const response = await api.post('/api/automation/trigger', {
        workflow_id: workflowId,
        data
      });
      return response.data;
    } catch (err) {
      setError('Failed to trigger automation');
      console.error('Manual trigger error:', err);
      return null;
    }
  };

  // Get real-time automation status
  const getAutomationStatus = async () => {
    try {
      const response = await api.get('/api/automation/status');
      return response.data.status;
    } catch (err) {
      console.error('Automation status error:', err);
      return null;
    }
  };

  // Smart booking automation
  const triggerSmartBooking = async (bookingData: any) => {
    try {
      const response = await api.post('/api/webhooks/n8n/booking-created', bookingData);
      return response.data;
    } catch (err) {
      setError('Failed to trigger smart booking automation');
      console.error('Smart booking error:', err);
      return null;
    }
  };

  // Recommendation engine trigger
  const getSmartRecommendations = async (userId: string, context: any) => {
    try {
      const response = await api.post('/api/webhooks/n8n/recommendation-engine', {
        user_id: userId,
        context,
        preferences: {}
      });
      return response.data;
    } catch (err) {
      setError('Failed to get smart recommendations');
      console.error('Recommendations error:', err);
      return null;
    }
  };

  // Celebrity performance trigger
  const triggerCelebrityAnalysis = async (celebrityId: string) => {
    try {
      const response = await api.post('/api/webhooks/n8n/celebrity-updated', {
        celebrity_id: celebrityId,
        field_changed: 'performance_analysis',
        trigger_type: 'manual'
      });
      return response.data;
    } catch (err) {
      setError('Failed to trigger celebrity analysis');
      console.error('Celebrity analysis error:', err);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchRules(),
        fetchLogs(),
        fetchMetrics()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    // Data
    rules,
    logs,
    metrics,
    loading,
    error,
    
    // Actions
    fetchRules,
    fetchLogs,
    fetchMetrics,
    toggleRule,
    triggerManualAutomation,
    getAutomationStatus,
    
    // Smart features
    triggerSmartBooking,
    getSmartRecommendations,
    triggerCelebrityAnalysis,
    
    // Utils
    refresh: () => Promise.all([fetchRules(), fetchLogs(), fetchMetrics()])
  };
};