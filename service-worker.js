// ⭐ Naya Version v6 taake purana cache foran delete ho jaye ⭐
const CACHE = 'primepickhub-v6'; 
const ASSETS = ['/assets/icon-192.png', '/assets/icon-512.png']; // Sirf images cache karenge

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
    
    // ⭐ HTML, JS, aur CSS ko hamesha Network se layega (Kabhi cache nahi karega) ⭐
    if (e.request.url.includes('.html') || e.request.url.includes('.js') || e.request.url.includes('.css')) {
        e.respondWith(
            fetch(e.request, { cache: 'no-store' }) // 'no-store' ka matlab hai latest file lao
        );
    } else {
        // Images aur fonts ke liye pehle cache check karega, warna network se layega
        e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    }
});
