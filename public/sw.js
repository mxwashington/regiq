// RegIQ Service Worker - PWA Functionality
const CACHE_NAME = 'regiq-v1.0.0';
const API_CACHE_NAME = 'regiq-api-v1.0.0';
const STATIC_CACHE_NAME = 'regiq-static-v1.0.0';

// URLs to cache for offline functionality - mobile-optimized
const STATIC_URLS = [
  '/',
  '/dashboard',
  '/search',
  '/auth',
  '/manifest.json',
  '/offline.html'
];

// Mobile-specific resources to cache
const MOBILE_CACHE_URLS = [
  '/assets/fonts/',
  '/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/alerts/,
  /\/api\/search/,
  /supabase\.co.*\/rest\/v1\/alerts/,
  /supabase\.co.*\/rest\/v1\/regulatory_data_sources/
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_URLS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
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
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'Data not available offline' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
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
