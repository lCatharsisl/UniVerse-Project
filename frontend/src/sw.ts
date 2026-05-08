/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: string[] };

self.addEventListener('install', () => {
  void self.skipWaiting();
});

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 16,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);

registerRoute(
  ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: 'assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 48,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  })
);

registerRoute(
  ({ request }) => ['image', 'font'].includes(request.destination),
  new CacheFirst({
    cacheName: 'media',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

type PushPayload = {
  title?: string;
  body?: string;
  tag?: string;
  url?: string;
  notificationId?: number;
};

self.addEventListener('push', (event) => {
  let data: PushPayload = {};
  try {
    if (event.data) {
      data = event.data.json() as PushPayload;
    }
  } catch {
    /* ignore */
  }
  const title = data.title?.trim() || 'UniVerse';
  const body = data.body?.trim() || 'New notification';
  const tag = data.tag?.trim() || 'universe-push';
  const url = typeof data.url === 'string' && data.url.length ? data.url : '/notifications';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url, notificationId: data.notificationId },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data as { url?: string } | undefined;
  let targetUrl = typeof raw?.url === 'string' && raw.url.length ? raw.url : '/notifications';
  try {
    targetUrl = new URL(targetUrl, self.location.origin).href;
  } catch {
    targetUrl = new URL('/notifications', self.location.origin).href;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
          const c = client as WindowClient;
          void c.navigate(targetUrl);
          return c.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
