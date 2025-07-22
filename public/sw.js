// RegIQ Service Worker - Enhanced Cache Busting
const BUILD_VERSION = Date.now().toString(); // Dynamic version based on build time
const CACHE_NAME = `regiq-v${BUILD_VERSION}`;
const API_CACHE_NAME = `regiq-api-v${BUILD_VERSION}`;
const STATIC_CACHE_NAME = `regiq-static-v${BUILD_VERSION}`;

// Cache configuration
const CACHE_CONFIG = {
  maxAge: {
    static: 24 * 60 * 60 * 1000,    // 24 hours for static assets
    api: 5 * 60 * 1000,             // 5 minutes for API responses
    alerts: 60 * 1000               // 1 minute for alerts
  },
  maxEntries: {
    static: 100,
    api: 50,
    alerts: 200
  }
};

// URLs to cache for offline functionality
const STATIC_URLS = [
  '/',
  '/dashboard',
  '/search',
  '/manifest.json',
  '/offline.html'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/alerts/,
  /\/api\/search/,
  /supabase\.co.*\/rest\/v1\/alerts/,
  /supabase\.co.*\/rest\/v1\/regulatory_data_sources/
];

// Install event - cache static resources and broadcast version
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', BUILD_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache static resources with version info
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        console.log('[SW] Caching static resources');
        await cache.addAll(STATIC_URLS);
        
        // Store version info in cache
        const versionResponse = new Response(JSON.stringify({
          version: BUILD_VERSION,
          timestamp: Date.now(),
          cacheNames: {
            static: STATIC_CACHE_NAME,
            api: API_CACHE_NAME,
            main: CACHE_NAME
          }
        }));
        await cache.put('/cache-version', versionResponse);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
  
  // Broadcast new version available
  broadcastToClients({ type: 'NEW_VERSION', version: BUILD_VERSION });
});

// Activate event - aggressive cache cleanup and client claiming
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', BUILD_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Aggressively clean up ALL old caches
      caches.keys().then((cacheNames) => {
        const currentCaches = [CACHE_NAME, API_CACHE_NAME, STATIC_CACHE_NAME];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Clear session storage issues
      clearStaleSessionData(),
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
  
  // Notify clients of activation
  broadcastToClients({ type: 'SW_ACTIVATED', version: BUILD_VERSION });
});

// Fetch event - handle network requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

// Handle different types of requests with appropriate strategies
  if (isStaticResource(url)) {
    // Static resources: Cache First strategy
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (url.hostname.includes('supabase.co')) {
    // Supabase requests: Let them pass through directly
    return;
  } else if (isAPIRequest(url)) {
    // API requests: Network First with cache fallback
    event.respondWith(networkFirstWithCache(request, API_CACHE_NAME));
  } else if (isNavigationRequest(request)) {
    // Navigation requests: Network First with offline page fallback
    event.respondWith(handleNavigation(request));
  } else {
    // Other requests: Network First
    event.respondWith(networkFirst(request));
  }
});

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'alert-dismiss-sync') {
    event.waitUntil(syncAlertDismissals());
  } else if (event.tag === 'search-sync') {
    event.waitUntil(syncOfflineSearches());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'New regulatory alert available',
    icon: '/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png',
    badge: '/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard'
    },
    actions: [
      {
        action: 'view',
        title: 'View Alert',
        icon: '/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png'
      }
    ],
    requireInteraction: true,
    tag: 'regulatory-alert'
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      options.body = pushData.message || options.body;
      options.data = { ...options.data, ...pushData.data };
    } catch (e) {
      console.log('[SW] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification('RegIQ Alert', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/dashboard')
    );
  } else if (event.action === 'dismiss') {
    // Handle dismissal if needed
    console.log('[SW] Alert dismissed via notification');
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Helper Functions

function isStaticResource(url) {
  return url.pathname.includes('.') || 
         STATIC_URLS.includes(url.pathname) ||
         url.pathname.startsWith('/assets/');
}

function isAPIRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Serve from cache
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    return new Response('Offline content not available', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    // Try network first with cache headers
    const networkResponse = await fetch(request, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (networkResponse.ok) {
      // Add cache control headers and cache response
      const responseWithHeaders = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...networkResponse.headers,
          'Cache-Control': getCacheControlForRequest(request),
          'X-Cache-Version': BUILD_VERSION,
          'X-Cache-Timestamp': Date.now().toString()
        }
      });
      
      const cache = await caches.open(cacheName);
      cache.put(request, responseWithHeaders.clone());
      return responseWithHeaders;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cached response is stale
      const cacheTimestamp = cachedResponse.headers.get('X-Cache-Timestamp');
      const cacheVersion = cachedResponse.headers.get('X-Cache-Version');
      
      if (cacheVersion !== BUILD_VERSION || 
          (cacheTimestamp && Date.now() - parseInt(cacheTimestamp) > CACHE_CONFIG.maxAge.api)) {
        console.log('[SW] Cached response is stale, removing');
        cache.delete(request);
        return createOfflineResponse();
      }
      
      return cachedResponse;
    }
    
    return createOfflineResponse();
  }
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('[SW] Network request failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

async function handleNavigation(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page');
    // Serve offline page or cached version
    const cache = await caches.open(STATIC_CACHE_NAME);
    const offlineResponse = await cache.match('/offline.html') || 
                           await cache.match('/');
    
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

async function syncAlertDismissals() {
  try {
    console.log('[SW] Syncing alert dismissals...');
    // Implementation for syncing offline alert dismissals
    // This would sync with your Supabase backend
  } catch (error) {
    console.log('[SW] Alert sync failed:', error);
  }
}

async function syncOfflineSearches() {
  try {
    console.log('[SW] Syncing offline searches...');
    // Implementation for syncing offline searches
  } catch (error) {
    console.log('[SW] Search sync failed:', error);
  }
}

// Enhanced helper functions for cache busting

function getCacheControlForRequest(request) {
  const url = new URL(request.url);
  
  if (url.pathname.includes('/alerts')) {
    return 'public, max-age=60, stale-while-revalidate=30';
  } else if (url.pathname.includes('/api/')) {
    return 'public, max-age=300, stale-while-revalidate=60';
  } else if (url.pathname.includes('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  
  return 'no-cache, no-store, must-revalidate';
}

function createOfflineResponse() {
  return new Response(JSON.stringify({ 
    error: 'Offline', 
    message: 'Data not available offline',
    version: BUILD_VERSION,
    timestamp: Date.now()
  }), {
    status: 503,
    headers: { 
      'Content-Type': 'application/json',
      'X-Cache-Version': BUILD_VERSION
    }
  });
}

async function clearStaleSessionData() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: 'CLEAR_STALE_DATA',
        version: BUILD_VERSION 
      });
    });
  } catch (error) {
    console.log('[SW] Error clearing stale data:', error);
  }
}

function broadcastToClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.action === 'GET_VERSION') {
    event.ports[0].postMessage({ version: BUILD_VERSION });
  }
});
