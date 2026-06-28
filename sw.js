const CACHE = 'toomuchcoin-v2';
const STATIC = [
  '/index.html',
  '/toomuchcoin.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(STATIC))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Never intercept these — always go to network
  if (url.hostname.includes('appwrite.io')) return;
  if (url.hostname.includes('coingecko.com')) return;
  if (url.hostname.includes('flutterwave.com')) return;
  if (url.hostname.includes('allorigins.win')) return;
  if (url.hostname.includes('finance.yahoo.com')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('onesignal.com')) return;
  if (url.hostname.includes('corsproxy.io')) return;
  if (url.protocol === 'chrome-extension:') return;

  // For navigation requests (page loads) — always serve index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch('/index.html')
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For same-origin static assets only — cache first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
      })
    );
  }
  // All other requests (CDN, external APIs) — just pass through
});
