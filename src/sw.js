// Service worker customizado — o vite-plugin-pwa injeta o manifesto de
// precache aqui (self.__WB_MANIFEST) no build. Trocamos o modo padrão
// (generateSW, que gera tudo sozinho) por injectManifest só porque
// generateSW não deixa adicionar os listeners de push/notificationclick
// abaixo, essenciais pro lembrete de leitura funcionar de verdade (ver
// src/notifications/pushStore.js e api/send-reading-reminders.js).
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)

// Mesmas duas rotas de runtime caching que existiam na config generateSW
// (vite.config.js antigo) — portadas pra cá pra não perder cache offline.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
)

registerRoute(
  ({ url }) => /\/bible-text\/.*\.json$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'bible-text-cache-v2',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

// Lembrete diário de leitura (api/send-reading-reminders.js) chega aqui.
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch { /* payload não era JSON */ }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Jesus' Corner", {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    })
  )
})

// Clicar na notificação foca uma aba já aberta em vez de abrir uma nova,
// se possível.
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
      return undefined
    })
  )
})
