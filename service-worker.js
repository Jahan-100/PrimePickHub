// PrimePickHub Service Worker (PWA Caching)
const CACHE_NAME = 'primepickhub-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/utils.js',
  '/js/config.js',
  '/js/api.js',
  '/js/app.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/manifest.json'
];

// Install Event - Cache Static Assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event - Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Serve from Cache, Fallback to Network
self.addEventListener('fetch', (event) => {
  // Bypass API calls and Admin pages (Always fetch fresh from network)
  if (event.request.url.includes('/api/') || event.request.url.includes('/admin.html') || event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Return Cache
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache new images/scripts dynamically
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Fallback for offline (optional)
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
