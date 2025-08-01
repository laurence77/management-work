/**
 * React Hook for Performance Alerting
 */

import { useState, useEffect, useCallback } from 'react';
import { alertManager, Alert, AlertRule, AlertChannel } from '@/utils/alerting';

export function usePerformanceAlerting() {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [channels, setChannels] = useState<AlertChannel[]>([]);

  // Load initial data
  useEffect(() => {
    refreshData();
    
    // Set up periodic refresh
    const interval = setInterval(refreshData, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const refreshData = useCallback(() => {
    setActiveAlerts(alertManager.getActiveAlerts());
    setAlertHistory(alertManager.getAlertHistory());
    setRules(alertManager.getRules());
    setChannels(alertManager.getChannels());
  }, []);

  const addRule = useCallback((rule: AlertRule) => {
    alertManager.addRule(rule);
    refreshData();
  }, [refreshData]);

  const removeRule = useCallback((ruleId: string) => {
    alertManager.removeRule(ruleId);
    refreshData();
  }, [refreshData]);

  const updateRule = useCallback((rule: AlertRule) => {
    alertManager.addRule(rule); // addRule also updates existing rules
    refreshData();
  }, [refreshData]);

  const addChannel = useCallback((channel: AlertChannel) => {
    alertManager.addChannel(channel);
    refreshData();
  }, [refreshData]);

  const removeChannel = useCallback((channelId: string) => {
    alertManager.removeChannel(channelId);
    refreshData();
  }, [refreshData]);

  const updateChannel = useCallback((channel: AlertChannel) => {
    alertManager.addChannel(channel); // addChannel also updates existing channels
    refreshData();
  }, [refreshData]);

  const recordMetric = useCallback((name: string, value: number, timestamp?: number) => {
    alertManager.recordMetric(name, value, timestamp);
  }, []);

  const getAlertsByStatus = useCallback((status: 'firing' | 'resolved') => {
    return alertHistory.filter(alert => alert.status === status);
  }, [alertHistory]);

  const getAlertsBySeverity = useCallback((severity: string) => {
    return alertHistory.filter(alert => alert.severity === severity);
  }, [alertHistory]);

  const dismissAlert = useCallback((alertId: string) => {
    // Mark alert as acknowledged in localStorage
    try {
      const stored = localStorage.getItem('dismissed_alerts') || '[]';
      const dismissed = JSON.parse(stored);
      if (!dismissed.includes(alertId)) {
        dismissed.push(alertId);
        localStorage.setItem('dismissed_alerts', JSON.stringify(dismissed));
      }
    } catch (error) {
      console.warn('Failed to dismiss alert:', error);
    }
  }, []);

  const isDismissed = useCallback((alertId: string): boolean => {
    try {
      const stored = localStorage.getItem('dismissed_alerts') || '[]';
      const dismissed = JSON.parse(stored);
      return dismissed.includes(alertId);
    } catch {
      return false;
    }
  }, []);

  return {
    activeAlerts,
    alertHistory,
    rules,
    channels,
    addRule,
    removeRule,
    updateRule,
    addChannel,
    removeChannel,
    updateChannel,
    recordMetric,
    getAlertsByStatus,
    getAlertsBySeverity,
    dismissAlert,
    isDismissed,
    refreshData
  };
}

// Hook for creating and managing alert rules
export function useAlertRuleManager() {
  const { rules, addRule, removeRule, updateRule } = usePerformanceAlerting();

  const createWebVitalRule = useCallback((
    name: string,
    metric: 'lcp' | 'fid' | 'cls' | 'fcp' | 'ttfb',
    threshold: number,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    const rule: AlertRule = {
      id: `webvital_${metric}_${Date.now()}`,
      name: name || `High ${metric.toUpperCase()}`,
      metric,
      condition: 'greater_than',
      threshold,
      duration: 300, // 5 minutes
      severity,
      enabled: true,
      tags: { type: 'web_vital' }
    };

    addRule(rule);
    return rule;
  }, [addRule]);

  const createPerformanceRule = useCallback((
    name: string,
    metric: string,
    threshold: number,
    condition: 'greater_than' | 'less_than' = 'greater_than',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    const rule: AlertRule = {
      id: `perf_${metric}_${Date.now()}`,
      name,
      metric,
      condition,
      threshold,
      duration: 180, // 3 minutes
      severity,
      enabled: true,
      tags: { type: 'performance' }
    };

    addRule(rule);
    return rule;
  }, [addRule]);

  const createErrorRule = useCallback((
    name: string,
    metric: string,
    threshold: number,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ) => {
    const rule: AlertRule = {
      id: `error_${metric}_${Date.now()}`,
      name,
      metric,
      condition: 'greater_than',
      threshold,
      duration: 60, // 1 minute
      severity,
      enabled: true,
      tags: { type: 'error' }
    };

    addRule(rule);
    return rule;
  }, [addRule]);

  const toggleRule = useCallback((ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      updateRule({ ...rule, enabled: !rule.enabled });
    }
  }, [rules, updateRule]);

  return {
    rules,
    createWebVitalRule,
    createPerformanceRule,
    createErrorRule,
    toggleRule,
    removeRule,
    updateRule
  };
}

// Hook for managing alert channels
export function useAlertChannelManager() {
  const { channels, addChannel, removeChannel, updateChannel } = usePerformanceAlerting();

  const createEmailChannel = useCallback((
    name: string,
    recipients: string[],
    severityFilter: string[] = ['medium', 'high', 'critical']
  ) => {
    const channel: AlertChannel = {
      id: `email_${Date.now()}`,
      type: 'email',
      name,
      config: { recipients },
      enabled: true,
      severityFilter
    };

    addChannel(channel);
    return channel;
  }, [addChannel]);

  const createSlackChannel = useCallback((
    name: string,
    webhookUrl: string,
    channelName: string,
    severityFilter: string[] = ['medium', 'high', 'critical']
  ) => {
    const channel: AlertChannel = {
      id: `slack_${Date.now()}`,
      type: 'slack',
      name,
      config: { 
        webhookUrl, 
        channel: channelName 
      },
      enabled: true,
      severityFilter
    };

    addChannel(channel);
    return channel;
  }, [addChannel]);

  const createWebhookChannel = useCallback((
    name: string,
    url: string,
    headers: Record<string, string> = {},
    severityFilter: string[] = ['high', 'critical']
  ) => {
    const channel: AlertChannel = {
      id: `webhook_${Date.now()}`,
      type: 'webhook',
      name,
      config: { url, headers },
      enabled: true,
      severityFilter
    };

    addChannel(channel);
    return channel;
  }, [addChannel]);

  const createSMSChannel = useCallback((
    name: string,
    phoneNumbers: string[],
    severityFilter: string[] = ['critical']
  ) => {
    const channel: AlertChannel = {
      id: `sms_${Date.now()}`,
      type: 'sms',
      name,
      config: { phoneNumbers },
      enabled: true,
      severityFilter
    };

    addChannel(channel);
    return channel;
  }, [addChannel]);

  const toggleChannel = useCallback((channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      updateChannel({ ...channel, enabled: !channel.enabled });
    }
  }, [channels, updateChannel]);

  const testChannel = useCallback(async (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return false;

    const testAlert: Alert = {
      id: 'test_alert',
      ruleId: 'test_rule',
      ruleName: 'Test Alert',
      metric: 'test_metric',
      value: 100,
      threshold: 50,
      severity: 'medium',
      message: 'This is a test alert to verify channel configuration',
      status: 'firing',
      firedAt: Date.now(),
      tags: { test: 'true' }
    };

    try {
      // This would normally be handled by the alert manager
      // For testing, we'll make a direct API call
      const response = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, alert: testAlert })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to test channel:', error);
      return false;
    }
  }, [channels]);

  return {
    channels,
    createEmailChannel,
    createSlackChannel,
    createWebhookChannel,
    createSMSChannel,
    toggleChannel,
    testChannel,
    removeChannel,
    updateChannel
  };
}

