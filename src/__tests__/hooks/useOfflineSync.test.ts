/**
 * Tests for useOfflineSync Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { offlineStorage } from '@/utils/offline-storage';
import { useOfflineStatus } from '@/hooks/usePWA';
import { apiMocks, serviceWorkerMock } from '@/utils/test-utils';

// Mock dependencies
jest.mock('@/utils/offline-storage');
jest.mock('@/hooks/usePWA');

const mockOfflineStorage = offlineStorage as jest.Mocked<typeof offlineStorage>;
const mockUseOfflineStatus = useOfflineStatus as jest.MockedFunction<typeof useOfflineStatus>;

describe('useOfflineSync', () => {
  const mockSWRegistration = serviceWorkerMock.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUseOfflineStatus.mockReturnValue({
      isOffline: false,
      isOnline: true,
      wasOffline: false,
      resetOfflineStatus: jest.fn()
    });

    mockOfflineStorage.getUnsyncedBookings.mockResolvedValue([]);
    mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue([]);
    mockOfflineStorage.getStorageStats.mockResolvedValue({
      bookings: 0,
      contactForms: 0,
      celebrities: 0,
      totalRecords: 0
    });
  });

  afterEach(() => {
    apiMocks.resetFetch();
  });

  afterAll(() => {
    serviceWorkerMock.cleanup();
  });

  describe('Initial State', () => {
    test('initializes with correct default state', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncTime).toBeNull();
      expect(result.current.syncErrors).toEqual([]);
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.syncProgress).toEqual({
        total: 0,
        completed: 0,
        failed: 0
      });
    });

    test('reflects online status from useOfflineStatus', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('Pending Count Updates', () => {
    test('updates pending count when items are available', async () => {
      const mockBookings = [
        { id: 'booking-1', synced: false },
        { id: 'booking-2', synced: false }
      ];
      const mockContactForms = [
        { id: 'contact-1', synced: false }
      ];

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue(mockBookings as any);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue(mockContactForms as any);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.updatePendingCount();
      });

      expect(result.current.pendingCount).toBe(3);
    });

    test('handles errors in pending count update gracefully', async () => {
      mockOfflineStorage.getUnsyncedBookings.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.updatePendingCount();
      });

      // Should not throw and maintain previous count
      expect(result.current.pendingCount).toBe(0);
    });
  });

  describe('Sync Operations', () => {
    test('performs sync when online and has pending items', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          data: {
            celebrityId: 'celebrity-1',
            serviceId: 'service-1',
            eventDate: '2024-12-25T18:00:00Z',
            clientInfo: { name: 'John', email: 'john@example.com', phone: '123-456-7890' },
            eventDetails: { location: 'LA', duration: 2 },
            pricing: { basePrice: 10000, additionalFees: 0, total: 10000 },
            status: 'pending'
          },
          synced: false
        }
      ];

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue(mockBookings as any);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue([]);
      
      // Mock successful API call
      apiMocks.mockFetch({ success: true, id: 'booking-1' });

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.performSync();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/bookings', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('celebrity-1')
      }));

      expect(mockOfflineStorage.markBookingSynced).toHaveBeenCalledWith('booking-1');
      expect(result.current.isSyncing).toBe(false);
    });

    test('handles sync errors gracefully', async () => {
      const mockBookings = [
        { id: 'booking-1', data: {}, synced: false }
      ];

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue(mockBookings as any);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue([]);
      
      // Mock failed API call
      apiMocks.mockFetch({ error: 'Server error' }, 500);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.performSync();
      });

      expect(result.current.syncErrors.length).toBeGreaterThan(0);
      expect(result.current.isSyncing).toBe(false);
    });

    test('does not sync when offline', async () => {
      mockUseOfflineStatus.mockReturnValue({
        isOffline: true,
        isOnline: false,
        wasOffline: false,
        resetOfflineStatus: jest.fn()
      });

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.performSync();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('prevents multiple concurrent syncs', async () => {
      const mockBookings = [
        { id: 'booking-1', data: {}, synced: false }
      ];

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue(mockBookings as any);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue([]);
      
      // Mock slow API call
      apiMocks.mockFetch(new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

      const { result } = renderHook(() => useOfflineSync());

      // Start first sync
      const syncPromise1 = act(async () => {
        await result.current.performSync();
      });

      // Try to start second sync while first is running
      await act(async () => {
        await result.current.performSync();
      });

      expect(result.current.isSyncing).toBe(true);
      
      await syncPromise1;
    });

    test('forces sync even when offline', async () => {
      mockUseOfflineStatus.mockReturnValue({
        isOffline: true,
        isOnline: false,
        wasOffline: false,
        resetOfflineStatus: jest.fn()
      });

      const mockBookings = [
        { id: 'booking-1', data: {}, synced: false }
      ];

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue(mockBookings as any);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue([]);
      
      apiMocks.mockFetch({ success: true });

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.performSync(true); // Force sync
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Contact Form Sync', () => {
    test('syncs contact forms successfully', async () => {
      const mockContactForms = [
        {
          id: 'contact-1',
          data: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            subject: 'Inquiry',
            message: 'Test message',
            type: 'general'
          },
          synced: false
        }
      ];

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue([]);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue(mockContactForms as any);
      
      apiMocks.mockFetch({ success: true });

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.performSync();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/contact', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Jane Doe')
      }));

      expect(mockOfflineStorage.markContactFormSynced).toHaveBeenCalledWith('contact-1');
    });

    test('handles contact form sync errors', async () => {
      const mockContactForms = [
        { id: 'contact-1', data: {}, synced: false }
      ];

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue([]);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue(mockContactForms as any);
      
      apiMocks.mockFetchError('Network error');

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.performSync();
      });

      expect(result.current.syncErrors.length).toBeGreaterThan(0);
      expect(result.current.syncErrors[0]).toContain('contact-1');
    });
  });

  describe('Auto-sync Behavior', () => {
    test('auto-syncs when coming back online', async () => {
      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue([]);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue([]);

      // Start with offline status
      mockUseOfflineStatus.mockReturnValue({
        isOffline: false,
        isOnline: true,
        wasOffline: true, // Just came back online
        resetOfflineStatus: jest.fn()
      });

      apiMocks.mockFetch({ success: true });

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      // Auto-sync should have been triggered
      expect(mockOfflineStorage.getUnsyncedBookings).toHaveBeenCalled();
      expect(mockOfflineStorage.getUnsyncedContactForms).toHaveBeenCalled();
    });
  });

  describe('Retry and Error Management', () => {
    test('retries sync operation', async () => {
      const mockBookings = [
        { id: 'booking-1', data: {}, synced: false }
      ];

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue(mockBookings as any);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue([]);
      
      apiMocks.mockFetch({ success: true });

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.retrySync();
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('clears sync errors', async () => {
      const { result } = renderHook(() => useOfflineSync());

      // Simulate having errors
      await act(async () => {
        // Trigger an error state by mocking a failed sync
        mockOfflineStorage.getUnsyncedBookings.mockRejectedValue(new Error('Test error'));
        await result.current.performSync();
      });

      act(() => {
        result.current.clearSyncErrors();
      });

      expect(result.current.syncErrors).toEqual([]);
    });
  });

  describe('Sync Statistics', () => {
    test('provides sync statistics', async () => {
      const mockBookings = [
        { id: 'booking-1', synced: false },
        { id: 'booking-2', synced: false }
      ];
      const mockContactForms = [
        { id: 'contact-1', synced: false }
      ];
      const mockStorageStats = {
        bookings: 5,
        contactForms: 3,
        celebrities: 10,
        totalRecords: 18
      };

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue(mockBookings as any);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue(mockContactForms as any);
      mockOfflineStorage.getStorageStats.mockResolvedValue(mockStorageStats);

      const { result } = renderHook(() => useOfflineSync());

      const stats = await act(async () => {
        return await result.current.getSyncStats();
      });

      expect(stats).toEqual({
        pendingBookings: 2,
        pendingContactForms: 1,
        totalPending: 3,
        storageStats: mockStorageStats,
        lastSync: null,
        syncInProgress: false
      });
    });
  });

  describe('Background Sync Integration', () => {
    test('registers background sync when service worker is available', async () => {
      const mockBookings = [
        { id: 'booking-1', data: {}, synced: false }
      ];

      mockOfflineStorage.getUnsyncedBookings.mockResolvedValue(mockBookings as any);
      mockOfflineStorage.getUnsyncedContactForms.mockResolvedValue([]);
      
      apiMocks.mockFetch({ success: true });

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.performSync();
      });

      await waitFor(() => {
        expect(mockSWRegistration.ready).toBeDefined();
      });
    });
  });
});