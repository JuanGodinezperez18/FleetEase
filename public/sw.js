/**
 * FleetEase service worker — network-first / almost network-only.
 * Caching JS/CSS caused "This page couldn't load" on installed mobile PWAs
 * after deploys (stale chunks). We only keep push notification support and
 * wipe every old cache on activate.
 */
const CACHE_NAME = 'fleetease-v8-network';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete ALL caches from previous versions (not only non-matching names).
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Never intercept app shell, Next.js bundles, API, RSC or navigations.
  // Letting the browser hit the network avoids stale-chunk failures in PWAs.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/manifest.json' ||
    request.mode === 'navigate' ||
    request.headers.get('RSC') === '1' ||
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'worker'
  ) {
    return;
  }

  // Optional: network-first for images/fonts only (never block on cache).
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'FleetEase', {
        body: data.body,
        icon: data.icon || '/web-app-manifest-192x192.png',
        data: data.data,
      })
    );
  } catch {
    // ignore malformed push payloads
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/dashboard';
  event.waitUntil(clients.openWindow(link));
});
