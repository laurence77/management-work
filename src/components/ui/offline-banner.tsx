/**
 * Offline Banner Component
 * Shows offline status and sync information to users
 */

import React from 'react';
import { AlertCircle, Wifi, WifiOff, RotateCw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

interface OfflineBannerProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineBanner({ className, showDetails = true }: OfflineBannerProps) {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    syncErrors,
    syncProgress,
    lastSyncTime,
    performSync,
    retrySync,
    clearSyncErrors
  } = useOfflineSync();

  // Don't show banner if online and no pending items
  if (isOnline && pendingCount === 0 && syncErrors.length === 0) {
    return null;
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (isSyncing) return <RotateCw className="h-4 w-4 animate-spin" />;
    if (syncErrors.length > 0) return <XCircle className="h-4 w-4" />;
    if (pendingCount > 0) return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline - Limited functionality available';
    if (isSyncing) return 'Syncing data...';
    if (syncErrors.length > 0) return `Sync failed - ${syncErrors.length} error(s)`;
    if (pendingCount > 0) return `${pendingCount} item(s) pending sync`;
    return 'All data synced';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (isSyncing) return 'bg-blue-500';
    if (syncErrors.length > 0) return 'bg-orange-500';
    if (pendingCount > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn(
      "border-b transition-all duration-300",
      getStatusColor(),
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {/* Status section */}
          <div className="flex items-center space-x-3">
            <div className="text-white">
              {getStatusIcon()}
            </div>
            <div className="text-white">
              <div className="font-medium text-sm">
                {getStatusText()}
              </div>
              
              {showDetails && (
                <div className="text-xs opacity-90 mt-1">
                  {isOnline ? (
                    <>
                      Last sync: {formatLastSync(lastSyncTime)}
                      {pendingCount > 0 && (
                        <span className="ml-2">
                          • {pendingCount} items waiting
                        </span>
                      )}
                    </>
                  ) : (
                    'Your data will sync when connection is restored'
                  )}
                </div>
              )}
            </div>

            {/* Sync progress */}
            {isSyncing && syncProgress.total > 0 && (
              <div className="flex items-center space-x-2">
                <Progress 
                  value={(syncProgress.completed / syncProgress.total) * 100}
                  className="w-24 h-2"
                />
                <span className="text-white text-xs">
                  {syncProgress.completed}/{syncProgress.total}
                </span>
              </div>
            )}

            {/* Error badge */}
            {syncErrors.length > 0 && (
              <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
                {syncErrors.length} error{syncErrors.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {isOnline && pendingCount > 0 && !isSyncing && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => performSync()}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <RotateCw className="h-3 w-3 mr-1" />
                Sync Now
              </Button>
            )}

            {syncErrors.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={retrySync}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSyncErrors}
                  className="text-white hover:bg-white/20"
                >
                  Dismiss
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error details */}
        {showDetails && syncErrors.length > 0 && (
          <div className="pb-3">
            <div className="bg-white/10 rounded p-3">
              <div className="text-white text-sm font-medium mb-2">
                Sync Errors:
              </div>
              <div className="space-y-1">
                {syncErrors.slice(0, 3).map((error, index) => (
                  <div key={index} className="text-white/90 text-xs">
                    • {error}
                  </div>
                ))}
                {syncErrors.length > 3 && (
                  <div className="text-white/70 text-xs">
                    ... and {syncErrors.length - 3} more error(s)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact Offline Indicator for top navigation
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center space-x-2 px-3 py-1 rounded-full text-xs",
      !isOnline 
        ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
        : pendingCount > 0
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
        : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      className
    )}>
      {!isOnline ? (
        <WifiOff className="h-3 w-3" />
      ) : isSyncing ? (
        <RotateCw className="h-3 w-3 animate-spin" />
      ) : (
        <Wifi className="h-3 w-3" />
      )}
      
      <span className="font-medium">
        {!isOnline 
          ? 'Offline' 
          : pendingCount > 0 
          ? `${pendingCount} pending`
          : 'Online'
        }
      </span>
    </div>
  );
}