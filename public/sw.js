const CACHE_NAME = 'vital-ai-v3';
const urlsToCache = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/lovable-uploads/f0a83c6d-2693-487a-91eb-7080ad19fbc1.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if found
        if (response) {
          return response;
        }
        
        // For navigation requests, serve index.html for SPA routing
        if (event.request.mode === 'navigate') {
          return caches.match('/') || fetch('/');
        }
        
        // For all other requests, fetch from network
        return fetch(event.request);
      })
      .catch(() => {
        // If offline and it's a navigation request, serve index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete all caches to force fresh content
          return caches.delete(cacheName);
        })
      ).then(() => {
        // Claim all clients to force using new SW immediately
        return self.clients.claim();
      });
    })
  );
});