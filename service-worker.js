// PrimePickHub Service Worker (Dummy - No Caching)
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        return caches.delete(key); // Purana saara cache delete kar do
      }));
    })
  );
  self.clients.claim();
});

// Koi fetch handler nahi hai, iska matlab browser hamesha internet se nayi file layega
