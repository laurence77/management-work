/**
 * Offline Storage Utilities for Celebrity Booking Platform
 * Provides IndexedDB-based storage for critical offline functionality
 */

interface OfflineData {
  id: string;
  data: any;
  timestamp: number;
  lastModified: number;
  synced: boolean;
}

interface BookingData extends OfflineData {
  data: {
    celebrityId: string;
    serviceId: string;
    eventDate: string;
    clientInfo: {
      name: string;
      email: string;
      phone: string;
    };
    eventDetails: {
      location: string;
      duration: number;
      requirements: string[];
    };
    pricing: {
      basePrice: number;
      additionalFees: number;
      total: number;
    };
    status: 'draft' | 'pending' | 'confirmed' | 'cancelled';
  };
}

interface ContactFormData extends OfflineData {
  data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    type: 'general' | 'booking' | 'support';
  };
}

interface CelebrityData extends OfflineData {
  data: {
    id: string;
    name: string;
    category: string;
    description: string;
    profileImage: string;
    availability: boolean;
    basePrice: number;
    services: string[];
    tags: string[];
  };
}

class OfflineStorageManager {
  private dbName = 'CelebrityBookingOffline';
  private version = 1;
  private db: IDBDatabase | null = null;

  // Store names
  private stores = {
    bookings: 'bookings',
    contactForms: 'contactForms',
    celebrities: 'celebrities',
    services: 'services',
    userPreferences: 'userPreferences',
    searchHistory: 'searchHistory',
    cachedImages: 'cachedImages'
  };

  constructor() {
    this.initDB();
  }

