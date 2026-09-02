'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const VISITOR_ID_KEY = 'icfd_visitor_id'

/** Stable per-browser id, persisted across visits — survives sign-in/out so a guest's history joins up once they create an account. */
function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_ID_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function sendDuration(id: number, enteredAt: number) {
  const durationMs = Date.now() - enteredAt
  const payload = JSON.stringify({ id, visitorId: getVisitorId(), durationMs })
  const sent = typeof navigator.sendBeacon === 'function'
    && navigator.sendBeacon('/api/analytics/duration', new Blob([payload], { type: 'application/json' }))
  if (!sent) {
    fetch('/api/analytics/duration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }
}

/**
 * Silent, render-nothing tracker mounted once in the root layout. Logs a
 * pageview on every route change and reports time-on-page (via sendBeacon)
 * the moment the visitor navigates away or the tab is hidden/closed.
 * Admin routes are excluded — that's the site owner's own browsing, not
 * visitor traffic.
 */
export function PageTracker() {
  const pathname = usePathname()
  const viewRef = useRef<{ id: number; enteredAt: number } | null>(null)
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (viewRef.current) {
      sendDuration(viewRef.current.id, viewRef.current.enteredAt)
      viewRef.current = null
    }

    const referrerPath = prevPathRef.current
    prevPathRef.current = pathname

    if (pathname.startsWith('/admin')) return

    let cancelled = false
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: getVisitorId(), path: pathname, referrerPath }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.id) viewRef.current = { id: data.id, enteredAt: Date.now() }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [pathname])

  useEffect(() => {
    function flush() {
      if (viewRef.current) {
        sendDuration(viewRef.current.id, viewRef.current.enteredAt)
        viewRef.current = null
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  return null
}
