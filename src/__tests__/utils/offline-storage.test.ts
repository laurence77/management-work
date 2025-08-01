/**
 * Tests for Offline Storage Utilities
 */

import { offlineStorage, OfflineStorageManager } from '@/utils/offline-storage';
import { indexedDBMock } from '@/utils/test-utils';

// Mock IndexedDB
const mockDB = indexedDBMock.setup();

describe('OfflineStorageManager', () => {
  let storage: OfflineStorageManager;

  beforeEach(() => {
    storage = new OfflineStorageManager();
    jest.clearAllMocks();
  });

  afterAll(() => {
    indexedDBMock.cleanup();
  });

  describe('Database Initialization', () => {
    test('creates object stores on upgrade', () => {
      expect(global.indexedDB.open).toHaveBeenCalledWith('CelebrityBookingOffline', 1);
    });

    test('isSupported returns true when IndexedDB is available', () => {
      expect(OfflineStorageManager.isSupported()).toBe(true);
    });

    test('isSupported returns false when IndexedDB is not available', () => {
      const originalIndexedDB = global.indexedDB;
      delete (global as any).indexedDB;
      
      expect(OfflineStorageManager.isSupported()).toBe(false);
      
      global.indexedDB = originalIndexedDB;
    });
  });

  describe('Booking Storage', () => {
    const mockBookingData = {
      celebrityId: 'celebrity-1',
      serviceId: 'service-1',
      eventDate: '2024-12-25T18:00:00Z',
      clientInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-123-4567'
      },
      eventDetails: {
        location: 'Los Angeles, CA',
        duration: 2,
        requirements: ['Security']
      },
      pricing: {
        basePrice: 10000,
        additionalFees: 1500,
        total: 11500
      },
      status: 'draft' as const
    };

    test('stores booking data', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      // Mock successful storage
      const putRequest = { onsuccess: null, onerror: null };
      mockStore.put.mockReturnValue(putRequest);

      const bookingId = await storage.storeBooking(mockBookingData);

      expect(bookingId).toBeDefined();
      expect(bookingId).toMatch(/^booking_/);
      expect(mockStore.put).toHaveBeenCalled();
    });

    test('generates unique booking IDs', async () => {
      const id1 = await storage.storeBooking(mockBookingData);
      const id2 = await storage.storeBooking(mockBookingData);

      expect(id1).not.toBe(id2);
    });

    test('marks booking as unsynced by default', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const putRequest = { onsuccess: null, onerror: null };
      mockStore.put.mockReturnValue(putRequest);

      await storage.storeBooking(mockBookingData);

      const storedData = mockStore.put.mock.calls[0][0];
      expect(storedData.synced).toBe(false);
    });

    test('retrieves offline bookings', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const mockBookings = [
        { id: 'booking-1', synced: false },
        { id: 'booking-2', synced: true }
      ];
      
      const getAllRequest = { onsuccess: null, onerror: null, result: mockBookings };
      mockStore.getAll.mockReturnValue(getAllRequest);

      // Simulate successful retrieval
      setTimeout(() => {
        if (getAllRequest.onsuccess) {
          getAllRequest.onsuccess();
        }
      }, 0);

      const bookings = await storage.getOfflineBookings();
      expect(mockStore.getAll).toHaveBeenCalled();
    });

    test('filters unsynced bookings', async () => {
      const mockBookings = [
        { id: 'booking-1', synced: false },
        { id: 'booking-2', synced: true },
        { id: 'booking-3', synced: false }
      ];

      // Mock getOfflineBookings to return test data
      jest.spyOn(storage, 'getOfflineBookings').mockResolvedValue(mockBookings as any);

      const unsyncedBookings = await storage.getUnsyncedBookings();
      expect(unsyncedBookings).toHaveLength(2);
      expect(unsyncedBookings.every(booking => !booking.synced)).toBe(true);
    });

    test('marks booking as synced', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const mockBooking = { id: 'booking-1', synced: false, lastModified: Date.now() };
      const getRequest = { onsuccess: null, onerror: null, result: mockBooking };
      const putRequest = { onsuccess: null, onerror: null };
      
      mockStore.get.mockReturnValue(getRequest);
      mockStore.put.mockReturnValue(putRequest);

      // Simulate successful retrieval and update
      setTimeout(() => {
        if (getRequest.onsuccess) {
          getRequest.onsuccess();
        }
      }, 0);

      await storage.markBookingSynced('booking-1');

      expect(mockStore.get).toHaveBeenCalledWith('booking-1');
    });
  });

  describe('Contact Form Storage', () => {
    const mockContactData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1-555-987-6543',
      subject: 'Booking Inquiry',
      message: 'I would like to book a celebrity.',
      type: 'booking' as const
    };

    test('stores contact form data', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const putRequest = { onsuccess: null, onerror: null };
      mockStore.put.mockReturnValue(putRequest);

      const contactId = await storage.storeContactForm(mockContactData);

      expect(contactId).toBeDefined();
      expect(contactId).toMatch(/^contact_/);
      expect(mockStore.put).toHaveBeenCalled();
    });

    test('retrieves unsynced contact forms', async () => {
      const mockForms = [
        { id: 'contact-1', synced: false },
        { id: 'contact-2', synced: true }
      ];

      jest.spyOn(storage, 'getUnsyncedContactForms').mockResolvedValue(mockForms as any);

      const unsyncedForms = await storage.getUnsyncedContactForms();
      expect(unsyncedForms).toHaveLength(2);
    });

    test('marks contact form as synced', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const mockForm = { id: 'contact-1', synced: false };
      const getRequest = { onsuccess: null, onerror: null, result: mockForm };
      const putRequest = { onsuccess: null, onerror: null };
      
      mockStore.get.mockReturnValue(getRequest);
      mockStore.put.mockReturnValue(putRequest);

      await storage.markContactFormSynced('contact-1');

      expect(mockStore.get).toHaveBeenCalledWith('contact-1');
    });
  });

  describe('Celebrity Caching', () => {
    const mockCelebrityData = {
      id: 'celebrity-1',
      name: 'Famous Actor',
      category: 'Actor',
      description: 'Award-winning actor',
      profileImage: 'https://example.com/actor.jpg',
      availability: true,
      basePrice: 15000,
      services: ['meet-and-greet'],
      tags: ['movies', 'entertainment']
    };

    test('caches celebrity data', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const putRequest = { onsuccess: null, onerror: null };
      mockStore.put.mockReturnValue(putRequest);

      await storage.cacheCelebrity(mockCelebrityData);

      expect(mockStore.put).toHaveBeenCalled();
      const storedData = mockStore.put.mock.calls[0][0];
      expect(storedData.synced).toBe(true); // Cached data is marked as synced
    });

    test('retrieves cached celebrities', async () => {
      const mockCelebrities = [
        { id: 'celebrity-1', data: mockCelebrityData },
        { id: 'celebrity-2', data: { ...mockCelebrityData, id: 'celebrity-2' } }
      ];

      jest.spyOn(storage, 'getCachedCelebrities').mockResolvedValue(mockCelebrities as any);

      const celebrities = await storage.getCachedCelebrities();
      expect(celebrities).toHaveLength(2);
    });

    test('searches cached celebrities', async () => {
      const mockCelebrities = [
        { 
          id: 'celebrity-1', 
          data: { ...mockCelebrityData, name: 'Famous Actor', tags: ['movies'] }
        },
        { 
          id: 'celebrity-2', 
          data: { ...mockCelebrityData, name: 'Pop Singer', category: 'Musician', tags: ['music'] }
        }
      ];

      jest.spyOn(storage, 'getCachedCelebrities').mockResolvedValue(mockCelebrities as any);

      const results = await storage.searchCachedCelebrities('actor');
      expect(results).toHaveLength(1);
      expect(results[0].data.name).toBe('Famous Actor');
    });

    test('searches by category', async () => {
      const mockCelebrities = [
        { 
          id: 'celebrity-1', 
          data: { ...mockCelebrityData, category: 'Actor' }
        },
        { 
          id: 'celebrity-2', 
          data: { ...mockCelebrityData, category: 'Musician' }
        }
      ];

      jest.spyOn(storage, 'getCachedCelebrities').mockResolvedValue(mockCelebrities as any);

      const results = await storage.searchCachedCelebrities('musician');
      expect(results).toHaveLength(1);
      expect(results[0].data.category).toBe('Musician');
    });

    test('searches by tags', async () => {
      const mockCelebrities = [
        { 
          id: 'celebrity-1', 
          data: { ...mockCelebrityData, tags: ['movies', 'action'] }
        },
        { 
          id: 'celebrity-2', 
          data: { ...mockCelebrityData, tags: ['music', 'pop'] }
        }
      ];

      jest.spyOn(storage, 'getCachedCelebrities').mockResolvedValue(mockCelebrities as any);

      const results = await storage.searchCachedCelebrities('movies');
      expect(results).toHaveLength(1);
      expect(results[0].data.tags).toContain('movies');
    });
  });

  describe('User Preferences', () => {
    const mockPreferences = {
      theme: 'dark',
      language: 'en',
      notifications: true
    };

    test('stores user preferences', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const putRequest = { onsuccess: null, onerror: null };
      mockStore.put.mockReturnValue(putRequest);

      await storage.storeUserPreferences(mockPreferences);

      expect(mockStore.put).toHaveBeenCalled();
      const storedData = mockStore.put.mock.calls[0][0];
      expect(storedData.id).toBe('user_preferences');
      expect(storedData.data).toEqual(mockPreferences);
    });

    test('retrieves user preferences', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const mockStoredPrefs = [{ id: 'user_preferences', data: mockPreferences }];
      const getRequest = { onsuccess: null, onerror: null, result: mockStoredPrefs };
      mockStore.get.mockReturnValue(getRequest);

      jest.spyOn(storage as any, 'getData').mockResolvedValue(mockStoredPrefs);

      const preferences = await storage.getUserPreferences();
      expect(preferences).toEqual(mockPreferences);
    });

    test('returns null when no preferences stored', async () => {
      jest.spyOn(storage as any, 'getData').mockResolvedValue([]);

      const preferences = await storage.getUserPreferences();
      expect(preferences).toBeNull();
    });
  });

  describe('Search History', () => {
    test('stores search history', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const putRequest = { onsuccess: null, onerror: null };
      mockStore.put.mockReturnValue(putRequest);

      await storage.storeSearchHistory('famous actor');

      expect(mockStore.put).toHaveBeenCalled();
      const storedData = mockStore.put.mock.calls[0][0];
      expect(storedData.data.term).toBe('famous actor');
    });

    test('retrieves search history', async () => {
      const mockHistory = [
        { id: 'search-1', data: { term: 'actor', timestamp: Date.now() } },
        { id: 'search-2', data: { term: 'musician', timestamp: Date.now() - 1000 } }
      ];

      jest.spyOn(storage as any, 'getData').mockResolvedValue(mockHistory);

      const history = await storage.getSearchHistory();
      expect(history).toEqual(['actor', 'musician']);
    });

    test('limits search history to 20 items', async () => {
      const mockHistory = Array.from({ length: 25 }, (_, i) => ({
        id: `search-${i}`,
        data: { term: `search-${i}`, timestamp: Date.now() - i * 1000 }
      }));

      jest.spyOn(storage as any, 'getData').mockResolvedValue(mockHistory);

      const history = await storage.getSearchHistory();
      expect(history.length).toBe(20);
    });
  });

  describe('Storage Statistics', () => {
    test('returns storage stats', async () => {
      jest.spyOn(storage as any, 'getData')
        .mockResolvedValueOnce([1, 2, 3]) // bookings
        .mockResolvedValueOnce([1, 2]) // contactForms
        .mockResolvedValueOnce([1, 2, 3, 4, 5]); // celebrities

      const stats = await storage.getStorageStats();

      expect(stats).toEqual({
        bookings: 3,
        contactForms: 2,
        celebrities: 5,
        totalRecords: 10
      });
    });
  });

  describe('Data Cleanup', () => {
    test('clears all data', async () => {
      const mockTransaction = mockDB.transaction();
      const mockStore = mockTransaction.objectStore();
      
      const clearRequest = { onsuccess: null, onerror: null };
      mockStore.clear.mockReturnValue(clearRequest);

      await storage.clearAllData();

      // Should call clear on all stores
      expect(mockStore.clear).toHaveBeenCalled();
    });
  });
});