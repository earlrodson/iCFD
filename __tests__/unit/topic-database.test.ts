import { describe, it, expect, vi, beforeEach } from 'vitest'

// topicRowToTopic is not exported — test it indirectly via loadTopicFromDatabase
// by mocking the REST fetch that database.ts uses internally.

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'sacred-images',
  lang: 'en',
  category: 'tradition',
  title: 'Sacred Images and Statues',
  question: "Why do Catholics use sacred images?",
  answer: 'Catholics do not worship statues.',
  answer_full: null,
  scripture: [{ reference: 'Exodus 25:18', text: 'Make two cherubim.', version: 'NABRE' }],
  catechism: ['CCC 1159', 'CCC 2130'],
  church_fathers: [{ author: 'St. John Damascene', quote: 'I do not worship matter.', source: 'On the Divine Images' }],
  objections: [{ objection: 'Exodus 20 forbids images.', response: 'God commanded images in Exodus 25.' }],
  tags: ['sacred-images', 'idolatry'],
  difficulty: 'intermediate',
  related_topics: ['communion-of-saints'],
  last_updated: '2026-07-16T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  vi.stubGlobal('fetch', vi.fn())
})

describe('loadTopicFromDatabase — field mapping', () => {
  it('maps basic fields correctly', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [makeRow()],
    } as Response)

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic).not.toBeNull()
    expect(topic!.id).toBe('sacred-images')
    expect(topic!.title).toBe('Sacred Images and Statues')
    expect(topic!.category).toBe('tradition')
    expect(topic!.difficulty).toBe('intermediate')
    expect(topic!.lang).toBe('en')
  })

  it('maps scripture array correctly', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [makeRow()],
    } as Response)

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.scripture).toHaveLength(1)
    expect(topic!.scripture[0].reference).toBe('Exodus 25:18')
    expect(topic!.scripture[0].version).toBe('NABRE')
  })

  it('maps objections array correctly', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [makeRow()],
    } as Response)

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.objections).toHaveLength(1)
    expect(topic!.objections![0].objection).toBe('Exodus 20 forbids images.')
    expect(topic!.objections![0].response).toBe('God commanded images in Exodus 25.')
  })

  it('maps answer_full when present', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [makeRow({ answer_full: '## Full Essay\n\nComprehensive content here.' })],
    } as Response)

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.answerFull).toBe('## Full Essay\n\nComprehensive content here.')
  })

  it('sets answerFull to undefined when answer_full is null', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [makeRow({ answer_full: null })],
    } as Response)

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.answerFull).toBeUndefined()
  })

  it('extracts summary from {summary, full} JSONB object for concise answer', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [makeRow({ answer: { summary: 'Short answer.', full: 'Long markdown essay.' } })],
    } as Response)

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.answer).toBe('Short answer.')
  })

  it('falls back to full when summary is missing from answer object', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [makeRow({ answer: { full: 'Full content only.' } })],
    } as Response)

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.answer).toBe('Full content only.')
  })

  it('returns empty arrays for null JSONB fields', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [makeRow({ scripture: null, catechism: null, church_fathers: null, objections: null })],
    } as Response)

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.scripture).toEqual([])
    expect(topic!.catechism).toEqual([])
    expect(topic!.churchFathers).toEqual([])
    expect(topic!.objections).toEqual([])
  })

  it('returns null when no rows returned', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('nonexistent', 'en')

    expect(topic).toBeNull()
  })

  it('returns null when Supabase is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')

    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('loadTopicsFromDatabase — collection loading', () => {
  it('returns null when fetch returns empty array', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    const { loadTopicsFromDatabase } = await import('@/lib/content/database')
    const result = await loadTopicsFromDatabase('en')

    expect(result).toBeNull()
  })

  it('maps multiple rows into HandbookContent', async () => {
    const rows = [
      makeRow({ id: 'topic-1', title: 'Topic One' }),
      makeRow({ id: 'topic-2', title: 'Topic Two' }),
    ]
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => rows,
    } as Response)

    const { loadTopicsFromDatabase } = await import('@/lib/content/database')
    const result = await loadTopicsFromDatabase('en')

    expect(result).not.toBeNull()
    expect(result!.topics).toHaveLength(2)
    expect(result!.topics[0].id).toBe('topic-1')
    expect(result!.topics[1].id).toBe('topic-2')
  })

  it('includes answer_full in each topic when present', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [makeRow({ answer_full: '## Essay\n\nContent.' })],
    } as Response)

    const { loadTopicsFromDatabase } = await import('@/lib/content/database')
    const result = await loadTopicsFromDatabase('en')

    expect(result!.topics[0].answerFull).toBe('## Essay\n\nContent.')
  })
})
