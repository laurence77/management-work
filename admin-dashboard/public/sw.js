// Service Worker for Celebrity Booking Admin PWA
const CACHE_NAME = 'celebrity-booking-admin-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';
const API_CACHE = 'api-v1.0.0';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/bookings',
  '/api/celebrities',
  '/api/analytics',
  '/api/chat',
  '/api/auth/me'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  CACHE_ONLY: 'cache-only',
  NETWORK_ONLY: 'network-only',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('SW: Static assets cached successfully');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip service worker for auth requests to avoid interference
  if (url.pathname.includes('/auth/')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico)$/)) {
    // Static assets - cache first
    event.respondWith(handleStaticAsset(request));
  } else {
    // HTML pages - network first with offline fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      
      // Only cache GET requests
      if (request.method === 'GET') {
        cache.put(request.clone(), networkResponse.clone());
      }
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('SW: Network failed for API request, trying cache:', url.pathname);
    
    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for specific endpoints
    return getOfflineApiResponse(url.pathname);
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Failed to load static asset:', request.url);
    
    // Return placeholder for images
    if (request.destination === 'image') {
      return new Response(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">Image Unavailable</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful page responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request.clone(), networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('SW: Network failed for page request, trying cache');
    
    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback offline response
    return new Response(
      getOfflineHtml(),
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
}

// Generate offline API responses
function getOfflineApiResponse(pathname) {
  const offlineData = {
    '/api/bookings': {
      success: false,
      error: 'Offline mode - bookings data unavailable',
      cached: true,
      data: []
    },
    '/api/celebrities': {
      success: false,
      error: 'Offline mode - celebrities data unavailable',
      cached: true,
      data: []
    },
    '/api/analytics': {
      success: false,
      error: 'Offline mode - analytics data unavailable',
      cached: true,
      data: { offline: true }
    }
  };

  const data = offlineData[pathname] || {
    success: false,
    error: 'Offline mode - data unavailable',
    cached: true
  };

  return new Response(
    JSON.stringify(data),
    { 
      headers: { 'Content-Type': 'application/json' },
      status: 200
    }
  );
}

// Generate offline HTML page
function getOfflineHtml() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Celebrity Booking Admin</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f8fafc;
          color: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .offline-container {
          text-align: center;
          max-width: 500px;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .offline-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          background: #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
        }
        h1 {
          margin: 0 0 16px;
          color: #1e293b;
          font-size: 24px;
          font-weight: 600;
        }
        p {
          margin: 0 0 24px;
          color: #64748b;
          line-height: 1.6;
        }
        .retry-button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .retry-button:hover {
          background: #1d4ed8;
        }
        .features {
          margin-top: 32px;
          text-align: left;
        }
        .feature-item {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px;
          background: #f1f5f9;
          border-radius: 6px;
        }
        .feature-icon {
          width: 20px;
          height: 20px;
          margin-right: 12px;
          color: #10b981;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📱</div>
        <h1>You're Offline</h1>
        <p>
          No internet connection detected. Some features may be limited, 
          but you can still access cached content and use offline capabilities.
        </p>
        
        <button class="retry-button" onclick="window.location.reload()">
          Try Again
        </button>
        
        <div class="features">
          <h3>Available Offline:</h3>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span>View cached bookings data</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span>Access celebrity profiles</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span>Review analytics dashboard</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span>Browse cached chat messages</span>
          </div>
        </div>
      </div>
      
      <script>
        // Auto-retry when back online
        window.addEventListener('online', () => {
          window.location.reload();
        });
        
        // Show online/offline status
        function updateOnlineStatus() {
          if (navigator.onLine) {
            window.location.reload();
          }
        }
        
        window.addEventListener('online', updateOnlineStatus);
      </script>
    </body>
    </html>
  `;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-bookings') {
    event.waitUntil(syncOfflineBookings());
  } else if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncOfflineMessages());
  }
});

// Sync offline bookings when back online
async function syncOfflineBookings() {
  try {
    console.log('SW: Syncing offline bookings');
    
    // Get offline bookings from IndexedDB
    const offlineBookings = await getOfflineData('bookings');
    
    for (const booking of offlineBookings) {
      try {
        await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking)
        });
        
        // Remove from offline storage after successful sync
        await removeOfflineData('bookings', booking.id);
      } catch (error) {
        console.error('SW: Failed to sync booking:', error);
      }
    }
  } catch (error) {
    console.error('SW: Background sync failed:', error);
  }
}

// Sync offline messages when back online
async function syncOfflineMessages() {
  try {
    console.log('SW: Syncing offline messages');
    
    // Get offline messages from IndexedDB
    const offlineMessages = await getOfflineData('messages');
    
    for (const message of offlineMessages) {
      try {
        await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        // Remove from offline storage after successful sync
        await removeOfflineData('messages', message.id);
      } catch (error) {
        console.error('SW: Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('SW: Message sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('SW: Push notification received');
  
  const options = {
    body: 'You have new updates in your booking dashboard',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: '/screenshots/notification-banner.png',
    tag: 'booking-update',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options.body = payload.body || options.body;
      options.data = { ...options.data, ...payload.data };
    } catch (error) {
      console.error('SW: Failed to parse push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Celebrity Booking Admin', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default click - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Utility functions for IndexedDB operations
async function getOfflineData(storeName) {
  // In a real implementation, this would use IndexedDB
  // For now, return empty array
  return [];
}

async function removeOfflineData(storeName, id) {
  // In a real implementation, this would remove from IndexedDB
  console.log(`SW: Removing offline data from ${storeName} with id ${id}`);
}

// Cache cleanup - run periodically
setInterval(() => {
  caches.open(DYNAMIC_CACHE).then((cache) => {
    cache.keys().then((requests) => {
      // Remove old cached responses (older than 7 days)
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      requests.forEach((request) => {
        cache.match(request).then((response) => {
          if (response) {
            const cachedDate = new Date(response.headers.get('date'));
            if (cachedDate.getTime() < oneWeekAgo) {
              cache.delete(request);
              console.log('SW: Removed old cached response:', request.url);
            }
          }
        });
      });
    });
  });
}, 24 * 60 * 60 * 1000); // Run daily