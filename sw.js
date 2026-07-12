importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
// Toomuchcoin Service Worker v5
// Message listener MUST be at top level for OneSignal
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data === 'skipWaiting') { self.skipWaiting(); return; }
});

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Let OneSignal and Appwrite handle their own requests
  if (url.includes('onesignal') || url.includes('appwrite')) return;
  // Pass everything else through
  e.respondWith(
    fetch(e.request).catch(() => new Response('Offline', { status: 503 }))
  );
});
