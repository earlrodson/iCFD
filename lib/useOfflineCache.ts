import { useCallback, useEffect, useState } from 'react'
import { LIBRARY_CACHE_NAME } from './libraryCache'

const HANDBOOK_CACHE_NAME = 'icfd-content-v1'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const HANDBOOK_URLS = [
  '/data/content/en/handbook.json',
  '/data/content/tl/handbook.json',
  '/data/content/ceb/handbook.json',
]

// Build all Supabase REST API URLs that the Library pages fetch
function buildLibraryApiUrls(): string[] {
  const urls: string[] = []

  // Catechism — 4 parts
  const cccParts: [number, number][] = [[1, 1065], [1066, 1690], [1691, 2557], [2558, 2865]]
  for (const [from, to] of cccParts) {
    const p = new URLSearchParams({
      paragraph: `gte.${from}`,
      and: `(paragraph.lte.${to})`,
      lang: 'eq.en',
      text: 'not.is.null',
      order: 'paragraph.asc',
      select: 'paragraph,text,summary,section',
      limit: '200',
    })
    urls.push(`${SUPABASE_URL}/rest/v1/ccc_paragraphs?${p}`)
  }

  // GIRM — 10 sections
  const girmChapters: [number, number][] = [
    [1, 15], [16, 26], [27, 90], [91, 111], [112, 287],
    [288, 318], [319, 351], [352, 367], [368, 385], [386, 399],
  ]
  for (const [from, to] of girmChapters) {
    const p = new URLSearchParams({
      article: `gte.${from}`,
      and: `(article.lte.${to})`,
      lang: 'eq.en',
      text: 'not.is.null',
      order: 'article.asc',
      select: 'article,text,summary,section',
      limit: '300',
    })
    urls.push(`${SUPABASE_URL}/rest/v1/girm_articles?${p}`)
  }

  // Canon Law — 7 books
  const canonBooks: [number, number][] = [
    [1, 203], [204, 746], [747, 833], [834, 1253],
    [1254, 1310], [1311, 1399], [1400, 1752],
  ]
  for (const [from, to] of canonBooks) {
    const p = new URLSearchParams({
      canon: `gte.${from}`,
      and: `(canon.lte.${to})`,
      lang: 'eq.en',
      text: 'not.is.null',
      order: 'canon.asc',
      select: 'canon,text,summary,book',
      limit: '600',
    })
    urls.push(`${SUPABASE_URL}/rest/v1/canons?${p}`)
  }

  return urls
}

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
      const [handbookCache, libraryCache] = await Promise.all([
        caches.open(HANDBOOK_CACHE_NAME),
        caches.open(LIBRARY_CACHE_NAME),
      ])
      const [handbookKeys, libraryKeys] = await Promise.all([
        handbookCache.keys(),
        libraryCache.keys(),
      ])
      const cachedHandbook = new Set(handbookKeys.map((r) => new URL(r.url).pathname))
      const cachedLibrary = new Set(libraryKeys.map((r) => r.url))
      const libraryUrls = buildLibraryApiUrls()
      const allDone =
        HANDBOOK_URLS.every((u) => cachedHandbook.has(u)) &&
        libraryUrls.every((u) => cachedLibrary.has(u))
      setStatus(allDone ? 'done' : 'idle')
      if (allDone) setProgress(100)
    } catch {
      setStatus('idle')
    }
  }

  const download = useCallback(async () => {
    if (!('caches' in window)) return
    setStatus('downloading')
    setProgress(0)

    const libraryUrls = buildLibraryApiUrls()
    const total = HANDBOOK_URLS.length + libraryUrls.length
    let completed = 0

    const advance = () => {
      completed++
      setProgress(Math.round((completed / total) * 100))
    }

    try {
      // 1. Handbook JSON files
      const handbookCache = await caches.open(HANDBOOK_CACHE_NAME)
      for (const url of HANDBOOK_URLS) {
        await handbookCache.add(url)
        advance()
      }

      // 2. Library API responses (Supabase REST)
      const libraryCache = await caches.open(LIBRARY_CACHE_NAME)
      const apiHeaders = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      for (const url of libraryUrls) {
        const cached = await libraryCache.match(url)
        if (!cached) {
          const res = await fetch(url, { headers: apiHeaders })
          if (res.ok) await libraryCache.put(url, res)
        }
        advance()
      }

      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [])

  const clear = useCallback(async () => {
    try {
      await Promise.all([
        caches.delete(HANDBOOK_CACHE_NAME),
        caches.delete(LIBRARY_CACHE_NAME),
      ])
      setStatus('idle')
      setProgress(0)
    } catch {
      setStatus('error')
    }
  }, [])

  return { status, progress, download, clear }
}
