import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET } from '@/app/api/quiz/route'

const row = {
  id: 1,
  question: 'Q?',
  choices: ['A', 'B'],
  correct_index: 0,
}

function chain(rows: unknown[]) {
  return {
    eq: () => chain(rows),
    is: () => chain(rows),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  }
}

function mockDb(timeLimitMinutes: number) {
  return {
    from: (table: string) => {
      if (table === 'quiz_settings') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { item_count: 100, time_limit_minutes: timeLimitMinutes }, error: null }) }) }) }
      }
      return {
        select: () => chain([row]),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
    },
  }
}

function mockRequest(query: Record<string, string>): NextRequest {
  return { nextUrl: { searchParams: new URLSearchParams(query) } } as unknown as NextRequest
}

describe('GET /api/quiz — time limit', () => {
  it('includes the tier\'s time_limit_minutes in the response', async () => {
    vi.mocked(createAdminClient).mockReturnValue(mockDb(20) as unknown as ReturnType<typeof createAdminClient>)

    const res = await GET(mockRequest({ topicId: 't', tier: 'beginner' }))
    const body = await res.json()

    expect(body.timeLimitMinutes).toBe(20)
  })
})
