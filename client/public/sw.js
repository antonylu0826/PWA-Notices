// sw.js - Custom Service Worker
// This is injected by vite-plugin-pwa

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Basic cache strategy: cache-first for static assets, network-first for API
const CACHE_NAME = 'mobile-notice-v1';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip API requests
  if (url.pathname.startsWith('/api/')) return;

  // Cache static assets
  if (event.request.method === 'GET') {
    event.respondWith(
      caches
        .open(CACHE_NAME)
        .then(async (cache) => {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
  }
});