  /**
   * Initialize IndexedDB database
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('OfflineStorage: IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        Object.values(this.stores).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('synced', 'synced');
            
            if (storeName === this.stores.bookings) {
              store.createIndex('status', 'data.status');
              store.createIndex('celebrityId', 'data.celebrityId');
            }
            
            if (storeName === this.stores.celebrities) {
              store.createIndex('category', 'data.category');
              store.createIndex('availability', 'data.availability');
            }
          }
        });
      };
    });
  }

  /**
   * Ensure database is ready
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    return this.db!;
  }

  /**
   * Generic method to store data
   */
  private async storeData(storeName: string, data: OfflineData): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      
      request.onsuccess = () => {
        console.log(`OfflineStorage: Data stored in ${storeName}:`, data.id);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`OfflineStorage: Failed to store data in ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Generic method to retrieve data
   */
  private async getData(storeName: string, id?: string): Promise<OfflineData[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      if (id) {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result ? [request.result] : []);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      }
    });
  }

  /**
   * Generic method to delete data
   */
  private async deleteData(storeName: string, id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log(`OfflineStorage: Deleted data from ${storeName}:`, id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store booking data for offline access
   */
  async storeBooking(bookingData: BookingData['data']): Promise<string> {
    const id = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const booking: BookingData = {
      id,
      data: bookingData,
      timestamp: Date.now(),
      lastModified: Date.now(),
      synced: false
    };

    await this.storeData(this.stores.bookings, booking);
    return id;
  }

  /**
   * Get all offline bookings
   */
  async getOfflineBookings(): Promise<BookingData[]> {
    return this.getData(this.stores.bookings) as Promise<BookingData[]>;
  }

  /**
   * Get unsynced bookings
   */
  async getUnsyncedBookings(): Promise<BookingData[]> {
    const bookings = await this.getOfflineBookings();
    return bookings.filter(booking => !booking.synced);
  }

  /**
   * Mark booking as synced
   */
  async markBookingSynced(id: string): Promise<void> {
    const bookings = await this.getData(this.stores.bookings, id);
    if (bookings.length > 0) {
      const booking = bookings[0] as BookingData;
      booking.synced = true;
      booking.lastModified = Date.now();
      await this.storeData(this.stores.bookings, booking);
    }
  }

  /**
   * Store contact form data
   */
  async storeContactForm(formData: ContactFormData['data']): Promise<string> {
    const id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contact: ContactFormData = {
      id,
      data: formData,
      timestamp: Date.now(),
      lastModified: Date.now(),
      synced: false
    };

    await this.storeData(this.stores.contactForms, contact);
    return id;
  }

  /**
   * Get unsynced contact forms
   */
  async getUnsyncedContactForms(): Promise<ContactFormData[]> {
    const forms = await this.getData(this.stores.contactForms) as ContactFormData[];
    return forms.filter(form => !form.synced);
  }

  /**
   * Mark contact form as synced
   */
  async markContactFormSynced(id: string): Promise<void> {
    const forms = await this.getData(this.stores.contactForms, id);
    if (forms.length > 0) {
      const form = forms[0] as ContactFormData;
      form.synced = true;
      form.lastModified = Date.now();
      await this.storeData(this.stores.contactForms, form);
    }
  }

  /**
   * Cache celebrity data for offline browsing
   */
  async cacheCelebrity(celebrityData: CelebrityData['data']): Promise<void> {
    const celebrity: CelebrityData = {
      id: celebrityData.id,
      data: celebrityData,
      timestamp: Date.now(),
      lastModified: Date.now(),
      synced: true
    };

    await this.storeData(this.stores.celebrities, celebrity);
  }

  /**
   * Get cached celebrities
   */
  async getCachedCelebrities(): Promise<CelebrityData[]> {
    return this.getData(this.stores.celebrities) as Promise<CelebrityData[]>;
  }

  /**
   * Search cached celebrities
   */
  async searchCachedCelebrities(query: string): Promise<CelebrityData[]> {
    const celebrities = await this.getCachedCelebrities();
    const lowercaseQuery = query.toLowerCase();
    
    return celebrities.filter(celebrity => 
      celebrity.data.name.toLowerCase().includes(lowercaseQuery) ||
      celebrity.data.category.toLowerCase().includes(lowercaseQuery) ||
      celebrity.data.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Store user preferences
   */
  async storeUserPreferences(preferences: any): Promise<void> {
    const userPref = {
      id: 'user_preferences',
      data: preferences,
      timestamp: Date.now(),
      lastModified: Date.now(),
      synced: false
    };

    await this.storeData(this.stores.userPreferences, userPref);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<any> {
    const prefs = await this.getData(this.stores.userPreferences, 'user_preferences');
    return prefs.length > 0 ? prefs[0].data : null;
  }

  /**
   * Store search history
   */
  async storeSearchHistory(searchTerm: string): Promise<void> {
    const id = `search_${Date.now()}`;
    const search = {
      id,
      data: { term: searchTerm, timestamp: Date.now() },
      timestamp: Date.now(),
      lastModified: Date.now(),
      synced: false
    };

    await this.storeData(this.stores.searchHistory, search);
    
    // Keep only last 50 searches
    await this.cleanupSearchHistory();
  }

  /**
   * Get search history
   */
  async getSearchHistory(): Promise<string[]> {
    const searches = await this.getData(this.stores.searchHistory);
    return searches
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map(search => search.data.term);
  }

  /**
   * Clean up old search history
   */
  private async cleanupSearchHistory(): Promise<void> {
    const searches = await this.getData(this.stores.searchHistory);
    if (searches.length > 50) {
      const toDelete = searches
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, searches.length - 50);
      
      for (const search of toDelete) {
        await this.deleteData(this.stores.searchHistory, search.id);
      }
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    bookings: number;
    contactForms: number;
    celebrities: number;
    totalRecords: number;
  }> {
    const [bookings, contactForms, celebrities] = await Promise.all([
      this.getData(this.stores.bookings),
      this.getData(this.stores.contactForms),
      this.getData(this.stores.celebrities)
    ]);

    return {
      bookings: bookings.length,
      contactForms: contactForms.length,
      celebrities: celebrities.length,
      totalRecords: bookings.length + contactForms.length + celebrities.length
    };
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    const storeNames = Object.values(this.stores);
    
    for (const storeName of storeNames) {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    console.log('OfflineStorage: All data cleared');
  }

  /**
   * Check if storage is available
   */
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageManager();

// Export class for testing
export { OfflineStorageManager };

// Export types for use in components
export type {
  OfflineData,
  BookingData,
  ContactFormData,
  CelebrityData
};