// Hook for alert notifications in the UI
export function useAlertNotifications() {
  const { activeAlerts, isDismissed, dismissAlert } = usePerformanceAlerting();
  
  const [notificationQueue, setNotificationQueue] = useState<Alert[]>([]);
  const [showNotifications, setShowNotifications] = useState(true);

  // Update notification queue when active alerts change
  useEffect(() => {
    const newAlerts = activeAlerts.filter(alert => 
      !isDismissed(alert.id) && 
      !notificationQueue.some(n => n.id === alert.id)
    );
    
    if (newAlerts.length > 0) {
      setNotificationQueue(prev => [...prev, ...newAlerts]);
    }
  }, [activeAlerts, isDismissed, notificationQueue]);

  const dismissNotification = useCallback((alertId: string) => {
    dismissAlert(alertId);
    setNotificationQueue(prev => prev.filter(alert => alert.id !== alertId));
  }, [dismissAlert]);

  const dismissAllNotifications = useCallback(() => {
    notificationQueue.forEach(alert => dismissAlert(alert.id));
    setNotificationQueue([]);
  }, [notificationQueue, dismissAlert]);

  const getNotificationCount = useCallback(() => {
    return notificationQueue.length;
  }, [notificationQueue]);

  const getCriticalAlertCount = useCallback(() => {
    return activeAlerts.filter(alert => 
      alert.severity === 'critical' && !isDismissed(alert.id)
    ).length;
  }, [activeAlerts, isDismissed]);

  const toggleNotifications = useCallback(() => {
    setShowNotifications(prev => !prev);
  }, []);

  return {
    notificationQueue,
    showNotifications,
    dismissNotification,
    dismissAllNotifications,
    getNotificationCount,
    getCriticalAlertCount,
    toggleNotifications
  };
}