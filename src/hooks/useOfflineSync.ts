/**
 * Offline Synchronization Hook
 * Handles syncing offline data when connection is restored
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineStorage, BookingData, ContactFormData } from '@/utils/offline-storage';
import { useOfflineStatus } from '@/hooks/usePWA';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncErrors: string[];
  pendingCount: number;
  syncProgress: {
    total: number;
    completed: number;
    failed: number;
  };
}

interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  errors: string[];
}

export function useOfflineSync() {
  const { isOnline, wasOffline } = useOfflineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    syncErrors: [],
    pendingCount: 0,
    syncProgress: { total: 0, completed: 0, failed: 0 }
  });

  // Check pending items count
  const updatePendingCount = useCallback(async () => {
    try {
      const [bookings, contactForms] = await Promise.all([
        offlineStorage.getUnsyncedBookings(),
        offlineStorage.getUnsyncedContactForms()
      ]);
      
      setSyncStatus(prev => ({
        ...prev,
        pendingCount: bookings.length + contactForms.length
      }));
    } catch (error) {
      console.error('Failed to check pending items:', error);
    }
  }, []);

  // Sync booking data
  const syncBookings = useCallback(async (): Promise<SyncResult> => {
    const bookings = await offlineStorage.getUnsyncedBookings();
    const result: SyncResult = {
      success: true,
      itemsProcessed: 0,
      errors: []
    };

    for (const booking of bookings) {
      try {
        // Simulate API call to sync booking
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(booking.data)
        });

        if (response.ok) {
          await offlineStorage.markBookingSynced(booking.id);
          result.itemsProcessed++;
          
          // Update progress
          setSyncStatus(prev => ({
            ...prev,
            syncProgress: {
              ...prev.syncProgress,
              completed: prev.syncProgress.completed + 1
            }
          }));
        } else {
          const errorText = await response.text();
          result.errors.push(`Booking ${booking.id}: ${errorText}`);
          result.success = false;
          
          setSyncStatus(prev => ({
            ...prev,
            syncProgress: {
              ...prev.syncProgress,
              failed: prev.syncProgress.failed + 1
            }
          }));
        }
      } catch (error) {
        result.errors.push(`Booking ${booking.id}: ${(error as Error).message}`);
        result.success = false;
        
        setSyncStatus(prev => ({
          ...prev,
          syncProgress: {
            ...prev.syncProgress,
            failed: prev.syncProgress.failed + 1
          }
        }));
      }
    }

    return result;
  }, []);

  // Sync contact forms
  const syncContactForms = useCallback(async (): Promise<SyncResult> => {
    const contactForms = await offlineStorage.getUnsyncedContactForms();
    const result: SyncResult = {
      success: true,
      itemsProcessed: 0,
      errors: []
    };

    for (const form of contactForms) {
      try {
        // Simulate API call to sync contact form
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form.data)
        });

        if (response.ok) {
          await offlineStorage.markContactFormSynced(form.id);
          result.itemsProcessed++;
          
          // Update progress
          setSyncStatus(prev => ({
            ...prev,
            syncProgress: {
              ...prev.syncProgress,
              completed: prev.syncProgress.completed + 1
            }
          }));
        } else {
          const errorText = await response.text();
          result.errors.push(`Contact form ${form.id}: ${errorText}`);
          result.success = false;
          
          setSyncStatus(prev => ({
            ...prev,
            syncProgress: {
              ...prev.syncProgress,
              failed: prev.syncProgress.failed + 1
            }
          }));
        }
      } catch (error) {
        result.errors.push(`Contact form ${form.id}: ${(error as Error).message}`);
        result.success = false;
        
        setSyncStatus(prev => ({
          ...prev,
          syncProgress: {
            ...prev.syncProgress,
            failed: prev.syncProgress.failed + 1
          }
        }));
      }
    }

    return result;
  }, []);

  // Perform full synchronization
  const performSync = useCallback(async (force = false): Promise<void> => {
    if (!isOnline && !force) {
      console.log('OfflineSync: Cannot sync while offline');
      return;
    }

    if (syncStatus.isSyncing) {
      console.log('OfflineSync: Sync already in progress');
      return;
    }

    console.log('OfflineSync: Starting synchronization');
    
    try {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: true,
        syncErrors: [],
        syncProgress: { total: 0, completed: 0, failed: 0 }
      }));

      // Count total items to sync
      const [unsyncedBookings, unsyncedForms] = await Promise.all([
        offlineStorage.getUnsyncedBookings(),
        offlineStorage.getUnsyncedContactForms()
      ]);

      const totalItems = unsyncedBookings.length + unsyncedForms.length;
      
      if (totalItems === 0) {
        console.log('OfflineSync: No items to sync');
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: Date.now()
        }));
        return;
      }

      setSyncStatus(prev => ({
        ...prev,
        syncProgress: { ...prev.syncProgress, total: totalItems }
      }));

      // Sync bookings and contact forms
      const [bookingResult, contactResult] = await Promise.all([
        syncBookings(),
        syncContactForms()
      ]);

      // Combine results
      const allErrors = [...bookingResult.errors, ...contactResult.errors];
      const totalProcessed = bookingResult.itemsProcessed + contactResult.itemsProcessed;

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
        syncErrors: allErrors,
        pendingCount: totalItems - totalProcessed
      }));

      if (allErrors.length === 0) {
        console.log(`OfflineSync: Successfully synced ${totalProcessed} items`);
        
        // Trigger background sync for remaining items if any
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('background-sync');
        }
      } else {
        console.warn(`OfflineSync: Sync completed with ${allErrors.length} errors:`, allErrors);
      }

    } catch (error) {
      console.error('OfflineSync: Sync failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [...prev.syncErrors, (error as Error).message]
      }));
    }
  }, [isOnline, syncStatus.isSyncing, syncBookings, syncContactForms]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      console.log('OfflineSync: Connection restored, starting auto-sync');
      setTimeout(() => performSync(), 1000); // Small delay to ensure connection is stable
    }
  }, [wasOffline, isOnline, performSync]);

  // Periodic sync check
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      updatePendingCount();
      
      // Auto-sync if there are pending items and no current sync
      if (syncStatus.pendingCount > 0 && !syncStatus.isSyncing) {
        performSync();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, syncStatus.pendingCount, syncStatus.isSyncing, updatePendingCount, performSync]);

  // Initial pending count check
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Retry failed syncs
  const retrySync = useCallback(async (): Promise<void> => {
    await performSync(true);
  }, [performSync]);

  // Clear sync errors
  const clearSyncErrors = useCallback((): void => {
    setSyncStatus(prev => ({
      ...prev,
      syncErrors: []
    }));
  }, []);

  // Get sync statistics
  const getSyncStats = useCallback(async () => {
    const [bookings, contactForms, storageStats] = await Promise.all([
      offlineStorage.getUnsyncedBookings(),
      offlineStorage.getUnsyncedContactForms(),
      offlineStorage.getStorageStats()
    ]);

    return {
      pendingBookings: bookings.length,
      pendingContactForms: contactForms.length,
      totalPending: bookings.length + contactForms.length,
      storageStats,
      lastSync: syncStatus.lastSyncTime,
      syncInProgress: syncStatus.isSyncing
    };
  }, [syncStatus.lastSyncTime, syncStatus.isSyncing]);

  return {
    // Status
    ...syncStatus,
    isOnline,
    
    // Actions
    performSync,
    retrySync,
    clearSyncErrors,
    getSyncStats,
    updatePendingCount
  };
}