import { useCallback, useEffect, useState } from 'react'

const CACHE_NAME = 'icfd-content-v1'
const STORAGE_KEY = 'icfd-offline-topics'

const HANDBOOK_URLS = [
  '/data/content/en/handbook.json',
  '/data/content/tl/handbook.json',
  '/data/content/ceb/handbook.json',
]

function getSavedTopics(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveTopic(id: string) {
  const saved = getSavedTopics()
  saved.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved]))
}

function removeTopic(id: string) {
  const saved = getSavedTopics()
  saved.delete(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved]))
}

export type TopicCacheStatus = 'idle' | 'downloading' | 'done' | 'error'

export function useTopicOfflineCache(topicId: string) {
  const [status, setStatus] = useState<TopicCacheStatus>('idle')
  const supported = typeof window !== 'undefined' && 'caches' in window

  useEffect(() => {
    if (!supported) return
    const saved = getSavedTopics()
    if (saved.has(topicId)) setStatus('done')
  }, [topicId, supported])

  const download = useCallback(async () => {
    if (!supported) return
    setStatus('downloading')
    try {
      const cache = await caches.open(CACHE_NAME)

      // Cache the topic page HTML
      await cache.add(`/${topicId}`)

      // Cache handbook JSONs (no-op if already present)
      await Promise.all(
        HANDBOOK_URLS.map((url) =>
          cache.match(url).then((hit) => (hit ? undefined : cache.add(url)))
        )
      )

      saveTopic(topicId)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [topicId, supported])

  const remove = useCallback(async () => {
    if (!supported) return
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.delete(`/${topicId}`)
      removeTopic(topicId)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [topicId, supported])

  return { status, supported, download, remove }
}
