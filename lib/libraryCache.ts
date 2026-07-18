export const LIBRARY_CACHE_NAME = 'icfd-library-v1'

/**
 * Cache-first fetch for Library API calls (catechism, GIRM, canon).
 * Stores responses by URL string so Vary headers don't cause mismatches.
 * On first fetch, populates the cache automatically for subsequent offline use.
 */
export async function cachedLibraryFetch(
  url: string,
  headers: Record<string, string>,
): Promise<Response> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return fetch(url, { headers })
  }
  const cache = await caches.open(LIBRARY_CACHE_NAME)
  const cached = await cache.match(url)
  if (cached) return cached
  const res = await fetch(url, { headers })
  if (res.ok) await cache.put(url, res.clone())
  return res
}
