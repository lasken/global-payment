const CACHE = 'toomuchcoin-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Ignore non-GET, chrome-extension, and all external APIs
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension')) return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Only handle same-origin navigation — serve index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch('/index.html').catch(() => new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      }))
    );
  }
  // Everything else — do nothing, let browser handle normally
});
