const CACHE_NAME = 'fleetease-v7';

self.addEventListener('install', (event) => {
  // Activate the new worker immediately so installed PWAs pick up deployments
  // without waiting for all existing tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Remove caches created by previous FleetEase service-worker versions.
      caches.keys().then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache auth, API, Next.js data/RSC, or navigations. These must always
  // reach the current production application and session.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    request.mode === 'navigate' ||
    request.headers.get('RSC') === '1'
  ) {
    return;
  }

  // Only cache immutable-ish static assets. Everything else remains network-only.
  const destination = request.destination;
  if (!['script', 'style', 'image', 'font'].includes(destination)) return;

  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
    )
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    data: data.data,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.link || '/'));
});
