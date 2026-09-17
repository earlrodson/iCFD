import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/quiz/certificates', () => ({ issueCertificatesForCompletedPaths: vi.fn() }))

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueCertificatesForCompletedPaths } from '@/lib/quiz/certificates'
import { POST } from '@/app/api/admin/progress/bulk/route'

type Result = { data?: unknown; error?: unknown }

function chain(result: Result) {
  return {
    eq: () => chain(result),
    in: () => chain(result),
    is: () => chain(result),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
}

function mockDb(responses: Record<string, { select?: Result; delete?: Result; upsert?: Result }>) {
  return {
    from: (table: string) => {
      const r = responses[table] ?? {}
      return {
        select: () => chain(r.select ?? { data: [], error: null }),
        delete: () => chain(r.delete ?? { error: null }),
        upsert: () => Promise.resolve(r.upsert ?? { error: null }),
      }
    },
  }
}

function mockJsonRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

function setAdmin() {
  vi.mocked(createServerClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { user_id: 'admin1' } }) }) }) }),
  } as unknown as Awaited<ReturnType<typeof createServerClient>>)
}

beforeEach(() => {
  vi.clearAllMocks()
  setAdmin()
})

describe('POST /api/admin/progress/bulk', () => {
  it('400s when required fields are missing', async () => {
    const res = await POST(mockJsonRequest({ user_id: 'u1' }))
    expect(res.status).toBe(400)
  })

  it('400s when the path has no topics', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb({ path_topics: { select: { data: [], error: null } } }) as unknown as ReturnType<typeof createAdminClient>,
    )
    const res = await POST(mockJsonRequest({ user_id: 'u1', path_slug: 'p1', tier: 'beginner', passed: true }))
    expect(res.status).toBe(400)
  })

  it('marks every topic in the path passed and reports issuance', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb({ path_topics: { select: { data: [{ topic_id: 't1' }, { topic_id: 't2' }], error: null } } }) as unknown as ReturnType<typeof createAdminClient>,
    )
    vi.mocked(issueCertificatesForCompletedPaths).mockResolvedValue(['p1'])

    const res = await POST(mockJsonRequest({ user_id: 'u1', path_slug: 'p1', tier: 'beginner', passed: true }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.certificateIssued).toBe(true)
    expect(issueCertificatesForCompletedPaths).toHaveBeenCalledWith(expect.anything(), 'u1', 'beginner', 't1')
  })

  it('clears progress and revokes the certificate for the path when passed is false', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb({ path_topics: { select: { data: [{ topic_id: 't1' }], error: null } } }) as unknown as ReturnType<typeof createAdminClient>,
    )

    const res = await POST(mockJsonRequest({ user_id: 'u1', path_slug: 'p1', tier: 'beginner', passed: false }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.certificateIssued).toBe(false)
    expect(issueCertificatesForCompletedPaths).not.toHaveBeenCalled()
  })
})
