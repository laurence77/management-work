/**
 * Alert Notification Component
 */

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  X, 
  Bell, 
  BellOff,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useAlertNotifications } from '@/hooks/usePerformanceAlerting';
import { Alert as AlertType } from '@/utils/alerting';
import { cn } from '@/lib/utils';

interface AlertNotificationProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function AlertNotification({
  className,
  position = 'top-right',
  maxVisible = 3,
  autoHide = false,
  autoHideDelay = 10000
}: AlertNotificationProps) {
  const {
    notificationQueue,
    showNotifications,
    dismissNotification,
    dismissAllNotifications,
    getNotificationCount,
    toggleNotifications
  } = useAlertNotifications();

  const [hiddenAlerts, setHiddenAlerts] = useState<Set<string>>(new Set());

  // Auto-hide functionality
  useEffect(() => {
    if (!autoHide) return;

    const timers = notificationQueue.map(alert => {
      if (hiddenAlerts.has(alert.id)) return null;
      
      return setTimeout(() => {
        setHiddenAlerts(prev => new Set(prev).add(alert.id));
      }, autoHideDelay);
    });

    return () => {
      timers.forEach(timer => timer && clearTimeout(timer));
    };
  }, [notificationQueue, autoHide, autoHideDelay, hiddenAlerts]);

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const handleDismiss = (alertId: string) => {
    dismissNotification(alertId);
    setHiddenAlerts(prev => new Set(prev).add(alertId));
  };

  const visibleAlerts = notificationQueue
    .filter(alert => !hiddenAlerts.has(alert.id))
    .slice(0, maxVisible);

  const totalCount = getNotificationCount();
  const hiddenCount = totalCount - visibleAlerts.length;

  if (!showNotifications || visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-50 space-y-2 w-96 max-w-sm',
        getPositionClasses(),
        className
      )}
    >
      {/* Notification Toggle */}
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleNotifications}
          className="h-8 w-8 p-0"
        >
          {showNotifications ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Alert Notifications */}
      {visibleAlerts.map((alert) => (
        <AlertNotificationCard
          key={alert.id}
          alert={alert}
          onDismiss={handleDismiss}
          icon={getAlertIcon(alert.severity)}
          colorClass={getSeverityColor(alert.severity)}
        />
      ))}

      {/* Hidden Count Indicator */}
      {hiddenCount > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                +{hiddenCount} more alert{hiddenCount !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissAllNotifications}
                className="text-xs"
              >
                Dismiss All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AlertNotificationCardProps {
  alert: AlertType;
  onDismiss: (alertId: string) => void;
  icon: React.ReactNode;
  colorClass: string;
}

function AlertNotificationCard({
  alert,
  onDismiss,
  icon,
  colorClass
}: AlertNotificationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={cn('border-l-4 shadow-lg', colorClass)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2">
            {icon}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium truncate">
                {alert.ruleName}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {alert.severity.toUpperCase()}
                </Badge>
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(alert.firedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(alert.id)}
            className="h-6 w-6 p-0 shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            {isExpanded ? alert.message : `${alert.message.substring(0, 100)}${alert.message.length > 100 ? '...' : ''}`}
          </p>

          {alert.message.length > 100 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs p-0 h-auto"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </Button>
          )}

          <div className="flex justify-between items-center text-xs text-gray-500">
            <div className="space-x-4">
              <span>
                <strong>Metric:</strong> {alert.metric}
              </span>
              <span>
                <strong>Value:</strong> {alert.value}
              </span>
              <span>
                <strong>Threshold:</strong> {alert.threshold}
              </span>
            </div>
          </div>

          {alert.tags && Object.keys(alert.tags).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(alert.tags).map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {key}: {value}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Navigate to performance dashboard
                window.open('/admin/performance', '_blank');
              }}
              className="text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Summary notification component for header/navbar
export function AlertSummary() {
  const { getNotificationCount, getCriticalAlertCount } = useAlertNotifications();
  
  const totalAlerts = getNotificationCount();
  const criticalAlerts = getCriticalAlertCount();

  if (totalAlerts === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="h-4 w-4" />
        {totalAlerts > 0 && (
          <Badge 
            className={cn(
              'absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs',
              criticalAlerts > 0 ? 'bg-red-500' : 'bg-yellow-500'
            )}
          >
            {totalAlerts > 99 ? '99+' : totalAlerts}
          </Badge>
        )}
      </Button>
    </div>
  );
}

// Floating alert indicator
export function FloatingAlertIndicator() {
  const { getCriticalAlertCount } = useAlertNotifications();
  const criticalCount = getCriticalAlertCount();

  if (criticalCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <Card className="bg-red-500 text-white border-red-600 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6" />
            <div>
              <div className="font-semibold">Critical Alerts</div>
              <div className="text-sm opacity-90">
                {criticalCount} alert{criticalCount !== 1 ? 's' : ''} require{criticalCount === 1 ? 's' : ''} attention
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('/admin/performance', '_blank')}
              className="text-white hover:bg-red-600"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}