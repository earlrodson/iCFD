import { cachedLibraryFetch } from '@/lib/libraryCache'

export interface CccParagraph {
  paragraph: number
  text: string
  summary: string
  section: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const PAGE_SIZE = 1000

// Separate from cachedLibraryFetch's per-request HTTP cache: this stores the
// already-merged, already-paginated result for a (from, to) range, so a
// stale-while-revalidate read is one lookup instead of re-walking pages.
const SWR_CACHE_NAME = 'icfd-catechism-swr-v1'

// Cache API requires a real http(s) Request as the key — a custom scheme
// like "swr://" is rejected outright (Cache.put throws synchronously), so
// this is scoped under an unroutable path on the app's own origin instead.
function swrKey(from: number, to: number): string {
  return `${window.location.origin}/__swr-cache__/catechism-part/${from}-${to}`
}

/** Instant, network-free read of the last known-good result for a range, or null if never cached. */
export async function getCachedParagraphs(from: number, to: number): Promise<CccParagraph[] | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null
  const cache = await caches.open(SWR_CACHE_NAME)
  const cached = await cache.match(swrKey(from, to))
  if (!cached) return null
  try {
    return await cached.json()
  } catch {
    return null
  }
}

async function cacheParagraphs(from: number, to: number, data: CccParagraph[]): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return
  const cache = await caches.open(SWR_CACHE_NAME)
  await cache.put(swrKey(from, to), new Response(JSON.stringify(data)))
}

export async function fetchParagraphs(from: number, to: number): Promise<CccParagraph[]> {
  try {
    const all: CccParagraph[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const params = new URLSearchParams({
        paragraph: `gte.${from}`,
        and: `(paragraph.lte.${to})`,
        lang: 'eq.en',
        text: 'not.is.null',
        order: 'paragraph.asc',
        select: 'paragraph,text,summary,section',
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      const res = await cachedLibraryFetch(
        `${SUPABASE_URL}/rest/v1/ccc_paragraphs?${params}`,
        { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      )
      // A failed page leaves `all` incomplete — return it as a best-effort
      // result, but don't let it poison the SWR cache with partial data.
      if (!res.ok) return all
      const page: CccParagraph[] = await res.json()
      all.push(...page)
      if (page.length < PAGE_SIZE) break
    }
    await cacheParagraphs(from, to, all)
    return all
  } catch {
    return []
  }
}
