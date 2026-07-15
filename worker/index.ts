/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; url?: string } = {}
  try {
    payload = event.data.json() as typeof payload
  } catch {
    payload = { title: 'Codex Defensoris', body: event.data.text() }
  }

  const title = payload.title ?? 'Codex Defensoris'
  const options: NotificationOptions = {
    body: payload.body ?? 'Your daily apologetics topic is ready.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: 'daily-topic',
    renotify: true,
    data: { url: payload.url ?? '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url === url && 'focus' in c)
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
