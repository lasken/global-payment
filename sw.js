const CACHE = 'toomuchcoin-v1';
const STATIC = [
  '/',
  '/index.html',
  '/toomuchcoin.png',
  '/prices.json',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
  'https://cdn.jsdelivr.net/npm/appwrite@15.0.0/dist/iife/sdk.js',
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', e => {
  // Skip non-GET and Appwrite API calls — always fresh
  if(e.request.method !== 'GET') return;
  if(e.request.url.includes('appwrite.io')) return;
  if(e.request.url.includes('coingecko.com')) return;
  if(e.request.url.includes('flutterwave')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses
        if(res && res.status === 200 && res.type !== 'opaque'){
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => {
        if(cached) return cached;
        // Offline fallback — serve index.html for navigation requests
        if(e.request.mode === 'navigate'){
          return caches.match('/index.html');
        }
      }))
  );
});
