import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Topic rows now store integer IDs into reference tables
const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'sacred-images',
  lang: 'en',
  category: 'tradition',
  title: 'Sacred Images and Statues',
  question: 'Why do Catholics use sacred images?',
  answer: 'Catholics do not worship statues.',
  answer_full: null,
  scripture: [1],       // references scripture_verses.id
  catechism: [1159, 2130],
  church_fathers: [1],  // references church_father_quotes.id
  objections: [{ objection: 'Exodus 20 forbids images.', response: 'God commanded images in Exodus 25.' }],
  tags: ['sacred-images', 'idolatry'],
  difficulty: 'intermediate',
  related_topics: ['communion-of-saints'],
  last_updated: '2026-07-16T00:00:00Z',
  ...overrides,
})

const VERSE_1 = { id: 1, reference: 'Exodus 25:18', text: 'Make two cherubim.', version: 'NABRE' }
const QUOTE_1 = { id: 1, author: 'St. John Damascene', quote: 'I do not worship matter.', source: 'On the Divine Images' }

// Dispatch fetch mocks by URL path so parallel reference lookups resolve correctly
function mockFetch(
  rows: unknown[],
  verses: unknown[] = [VERSE_1],
  quotes: unknown[] = [QUOTE_1],
) {
  vi.mocked(fetch).mockImplementation(async (url) => {
    const u = url.toString()
    if (u.includes('/scripture_verses')) return { ok: true, json: async () => verses } as Response
    if (u.includes('/church_father_quotes')) return { ok: true, json: async () => quotes } as Response
    return { ok: true, json: async () => rows } as Response
  })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  vi.stubGlobal('fetch', vi.fn())
})

// ── loadTopicFromDatabase — field mapping ─────────────────────────────────────

describe('loadTopicFromDatabase — field mapping', () => {
  it('maps basic fields correctly', async () => {
    mockFetch([makeRow()])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic).not.toBeNull()
    expect(topic!.id).toBe('sacred-images')
    expect(topic!.title).toBe('Sacred Images and Statues')
    expect(topic!.category).toBe('tradition')
    expect(topic!.difficulty).toBe('intermediate')
    expect(topic!.lang).toBe('en')
  })

  it('resolves scripture IDs to verse objects', async () => {
    mockFetch([makeRow()])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.scripture).toHaveLength(1)
    expect(topic!.scripture[0].reference).toBe('Exodus 25:18')
    expect(topic!.scripture[0].version).toBe('NABRE')
    expect(topic!.scripture[0].text).toBe('Make two cherubim.')
  })

  it('resolves church_fathers IDs to quote objects', async () => {
    mockFetch([makeRow()])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.churchFathers).toHaveLength(1)
    expect(topic!.churchFathers![0].author).toBe('St. John Damascene')
    expect(topic!.churchFathers![0].quote).toBe('I do not worship matter.')
  })

  it('converts catechism numbers to "CCC N" strings', async () => {
    mockFetch([makeRow()])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.catechism).toEqual(['CCC 1159', 'CCC 2130'])
  })

  it('maps objections array correctly', async () => {
    mockFetch([makeRow()])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.objections).toHaveLength(1)
    expect(topic!.objections![0].objection).toBe('Exodus 20 forbids images.')
    expect(topic!.objections![0].response).toBe('God commanded images in Exodus 25.')
  })

  it('maps answer_full when present', async () => {
    mockFetch([makeRow({ answer_full: '## Full Essay\n\nComprehensive content here.' })])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.answerFull).toBe('## Full Essay\n\nComprehensive content here.')
  })

  it('sets answerFull to undefined when answer_full is null', async () => {
    mockFetch([makeRow({ answer_full: null })])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.answerFull).toBeUndefined()
  })

  it('extracts summary from {summary, full} JSONB object for concise answer', async () => {
    mockFetch([makeRow({ answer: { summary: 'Short answer.', full: 'Long markdown essay.' } })])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.answer).toBe('Short answer.')
  })

  it('falls back to full when summary is missing from answer object', async () => {
    mockFetch([makeRow({ answer: { full: 'Full content only.' } })])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.answer).toBe('Full content only.')
  })

  it('returns empty arrays when reference IDs are absent', async () => {
    mockFetch([makeRow({ scripture: null, catechism: null, church_fathers: null, objections: null })], [], [])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.scripture).toEqual([])
    expect(topic!.catechism).toEqual([])
    expect(topic!.churchFathers).toEqual([])
    expect(topic!.objections).toEqual([])
  })

  it('silently drops IDs that have no matching reference row', async () => {
    // topic references verse id=99 but scripture_verses returns nothing
    mockFetch([makeRow({ scripture: [99] })], [], [QUOTE_1])
    const { loadTopicFromDatabase } = await import('@/lib/content/database')
    const topic = await loadTopicFromDatabase('sacred-images', 'en')

    expect(topic!.scripture).toEqual([])
  })

  it('returns null when no rows returned', async () => {
    mockFetch([])
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

// ── loadTopicsFromDatabase — collection loading ───────────────────────────────

describe('loadTopicsFromDatabase — collection loading', () => {
  it('returns null when fetch returns empty array', async () => {
    mockFetch([])
    const { loadTopicsFromDatabase } = await import('@/lib/content/database')
    const result = await loadTopicsFromDatabase('en')

    expect(result).toBeNull()
  })

  it('maps multiple rows into HandbookContent', async () => {
    mockFetch([
      makeRow({ id: 'topic-1', title: 'Topic One' }),
      makeRow({ id: 'topic-2', title: 'Topic Two' }),
    ])
    const { loadTopicsFromDatabase } = await import('@/lib/content/database')
    const result = await loadTopicsFromDatabase('en')

    expect(result).not.toBeNull()
    expect(result!.topics).toHaveLength(2)
    expect(result!.topics[0].id).toBe('topic-1')
    expect(result!.topics[1].id).toBe('topic-2')
  })

  it('deduplicates reference fetches across rows sharing the same verse', async () => {
    // Both topics reference verse id=1 — only one verse_id in the IN query
    mockFetch([
      makeRow({ id: 'topic-1', scripture: [1] }),
      makeRow({ id: 'topic-2', scripture: [1] }),
    ])
    const { loadTopicsFromDatabase } = await import('@/lib/content/database')
    const result = await loadTopicsFromDatabase('en')

    expect(result!.topics[0].scripture[0].reference).toBe('Exodus 25:18')
    expect(result!.topics[1].scripture[0].reference).toBe('Exodus 25:18')
  })

  it('includes answer_full in each topic when present', async () => {
    mockFetch([makeRow({ answer_full: '## Essay\n\nContent.' })])
    const { loadTopicsFromDatabase } = await import('@/lib/content/database')
    const result = await loadTopicsFromDatabase('en')

    expect(result!.topics[0].answerFull).toBe('## Essay\n\nContent.')
  })
})
