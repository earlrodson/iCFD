import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/libraryCache', () => ({
  cachedLibraryFetch: vi.fn(),
}))

import { cachedLibraryFetch } from '@/lib/libraryCache'
import { fetchParagraphs, getCachedParagraphs, PAGE_SIZE } from '@/lib/content/catechismFetch'

// Mirrors a real behavior of the browser Cache API that our hand-rolled
// mock would otherwise silently allow: Cache.put() throws for any key whose
// scheme isn't http/https (e.g. a custom "swr://" key), which bit the real
// implementation once already (jsdom's own Request ctor doesn't enforce this).
function fakeCaches() {
  const store = new Map<string, Response>()
  return {
    open: async () => ({
      match: async (key: string) => store.get(key),
      put: async (key: string, res: Response) => {
        if (!/^https?:\/\//.test(key)) {
          throw new TypeError(`Failed to execute 'put' on 'Cache': Request scheme is unsupported`)
        }
        store.set(key, res)
      },
    }),
  }
}

function paragraphs(count: number, startAt = 1): { paragraph: number; text: string; summary: string; section: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    paragraph: startAt + i,
    text: `text ${startAt + i}`,
    summary: `summary ${startAt + i}`,
    section: 'Part One',
  }))
}

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

beforeEach(() => {
  vi.mocked(cachedLibraryFetch).mockReset()
})

describe('fetchParagraphs', () => {
  it('returns all rows in a single request when under PAGE_SIZE', async () => {
    vi.mocked(cachedLibraryFetch).mockResolvedValueOnce(jsonResponse(paragraphs(308, 2558)))

    const result = await fetchParagraphs(2558, 2865)

    expect(result).toHaveLength(308)
    expect(cachedLibraryFetch).toHaveBeenCalledTimes(1)
  })

  it('pages through a range larger than PAGE_SIZE and combines all rows', async () => {
    // Part One has 1065 paragraphs — exceeds PAGE_SIZE (1000), so this must
    // make a second request for the remaining 65 rather than truncating them.
    vi.mocked(cachedLibraryFetch)
      .mockResolvedValueOnce(jsonResponse(paragraphs(PAGE_SIZE, 1)))
      .mockResolvedValueOnce(jsonResponse(paragraphs(65, PAGE_SIZE + 1)))

    const result = await fetchParagraphs(1, 1065)

    expect(result).toHaveLength(1065)
    expect(cachedLibraryFetch).toHaveBeenCalledTimes(2)
  })

  it('requests the second page with the correct offset', async () => {
    vi.mocked(cachedLibraryFetch)
      .mockResolvedValueOnce(jsonResponse(paragraphs(PAGE_SIZE, 1)))
      .mockResolvedValueOnce(jsonResponse(paragraphs(65, PAGE_SIZE + 1)))

    await fetchParagraphs(1, 1065)

    const secondCallUrl = vi.mocked(cachedLibraryFetch).mock.calls[1][0]
    expect(secondCallUrl).toContain(`offset=${PAGE_SIZE}`)
  })

  it('stops paginating once a page comes back exactly empty', async () => {
    vi.mocked(cachedLibraryFetch)
      .mockResolvedValueOnce(jsonResponse(paragraphs(PAGE_SIZE, 1)))
      .mockResolvedValueOnce(jsonResponse([]))

    const result = await fetchParagraphs(1, PAGE_SIZE)

    expect(result).toHaveLength(PAGE_SIZE)
    expect(cachedLibraryFetch).toHaveBeenCalledTimes(2)
  })

  it('returns rows collected so far when a later page request fails', async () => {
    vi.mocked(cachedLibraryFetch)
      .mockResolvedValueOnce(jsonResponse(paragraphs(PAGE_SIZE, 1)))
      .mockResolvedValueOnce(jsonResponse(null, false))

    const result = await fetchParagraphs(1, 1065)

    expect(result).toHaveLength(PAGE_SIZE)
  })

  it('returns an empty array when the request throws', async () => {
    vi.mocked(cachedLibraryFetch).mockRejectedValueOnce(new Error('offline'))

    const result = await fetchParagraphs(1, 1065)

    expect(result).toEqual([])
  })
})

describe('stale-while-revalidate cache', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', fakeCaches())
  })

  it('getCachedParagraphs returns null when nothing has been cached yet', async () => {
    const result = await getCachedParagraphs(1, 1065)
    expect(result).toBeNull()
  })

  it('a successful fetchParagraphs populates the cache for that exact range', async () => {
    vi.mocked(cachedLibraryFetch).mockResolvedValueOnce(jsonResponse(paragraphs(308, 2558)))

    await fetchParagraphs(2558, 2865)
    const cached = await getCachedParagraphs(2558, 2865)

    expect(cached).toHaveLength(308)
  })

  it('does not leak a cache hit into an unrelated range', async () => {
    vi.mocked(cachedLibraryFetch).mockResolvedValueOnce(jsonResponse(paragraphs(308, 2558)))

    await fetchParagraphs(2558, 2865)
    const cached = await getCachedParagraphs(1066, 1690)

    expect(cached).toBeNull()
  })

  it('does not cache a partial result from a failed page', async () => {
    vi.mocked(cachedLibraryFetch)
      .mockResolvedValueOnce(jsonResponse(paragraphs(PAGE_SIZE, 1)))
      .mockResolvedValueOnce(jsonResponse(null, false))

    await fetchParagraphs(1, 1065)
    const cached = await getCachedParagraphs(1, 1065)

    expect(cached).toBeNull()
  })

  it('does not cache anything when the request throws', async () => {
    vi.mocked(cachedLibraryFetch).mockRejectedValueOnce(new Error('offline'))

    await fetchParagraphs(1, 1065)
    const cached = await getCachedParagraphs(1, 1065)

    expect(cached).toBeNull()
  })
})
