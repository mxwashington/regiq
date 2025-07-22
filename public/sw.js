
// RegIQ Service Worker - Optimized Performance
const BUILD_VERSION = Date.now().toString();
const CACHE_NAME = `regiq-v${BUILD_VERSION}`;
const API_CACHE_NAME = `regiq-api-v${BUILD_VERSION}`;
const STATIC_CACHE_NAME = `regiq-static-v${BUILD_VERSION}`;

// Reduced cache configuration for better performance
const CACHE_CONFIG = {
  maxAge: {
    static: 24 * 60 * 60 * 1000,    // 24 hours for static assets
    api: 2 * 60 * 1000,             // 2 minutes for API responses (reduced)
    alerts: 30 * 1000               // 30 seconds for alerts (reduced)
  },
  maxEntries: {
    static: 50,     // Reduced
    api: 25,        // Reduced
    alerts: 100     // Reduced
  }
};

// URLs to cache for offline functionality
const STATIC_URLS = [
  '/',
  '/dashboard',
  '/manifest.json'
];

// API endpoints to cache (simplified)
const API_CACHE_PATTERNS = [
  /supabase\.co.*\/rest\/v1\/alerts/,
  /supabase\.co.*\/rest\/v1\/regulatory_data_sources/
];

// Install event - simplified caching
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', BUILD_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache only essential static resources
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        console.log('[SW] Caching essential static resources');
        try {
          await cache.addAll(STATIC_URLS);
        } catch (error) {
          console.warn('[SW] Some static resources failed to cache:', error);
        }
        
        // Store version info in cache
        const versionResponse = new Response(JSON.stringify({
          version: BUILD_VERSION,
          timestamp: Date.now()
        }));
        await cache.put('/sw-version', versionResponse);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - aggressive cleanup
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', BUILD_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
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
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
  
  // Notify clients of activation
  broadcastToClients({ type: 'SW_ACTIVATED', version: BUILD_VERSION });
});

// Fetch event - simplified strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Let Supabase requests pass through directly without caching interference
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Handle different types of requests
  if (isStaticResource(url)) {
    // Static resources: Cache First strategy
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (isNavigationRequest(request)) {
    // Navigation requests: Network First
    event.respondWith(handleNavigation(request));
  }
  // Let all other requests pass through normally
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.action === 'GET_VERSION') {
    event.ports[0].postMessage({ version: BUILD_VERSION });
  }
});

// Helper Functions - Simplified

function isStaticResource(url) {
  return url.pathname.includes('.') || 
         STATIC_URLS.includes(url.pathname) ||
         url.pathname.startsWith('/assets/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
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

async function handleNavigation(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation failed, serving cached version');
    // Serve cached version
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match('/') || 
                           new Response('Offline', { status: 503 });
    
    return cachedResponse;
  }
}

function broadcastToClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}
