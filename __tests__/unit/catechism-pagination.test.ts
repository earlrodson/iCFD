import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/libraryCache', () => ({
  cachedLibraryFetch: vi.fn(),
}))

import { cachedLibraryFetch } from '@/lib/libraryCache'
import { fetchParagraphs, PAGE_SIZE } from '@/lib/content/catechismFetch'

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
