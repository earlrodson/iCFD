import { describe, it, expect, vi, beforeEach } from 'vitest'

// ContentLoader uses fetch internally — mock it
const mockHandbook = {
  topics: [
    {
      id: 'baptism-necessity',
      category: 'sacraments',
      title: 'The Necessity of Baptism',
      question: 'Is baptism necessary?',
      answer: 'Yes.',
      tags: ['baptism'],
      difficulty: 'beginner',
      lang: 'en',
      scripture: [],
      lastUpdated: '2024-01-01',
    },
  ],
}

beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn())
})

describe('ContentLoader', () => {
  it('loads and parses content for a valid language', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHandbook,
    } as Response)

    const { contentLoader } = await import('@/lib/content/loader')
    contentLoader.clearCache()

    const result = await contentLoader.loadContent('en')
    expect(result.topics).toHaveLength(1)
    expect(result.topics[0].id).toBe('baptism-necessity')
  })

  it('uses cache on second call without re-fetching', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHandbook,
    } as Response)

    const { contentLoader } = await import('@/lib/content/loader')
    contentLoader.clearCache()

    await contentLoader.loadContent('en')
    await contentLoader.loadContent('en')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('fetches separately for each language', async () => {
    const tlHandbook = { topics: [{ ...mockHandbook.topics[0], lang: 'tl' }] }
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockHandbook } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => tlHandbook } as Response)

    const { contentLoader } = await import('@/lib/content/loader')
    contentLoader.clearCache()

    await contentLoader.loadContent('en')
    await contentLoader.loadContent('tl')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/en/')
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain('/tl/')
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const { contentLoader } = await import('@/lib/content/loader')
    contentLoader.clearCache()

    await expect(contentLoader.loadContent('ceb')).rejects.toThrow('404')
  })

  it('throws when response fails Zod validation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ topics: [{ id: 'bad', category: 'invalid-cat' }] }),
    } as Response)

    const { contentLoader } = await import('@/lib/content/loader')
    contentLoader.clearCache()

    await expect(contentLoader.loadContent('en')).rejects.toThrow()
  })
})
