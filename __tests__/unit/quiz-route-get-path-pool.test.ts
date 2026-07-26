import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET } from '@/app/api/quiz/route'

interface Row {
  id: number
  topic_id: string
  tier: string
  active: boolean
  path_slug: string | null
}

// A minimal chainable fake that filters an in-memory row set as .eq()/.is()
// calls accumulate, mirroring how the route builds its two pooled queries.
function mockDb(rows: Row[], itemCount = 100) {
  function chain(filtered: Row[]) {
    return {
      eq: (col: string, val: unknown) => chain(filtered.filter((r) => (r as unknown as Record<string, unknown>)[col] === val)),
      is: (col: string, val: unknown) => chain(filtered.filter((r) => (r as unknown as Record<string, unknown>)[col] === val)),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: filtered, error: null }).then(resolve),
    }
  }
  return {
    from: (table: string) => {
      if (table === 'quiz_settings') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { item_count: itemCount }, error: null }) }) }) }
      }
      return { select: () => chain(rows) }
    },
  }
}

function mockRequest(query: Record<string, string>): NextRequest {
  const params = new URLSearchParams(query)
  return { nextUrl: { searchParams: params } } as unknown as NextRequest
}

describe('GET /api/quiz — path-aware question pooling', () => {
  it('serves only generic (path_slug NULL) questions when no path is given', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb([
        { id: 1, topic_id: 't', tier: 'beginner', active: true, path_slug: null },
        { id: 2, topic_id: 't', tier: 'beginner', active: true, path_slug: 'path-a' },
      ]) as unknown as ReturnType<typeof createAdminClient>,
    )

    const res = await GET(mockRequest({ topicId: 't', tier: 'beginner' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.questions.map((q: { id: number }) => q.id).sort()).toEqual([1])
  })

  it('pools generic questions with the given path\'s own questions, excluding other paths\'', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb([
        { id: 1, topic_id: 't', tier: 'beginner', active: true, path_slug: null },
        { id: 2, topic_id: 't', tier: 'beginner', active: true, path_slug: 'path-a' },
        { id: 3, topic_id: 't', tier: 'beginner', active: true, path_slug: 'path-b' },
      ]) as unknown as ReturnType<typeof createAdminClient>,
    )

    const res = await GET(mockRequest({ topicId: 't', tier: 'beginner', path: 'path-a' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.questions.map((q: { id: number }) => q.id).sort()).toEqual([1, 2])
  })

  it('404s when neither generic nor this path\'s questions exist', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb([
        { id: 2, topic_id: 't', tier: 'beginner', active: true, path_slug: 'path-b' },
      ]) as unknown as ReturnType<typeof createAdminClient>,
    )

    const res = await GET(mockRequest({ topicId: 't', tier: 'beginner', path: 'path-a' }))
    expect(res.status).toBe(404)
  })
})
