import { useCallback, useEffect, useState } from 'react'
import { LIBRARY_CACHE_NAME } from './libraryCache'

const HANDBOOK_CACHE_NAME = 'icfd-content-v1'

const SUPABASE_URL  = (process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '').replace(/\/$/, '')
const SUPABASE_KEY  = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

const HANDBOOK_URLS = [
  '/data/content/en/handbook.json',
  '/data/content/tl/handbook.json',
  '/data/content/ceb/handbook.json',
]

// Matches the exact URL format used by catechism/girm/canon pages
function buildLibraryApiUrls(): string[] {
  if (!SUPABASE_URL) return []
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

export type OfflineCacheStatus = 'checking' | 'idle' | 'downloading' | 'done' | 'partial' | 'error' | 'unsupported'

export function useOfflineCache() {
  const [status, setStatus]   = useState<OfflineCacheStatus>('checking')
  const [progress, setProgress] = useState(0)   // 0–100
  const [failCount, setFailCount] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined' || !('caches' in window)) {
      setStatus('unsupported')
      return
    }
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
      const cachedLibrary  = new Set(libraryKeys.map((r) => r.url))
      const libraryUrls    = buildLibraryApiUrls()

      const handbookDone = HANDBOOK_URLS.every((u) => cachedHandbook.has(u))
      const libraryDone  = libraryUrls.length > 0 && libraryUrls.every((u) => cachedLibrary.has(u))

      if (handbookDone && libraryDone) {
        setStatus('done')
        setProgress(100)
      } else if (handbookDone || libraryKeys.length > 0) {
        setStatus('partial')
        const done = handbookKeys.length + libraryKeys.length
        const total = HANDBOOK_URLS.length + libraryUrls.length
        setProgress(Math.round((done / total) * 100))
      } else {
        setStatus('idle')
        setProgress(0)
      }
    } catch {
      setStatus('idle')
    }
  }

  const download = useCallback(async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return
    setStatus('downloading')
    setProgress(0)
    setFailCount(0)

    const libraryUrls = buildLibraryApiUrls()
    const total = HANDBOOK_URLS.length + libraryUrls.length
    let completed = 0
    let failed = 0

    const advance = () => {
      completed++
      setProgress(Math.round((completed / total) * 100))
    }

    // 1. Handbook JSON — static files, no auth needed
    const handbookCache = await caches.open(HANDBOOK_CACHE_NAME)
    for (const url of HANDBOOK_URLS) {
      try {
        const existing = await handbookCache.match(url)
        if (!existing) {
          const res = await fetch(url)
          if (res.ok) await handbookCache.put(url, res)
          else failed++
        }
      } catch {
        failed++
      }
      advance()
    }

    // 2. Library API — Supabase REST, needs auth headers
    if (!SUPABASE_KEY) {
      setStatus('error')
      return
    }
    const apiHeaders = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    const libraryCache = await caches.open(LIBRARY_CACHE_NAME)

    for (const url of libraryUrls) {
      try {
        const existing = await libraryCache.match(url)
        if (!existing) {
          const res = await fetch(url, { headers: apiHeaders })
          if (res.ok) {
            // Store a clone so the original can still be read
            await libraryCache.put(url, res.clone())
          } else {
            failed++
          }
        }
      } catch {
        failed++
      }
      advance()
    }

    setFailCount(failed)
    if (failed === 0) {
      setStatus('done')
    } else if (completed - failed > 0) {
      setStatus('partial')
    } else {
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
      setFailCount(0)
    } catch {
      setStatus('error')
    }
  }, [])

  return { status, progress, failCount, download, clear }
}
