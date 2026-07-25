'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Safety net for navigations that never actually change the URL (e.g. an
// anchor back to the current page, or one that errors before committing).
const FAILSAFE_MS = 8000

/**
 * A top-of-screen loading bar for page navigation, since every content page
 * in this app is a client component that fetches after mount — without this,
 * tapping a link on a slow mobile connection shows nothing until the new
 * page's own spinner kicks in.
 */
function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const activeRef = useRef(false)
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (trickleRef.current) clearInterval(trickleRef.current)
    if (failsafeRef.current) clearTimeout(failsafeRef.current)
    if (fadeRef.current) clearTimeout(fadeRef.current)
  }, [])

  const finish = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearTimers()
    setProgress(100)
    fadeRef.current = setTimeout(() => setProgress(0), 250)
  }, [clearTimers])

  const start = useCallback(() => {
    activeRef.current = true
    clearTimers()
    setProgress(10)
    trickleRef.current = setInterval(() => {
      setProgress((p) => (p < 85 ? p + (85 - p) * 0.1 : p))
    }, 200)
    failsafeRef.current = setTimeout(finish, FAILSAFE_MS)
  }, [clearTimers, finish])

  // Intercept same-origin, same-tab link clicks app-wide so the bar starts
  // the instant a navigation begins, not once the new page has rendered.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement)?.closest('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      start()
    }
    // Capture phase: Next's own <Link> onClick calls preventDefault() to do
    // client-side routing, and that handler runs before a bubble-phase
    // listener on document would ever see the event. Capturing here means
    // this listener sees the click before Link's handler touches it.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [start])

  useEffect(() => {
    window.addEventListener('popstate', start)
    return () => window.removeEventListener('popstate', start)
  }, [start])

  // The URL actually changed — the new route has committed, so the
  // navigation this bar was tracking is done.
  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => clearTimers, [clearTimers])

  if (progress === 0) return null

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed inset-x-0 top-0 z-[9999] h-[3px] pointer-events-none"
    >
      <div
        className="h-full bg-primary transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  )
}

export function NavigationProgress() {
  return <NavigationProgressInner />
}
