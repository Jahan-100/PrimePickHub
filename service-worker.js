const CACHE = 'primepickhub-v5'; 
const ASSETS = ['/', '/index.html', '/css/main.css', '/js/config.js', '/js/api.js', '/js/app.js'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
    self.skipWaiting(); // Naya service worker foran activate ho jaye
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim(); // Naya service worker foran control le le
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    
    // ⭐ NETWORK-FIRST STRATEGY (Hamesha nayi file layega, agar internet na ho toh cache se dega)
    if (e.request.url.includes('.html') || e.request.url.includes('.js') || e.request.url.includes('.css')) {
        e.respondWith(
            fetch(e.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE).then(cache => cache.put(e.request, responseClone));
                    return response;
                })
                .catch(() => caches.match(e.request)) // Agar internet na ho toh cache se do
        );
    } else {
        // Cache-First for images, fonts
        e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    }
});
