const CACHE = 'toomuchcoin-v3';

// Let OneSignal handle its own messages
self.addEventListener('message', e => {
  if (!e.data) return;
  // Ignore OneSignal internal messages silently
  if (e.data.type && e.data.type.startsWith('onesignal')) return;
});

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  // Pass through all requests — no caching interference
  e.respondWith(fetch(e.request).catch(() => {
    return new Response('Offline', { status: 503 });
  }));
});
