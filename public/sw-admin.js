// Service Worker for Admin Dashboard
const CACHE_NAME = 'atelierzo-admin-v1';
const ADMIN_URLS_TO_CACHE = [
  '/pilotage',
  '/pilotage/orders',
  '/pilotage/products',
  '/pilotage/clients',
  '/pilotage/vente-flash',
  '/pilotage/satisfied-clients',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ADMIN_URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('atelierzo-admin-')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first for admin pages
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle admin routes
  if (!url.pathname.startsWith('/pilotage')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  let data = { title: 'Nouvelle commande', body: 'Vous avez reçu une nouvelle commande', icon: '/icon.png' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    tag: 'new-order',
    requireInteraction: true,
    data: {
      url: data.url || '/pilotage/orders',
    },
    actions: [
      {
        action: 'view',
        title: 'Voir',
      },
      {
        action: 'close',
        title: 'Fermer',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    const url = event.notification.data?.url || '/pilotage/orders';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});
