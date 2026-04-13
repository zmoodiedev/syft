// Minimal service worker — enables PWA installability (required for Web Share Target)
// No caching: all requests pass through to the network.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
