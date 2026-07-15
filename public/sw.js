// Development stub. @ducanh2912/next-pwa overwrites this file during production build.
// This stub prevents /sw.js 404/500 in dev and clears any stale production caches.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
