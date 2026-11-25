const CACHE = 'ngondro-v2';

// The shell has to install even if a large image does not. One failed
// file in cache.addAll aborts the whole worker, which leaves the app
// unable to open offline.
const SHELL = [
  './index.html',
  './style.css',
  './base.css',
  './tokens.css',
  './app.js',
  './manifest.json',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/fonts/jomolhari-tibetan.woff2',
  './assets/fonts/jomolhari-latin.woff2',
];

const PICTURES = [
  './assets/thangka-1600.jpg',
  './assets/thangka-3200.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    await Promise.all(PICTURES.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function store(cache, request, response) {
  if (!response.ok || response.redirected) return Promise.resolve();
  return cache.put(request, response.clone()).catch(() => {});
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      const saving = store(cache, request, response);
      try { event.waitUntil(saving); } catch (ignored) { /* the response is already in hand */ }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw error;
    }
  })());
});
