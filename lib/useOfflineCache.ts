import { useCallback, useEffect, useState } from 'react'

const CACHE_NAME = 'icfd-content-v1'

const CONTENT_URLS = [
  '/data/content/en/handbook.json',
  '/data/content/tl/handbook.json',
  '/data/content/ceb/handbook.json',
]

export type OfflineCacheStatus = 'checking' | 'idle' | 'downloading' | 'done' | 'error' | 'unsupported'

export function useOfflineCache() {
  const [status, setStatus] = useState<OfflineCacheStatus>('checking')
  const [progress, setProgress] = useState(0) // 0–100

  useEffect(() => {
    if (!('caches' in window)) { setStatus('unsupported'); return }
    checkStatus()
  }, [])

  async function checkStatus() {
    try {
      const cache = await caches.open(CACHE_NAME)
      const keys = await cache.keys()
      const cached = new Set(keys.map((r) => new URL(r.url).pathname))
      const allCached = CONTENT_URLS.every((u) => cached.has(u))
      setStatus(allCached ? 'done' : 'idle')
      if (allCached) setProgress(100)
    } catch {
      setStatus('idle')
    }
  }

  const download = useCallback(async () => {
    if (!('caches' in window)) return
    setStatus('downloading')
    setProgress(0)
    try {
      const cache = await caches.open(CACHE_NAME)
      for (let i = 0; i < CONTENT_URLS.length; i++) {
        await cache.add(CONTENT_URLS[i])
        setProgress(Math.round(((i + 1) / CONTENT_URLS.length) * 100))
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [])

  const clear = useCallback(async () => {
    try {
      await caches.delete(CACHE_NAME)
      setStatus('idle')
      setProgress(0)
    } catch {
      setStatus('error')
    }
  }, [])

  return { status, progress, download, clear }
}
