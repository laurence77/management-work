// Service Worker for Celebrity Booking Platform PWA
const CACHE_NAME = 'celebrity-booking-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';
const API_CACHE = 'api-v1.0.0';
const IMAGE_CACHE = 'images-v1.0.0';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/celebrities',
  '/services',
  '/offline.html'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/celebrities',
  '/api/services',
  '/api/events',
  '/api/settings/public'
];

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
                cacheName !== API_CACHE &&
                cacheName !== IMAGE_CACHE) {
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
  } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    // Images - cache first with network fallback
    event.respondWith(handleImageRequest(request));
  } else if (url.pathname.match(/\.(js|css|woff|woff2|ttf|ico)$/)) {
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
    const networkResponse = await fetch(request.clone(), {
      headers: {
        ...request.headers,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (networkResponse.ok) {
      // Cache successful responses for public endpoints
      if (request.method === 'GET' && isPublicEndpoint(url.pathname)) {
        const cache = await caches.open(API_CACHE);
        cache.put(request.clone(), networkResponse.clone());
      }
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('SW: Network failed for API request, trying cache:', url.pathname);
    
    // Try cache fallback for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline response for specific endpoints
    return getOfflineApiResponse(url.pathname);
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Failed to load image:', request.url);
    
    // Return placeholder image
    return new Response(
      `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#f3f4f6"/>
        <text x="200" y="150" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="sans-serif" font-size="16">
          Image Unavailable
        </text>
      </svg>`,
      { 
        headers: { 
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'max-age=86400'
        } 
      }
    );
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

// Check if endpoint is public and cacheable
function isPublicEndpoint(pathname) {
  const publicEndpoints = [
    '/api/celebrities',
    '/api/services',
    '/api/events',
    '/api/settings/public'
  ];
  
  return publicEndpoints.some(endpoint => pathname.startsWith(endpoint));
}

// Generate offline API responses
function getOfflineApiResponse(pathname) {
  const offlineData = {
    '/api/celebrities': {
      success: true,
      data: [],
      message: 'Cached data - limited when offline',
      offline: true
    },
    '/api/services': {
      success: true,
      data: [],
      message: 'Cached data - limited when offline',
      offline: true
    },
    '/api/events': {
      success: true,
      data: [],
      message: 'Cached data - limited when offline',
      offline: true
    }
  };

  const data = offlineData[pathname] || {
    success: false,
    error: 'This feature requires an internet connection',
    offline: true
  };

  return new Response(
    JSON.stringify(data),
    { 
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
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
      <title>Offline - Celebrity Booking Platform</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        
        .offline-container {
          text-align: center;
          max-width: 600px;
          background: rgba(255, 255, 255, 0.95);
          padding: 48px 40px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }
        
        .offline-icon {
          width: 120px;
          height: 120px;
          margin: 0 auto 32px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 48px;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        }
        
        h1 {
          margin: 0 0 16px;
          color: #1e293b;
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .subtitle {
          font-size: 18px;
          color: #64748b;
          margin-bottom: 32px;
          line-height: 1.6;
        }
        
        .retry-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
          margin-bottom: 32px;
        }
        
        .retry-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(102, 126, 234, 0.4);
        }
        
        .features {
          text-align: left;
          background: #f8fafc;
          padding: 24px;
          border-radius: 12px;
          margin-top: 32px;
        }
        
        .features h3 {
          color: #1e293b;
          font-size: 20px;
          margin-bottom: 16px;
          text-align: center;
        }
        
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }
        
        .feature-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .feature-icon {
          width: 24px;
          height: 24px;
          margin-right: 12px;
          color: #10b981;
          font-weight: bold;
        }
        
        .status-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          background: currentColor;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @media (max-width: 640px) {
          .offline-container {
            padding: 32px 24px;
          }
          
          h1 {
            font-size: 24px;
          }
          
          .subtitle {
            font-size: 16px;
          }
          
          .feature-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="status-indicator">
        <div class="status-dot"></div>
        <span id="status-text">Offline</span>
      </div>
      
      <div class="offline-container">
        <div class="offline-icon">🌟</div>
        <h1>You're Offline</h1>
        <p class="subtitle">
          No internet connection detected. Don't worry - you can still browse 
          cached content and explore our celebrity booking platform.
        </p>
        
        <button class="retry-button" onclick="window.location.reload()">
          ↻ Try Again
        </button>
        
        <div class="features">
          <h3>✨ Available Offline</h3>
          <div class="feature-grid">
            <div class="feature-item">
              <span class="feature-icon">👑</span>
              <span>Browse celebrity profiles</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎭</span>
              <span>View service categories</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📱</span>
              <span>Access contact information</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">⭐</span>
              <span>Read testimonials</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎉</span>
              <span>Explore event galleries</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">💎</span>
              <span>Browse VIP experiences</span>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        // Update status indicator
        function updateOnlineStatus() {
          const statusText = document.getElementById('status-text');
          const statusIndicator = document.querySelector('.status-indicator');
          
          if (navigator.onLine) {
            statusText.textContent = 'Back Online';
            statusIndicator.style.background = '#10b981';
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            statusText.textContent = 'Offline';
            statusIndicator.style.background = '#ef4444';
          }
        }
        
        // Listen for online/offline events
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Auto-retry when back online
        window.addEventListener('online', () => {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
        
        // Check connection status periodically
        setInterval(() => {
          fetch('/api/health', { 
            method: 'HEAD',
            cache: 'no-cache',
            mode: 'no-cors'
          }).then(() => {
            if (!navigator.onLine) {
              // Manual connection check succeeded
              window.location.reload();
            }
          }).catch(() => {
            // Still offline
          });
        }, 30000); // Check every 30 seconds
      </script>
    </body>
    </html>
  `;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncOfflineBookings());
  } else if (event.tag === 'sync-contact-forms') {
    event.waitUntil(syncContactForms());
  }
});

// Sync offline bookings when back online
async function syncOfflineBookings() {
  try {
    console.log('SW: Syncing offline bookings');
    
    // This would integrate with IndexedDB in a full implementation
    const offlineBookings = await getOfflineData('bookings');
    
    for (const booking of offlineBookings) {
      try {
        await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking)
        });
        
        await removeOfflineData('bookings', booking.id);
      } catch (error) {
        console.error('SW: Failed to sync booking:', error);
      }
    }
  } catch (error) {
    console.error('SW: Background sync failed:', error);
  }
}

// Sync contact forms when back online
async function syncContactForms() {
  try {
    console.log('SW: Syncing contact forms');
    
    const offlineForms = await getOfflineData('contact-forms');
    
    for (const form of offlineForms) {
      try {
        await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        
        await removeOfflineData('contact-forms', form.id);
      } catch (error) {
        console.error('SW: Failed to sync contact form:', error);
      }
    }
  } catch (error) {
    console.error('SW: Contact form sync failed:', error);
  }
}

// Push notifications for marketing and updates
self.addEventListener('push', (event) => {
  console.log('SW: Push notification received');
  
  const options = {
    body: 'Discover exclusive celebrity experiences and luxury services',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: '/screenshots/notification-banner.png',
    tag: 'celebrity-update',
    renotify: false,
    requireInteraction: false,
    actions: [
      {
        action: 'explore',
        title: 'Explore Now',
        icon: '/icons/action-explore.png'
      },
      {
        action: 'later',
        title: 'Maybe Later',
        icon: '/icons/action-later.png'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now(),
      category: 'marketing'
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
    self.registration.showNotification('Celebrity Booking Platform', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification clicked:', event.action);
  
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow(targetUrl)
    );
  } else if (event.action === 'later') {
    // Just close the notification
    return;
  } else {
    // Default click - open or focus the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  }
});

// Utility functions for IndexedDB operations (simplified for demo)
async function getOfflineData(storeName) {
  // In a real implementation, this would use IndexedDB
  return [];
}

async function removeOfflineData(storeName, id) {
  // In a real implementation, this would remove from IndexedDB
  console.log(`SW: Would remove offline data from ${storeName} with id ${id}`);
}

// Periodic cache cleanup
setInterval(() => {
  // Clean up old dynamic cache entries
  caches.open(DYNAMIC_CACHE).then((cache) => {
    cache.keys().then((requests) => {
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
  
  // Clean up old image cache entries
  caches.open(IMAGE_CACHE).then((cache) => {
    cache.keys().then((requests) => {
      if (requests.length > 100) { // Keep only 100 most recent images
        requests.slice(0, requests.length - 100).forEach((request) => {
          cache.delete(request);
        });
      }
    });
  });
}, 24 * 60 * 60 * 1000); // Run daily