import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { POST } from '@/app/api/quiz/route'

type TableResponses = Record<string, {
  maybeSingle?: { data: unknown; error: unknown }
  list?: { data: unknown; error: unknown }
  insert?: { data: unknown; error: unknown }
  upsert?: { data: unknown; error: unknown }
}>

function mockDb(responses: TableResponses) {
  return {
    from: (table: string) => {
      const r = responses[table] ?? {}
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        is: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve(r.maybeSingle ?? { data: null, error: null }),
        insert: () => Promise.resolve(r.insert ?? { data: null, error: null }),
        upsert: () => Promise.resolve(r.upsert ?? { data: null, error: null }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(r.list ?? { data: [], error: null }).then(resolve),
      }
      return chain
    },
  }
}

function mockRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

beforeEach(() => {
  vi.mocked(createServerClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  } as unknown as Awaited<ReturnType<typeof createServerClient>>)
})

describe('POST /api/quiz — tier gating', () => {
  it('blocks an intermediate submission when beginner has not been passed', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb({ course_progress: { maybeSingle: { data: null, error: null } } }) as unknown as ReturnType<typeof createAdminClient>,
    )

    const res = await POST(mockRequest({
      topicId: 'true-church',
      tier: 'intermediate',
      questionIds: [1],
      answers: [0],
    }))

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Complete the beginner quiz for this topic first')
  })

  it('blocks an advanced submission when intermediate has not been passed', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb({ course_progress: { maybeSingle: { data: null, error: null } } }) as unknown as ReturnType<typeof createAdminClient>,
    )

    const res = await POST(mockRequest({
      topicId: 'true-church',
      tier: 'advanced',
      questionIds: [1],
      answers: [0],
    }))

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Complete the intermediate quiz for this topic first')
  })

  it('does not gate a beginner submission — there is no prior tier to require', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb({
        course_progress: { maybeSingle: { data: null, error: null } },
        quiz_attempts: { maybeSingle: { data: null, error: null }, insert: { data: null, error: null } },
        quiz_questions: { list: { data: [{ id: 1, correct_index: 0 }], error: null } },
        quiz_settings: { maybeSingle: { data: { pass_percent: 70 }, error: null } },
      }) as unknown as ReturnType<typeof createAdminClient>,
    )

    const res = await POST(mockRequest({
      topicId: 'true-church',
      tier: 'beginner',
      questionIds: [1],
      answers: [0],
    }))

    expect(res.status).toBe(200)
  })

  it('allows an intermediate submission once beginner is already passed', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb({
        // maybeSingle is shared across course_progress lookups in this route
        // (tier-gate check, weekly-retake check reads a different table) —
        // a non-null row here means "already passed."
        course_progress: { maybeSingle: { data: { topic_id: 'true-church' }, error: null } },
        quiz_attempts: { maybeSingle: { data: null, error: null }, insert: { data: null, error: null } },
        quiz_questions: { list: { data: [{ id: 1, correct_index: 0 }], error: null } },
        quiz_settings: { maybeSingle: { data: { pass_percent: 70 }, error: null } },
      }) as unknown as ReturnType<typeof createAdminClient>,
    )

    const res = await POST(mockRequest({
      topicId: 'true-church',
      tier: 'intermediate',
      questionIds: [1],
      answers: [0],
    }))

    expect(res.status).toBe(200)
  })

  it('requires sign-in before tier gating is even evaluated', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    vi.mocked(createAdminClient).mockReturnValue(mockDb({}) as unknown as ReturnType<typeof createAdminClient>)

    const res = await POST(mockRequest({ topicId: 'true-church', tier: 'advanced', questionIds: [1], answers: [0] }))

    expect(res.status).toBe(401)
  })
})
