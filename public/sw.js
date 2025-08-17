const CACHE_NAME = 'vital-ai-v4';
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
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Failed to cache some resources:', err);
          return Promise.resolve();
        });
      })
  );
});

self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if found
        if (response) {
          return response;
        }
        
        // For navigation requests, serve index.html for SPA routing
        if (event.request.mode === 'navigate') {
          return caches.match('/').then(cachedResponse => {
            return cachedResponse || fetch('/').catch(() => {
              return new Response('App offline', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              });
            });
          });
        }
        
        // For all other requests, fetch from network
        return fetch(event.request).catch(() => {
          return new Response('Resource unavailable', {
            status: 404,
            statusText: 'Not Found',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
      .catch(() => {
        // Fallback response
        return new Response('Service unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        return self.clients.claim();
      });
    })
  );
});