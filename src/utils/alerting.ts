/**
 * Performance Alerting System
 */

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // Duration in seconds that condition must persist
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  tags?: Record<string, string>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'firing' | 'resolved';
  firedAt: number;
  resolvedAt?: number;
  tags?: Record<string, string>;
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  severityFilter: string[]; // Which severities to alert on
}

class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private channels: Map<string, AlertChannel> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private metricHistory: Map<string, { value: number; timestamp: number }[]> = new Map();
  private evaluationInterval = 30000; // 30 seconds
  private evaluationTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadConfiguration();
    this.startEvaluation();
  }

  /**
   * Add or update an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.saveConfiguration();
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.saveConfiguration();
  }

  /**
   * Add or update an alert channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.set(channel.id, channel);
    this.saveConfiguration();
  }

  /**
   * Remove an alert channel
   */
  removeChannel(channelId: string): void {
    this.channels.delete(channelId);
    this.saveConfiguration();
  }

  /**
   * Record a metric value for evaluation
   */
  recordMetric(name: string, value: number, timestamp: number = Date.now()): void {
    if (!this.metricHistory.has(name)) {
      this.metricHistory.set(name, []);
    }

    const history = this.metricHistory.get(name)!;
    history.push({ value, timestamp });

    // Keep only last 100 values for performance
    if (history.length > 100) {
      history.shift();
    }

    // Immediate evaluation for this metric
    this.evaluateMetric(name, value, timestamp);
  }

  /**
   * Evaluate a specific metric against all rules
   */
  private evaluateMetric(metricName: string, value: number, timestamp: number): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.metric !== metricName) {
        continue;
      }

      const isConditionMet = this.evaluateCondition(rule, value);
      const alertKey = `${rule.id}_${metricName}`;
      const existingAlert = this.activeAlerts.get(alertKey);

      if (isConditionMet) {
        if (!existingAlert) {
          // Check if condition has persisted for required duration
          if (this.hasConditionPersistedForDuration(rule, timestamp)) {
            const alert = this.createAlert(rule, metricName, value, timestamp);
            this.activeAlerts.set(alertKey, alert);
            this.fireAlert(alert);
          }
        }
      } else if (existingAlert && existingAlert.status === 'firing') {
        // Resolve the alert
        existingAlert.status = 'resolved';
        existingAlert.resolvedAt = timestamp;
        this.resolveAlert(existingAlert);
      }
    }
  }

  /**
   * Check if condition has persisted for the required duration
   */
  private hasConditionPersistedForDuration(rule: AlertRule, currentTimestamp: number): boolean {
    const history = this.metricHistory.get(rule.metric);
    if (!history || history.length === 0) {
      return false;
    }

    const durationMs = rule.duration * 1000;
    const cutoffTime = currentTimestamp - durationMs;

    // Check if all values within the duration period meet the condition
    const recentValues = history.filter(h => h.timestamp >= cutoffTime);
    
    if (recentValues.length === 0) {
      return false;
    }

    return recentValues.every(h => this.evaluateCondition(rule, h.value));
  }

  /**
   * Evaluate if a value meets the rule condition
   */
  private evaluateCondition(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
      case 'greater_than':
        return value > rule.threshold;
      case 'less_than':
        return value < rule.threshold;
      case 'equals':
        return value === rule.threshold;
      case 'not_equals':
        return value !== rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(rule: AlertRule, metricName: string, value: number, timestamp: number): Alert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: metricName,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, metricName, value),
      status: 'firing',
      firedAt: timestamp,
      tags: rule.tags
    };
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, metricName: string, value: number): string {
    const condition = rule.condition.replace('_', ' ');
    return `${rule.name}: ${metricName} is ${value} (${condition} ${rule.threshold})`;
  }

  /**
   * Fire an alert to all configured channels
   */
  private async fireAlert(alert: Alert): Promise<void> {
    console.log(`🚨 ALERT FIRED: ${alert.message}`);

    for (const channel of this.channels.values()) {
      if (!channel.enabled || !channel.severityFilter.includes(alert.severity)) {
        continue;
      }

      try {
        await this.sendToChannel(channel, alert, 'fired');
      } catch (error) {
        console.error(`Failed to send alert to channel ${channel.name}:`, error);
      }
    }

    // Store alert in browser storage for dashboard
    this.storeAlert(alert);
  }

  /**
   * Resolve an alert
   */
  private async resolveAlert(alert: Alert): Promise<void> {
    console.log(`✅ ALERT RESOLVED: ${alert.message}`);

    for (const channel of this.channels.values()) {
      if (!channel.enabled || !channel.severityFilter.includes(alert.severity)) {
        continue;
      }

      try {
        await this.sendToChannel(channel, alert, 'resolved');
      } catch (error) {
        console.error(`Failed to send resolution to channel ${channel.name}:`, error);
      }
    }

    // Update stored alert
    this.storeAlert(alert);
  }

  /**
   * Send alert to a specific channel
   */
  private async sendToChannel(channel: AlertChannel, alert: Alert, action: 'fired' | 'resolved'): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailAlert(channel, alert, action);
        break;
      case 'slack':
        await this.sendSlackAlert(channel, alert, action);
        break;
      case 'webhook':
        await this.sendWebhookAlert(channel, alert, action);
        break;
      case 'sms':
        await this.sendSMSAlert(channel, alert, action);
        break;
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(channel: AlertChannel, alert: Alert, action: 'fired' | 'resolved'): Promise<void> {
    const payload = {
      to: channel.config.recipients,
      subject: `[${alert.severity.toUpperCase()}] ${action === 'fired' ? '🚨' : '✅'} ${alert.ruleName}`,
      body: this.formatEmailBody(alert, action),
      priority: alert.severity === 'critical' ? 'high' : 'normal'
    };

    await fetch('/api/alerts/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(channel: AlertChannel, alert: Alert, action: 'fired' | 'resolved'): Promise<void> {
    const color = this.getSlackColor(alert.severity, action);
    const emoji = action === 'fired' ? '🚨' : '✅';
    
    const payload = {
      channel: channel.config.channel,
      attachments: [{
        color,
        title: `${emoji} Alert ${action}: ${alert.ruleName}`,
        text: alert.message,
        fields: [
          {
            title: 'Metric',
            value: alert.metric,
            short: true
          },
          {
            title: 'Value',
            value: alert.value.toString(),
            short: true
          },
          {
            title: 'Threshold',
            value: alert.threshold.toString(),
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          }
        ],
        ts: Math.floor(alert.firedAt / 1000)
      }]
    };

    await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(channel: AlertChannel, alert: Alert, action: 'fired' | 'resolved'): Promise<void> {
    const payload = {
      action,
      alert: {
        ...alert,
        timestamp: new Date(alert.firedAt).toISOString()
      }
    };

    await fetch(channel.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...channel.config.headers
      },
      body: JSON.stringify(payload)
    });
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(channel: AlertChannel, alert: Alert, action: 'fired' | 'resolved'): Promise<void> {
    const message = `${action === 'fired' ? '🚨' : '✅'} ${alert.ruleName}: ${alert.metric} is ${alert.value} (threshold: ${alert.threshold})`;

    const payload = {
      to: channel.config.phoneNumbers,
      message: message.substring(0, 160) // SMS character limit
    };

    await fetch('/api/alerts/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  /**
   * Helper methods
   */
  private formatEmailBody(alert: Alert, action: 'fired' | 'resolved'): string {
    const actionText = action === 'fired' ? 'has been triggered' : 'has been resolved';
    const timestamp = new Date(alert.firedAt).toLocaleString();
    
    return `
      <h2>Alert ${actionText}</h2>
      <p><strong>Rule:</strong> ${alert.ruleName}</p>
      <p><strong>Metric:</strong> ${alert.metric}</p>
      <p><strong>Current Value:</strong> ${alert.value}</p>
      <p><strong>Threshold:</strong> ${alert.threshold}</p>
      <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
      <p><strong>Time:</strong> ${timestamp}</p>
      ${alert.tags ? `<p><strong>Tags:</strong> ${JSON.stringify(alert.tags)}</p>` : ''}
      <p><strong>Message:</strong> ${alert.message}</p>
    `;
  }

  private getSlackColor(severity: string, action: 'fired' | 'resolved'): string {
    if (action === 'resolved') return 'good';
    
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#ff9900';
      case 'low': return '#0099ff';
      default: return '#666666';
    }
  }

  /**
   * Store alert in browser storage for dashboard
   */
  private storeAlert(alert: Alert): void {
    try {
      const stored = localStorage.getItem('performance_alerts') || '[]';
      const alerts = JSON.parse(stored);
      
      const existingIndex = alerts.findIndex((a: Alert) => a.id === alert.id);
      if (existingIndex >= 0) {
        alerts[existingIndex] = alert;
      } else {
        alerts.unshift(alert);
      }
      
      // Keep only last 100 alerts
      if (alerts.length > 100) {
        alerts.splice(100);
      }
      
      localStorage.setItem('performance_alerts', JSON.stringify(alerts));
    } catch (error) {
      console.warn('Failed to store alert:', error);
    }
  }

  /**
   * Load configuration from storage
   */
  private loadConfiguration(): void {
    try {
      const rulesData = localStorage.getItem('alert_rules');
      if (rulesData) {
        const rules = JSON.parse(rulesData);
        rules.forEach((rule: AlertRule) => this.rules.set(rule.id, rule));
      }

      const channelsData = localStorage.getItem('alert_channels');
      if (channelsData) {
        const channels = JSON.parse(channelsData);
        channels.forEach((channel: AlertChannel) => this.channels.set(channel.id, channel));
      }
    } catch (error) {
      console.warn('Failed to load alert configuration:', error);
    }

    // Set up default rules if none exist
    if (this.rules.size === 0) {
      this.setupDefaultRules();
    }
  }

  /**
   * Save configuration to storage
   */
  private saveConfiguration(): void {
    try {
      localStorage.setItem('alert_rules', JSON.stringify(Array.from(this.rules.values())));
      localStorage.setItem('alert_channels', JSON.stringify(Array.from(this.channels.values())));
    } catch (error) {
      console.warn('Failed to save alert configuration:', error);
    }
  }

  /**
   * Set up default alert rules
   */
  private setupDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_lcp',
        name: 'High Largest Contentful Paint',
        metric: 'lcp',
        condition: 'greater_than',
        threshold: 4000,
        duration: 300, // 5 minutes
        severity: 'high',
        enabled: true
      },
      {
        id: 'high_fid',
        name: 'High First Input Delay',
        metric: 'fid',
        condition: 'greater_than',
        threshold: 300,
        duration: 300,
        severity: 'high',
        enabled: true
      },
      {
        id: 'high_cls',
        name: 'High Cumulative Layout Shift',
        metric: 'cls',
        condition: 'greater_than',
        threshold: 0.25,
        duration: 300,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'slow_api',
        name: 'Slow API Response',
        metric: 'api_call_duration',
        condition: 'greater_than',
        threshold: 5000,
        duration: 60,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'error_rate',
        condition: 'greater_than',
        threshold: 0.05, // 5%
        duration: 180,
        severity: 'critical',
        enabled: true
      }
    ];

    defaultRules.forEach(rule => this.addRule(rule));
  }

  /**
   * Start evaluation timer
   */
  private startEvaluation(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }

    this.evaluationTimer = setInterval(() => {
      this.evaluateAllRules();
    }, this.evaluationInterval);
  }

  /**
   * Evaluate all rules against current metrics
   */
  private evaluateAllRules(): void {
    for (const [metricName, history] of this.metricHistory.entries()) {
      if (history.length === 0) continue;
      
      const latest = history[history.length - 1];
      this.evaluateMetric(metricName, latest.value, latest.timestamp);
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.status === 'firing');
  }

  /**
   * Get all alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get all alert channels
   */
  getChannels(): AlertChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get alert history from storage
   */
  getAlertHistory(): Alert[] {
    try {
      const stored = localStorage.getItem('performance_alerts') || '[]';
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
  }
}

// Create singleton instance
export const alertManager = new AlertManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  alertManager.cleanup();
});