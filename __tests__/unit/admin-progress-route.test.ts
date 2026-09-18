import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/quiz/certificates', () => ({ issueCertificatesForCompletedPaths: vi.fn() }))

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueCertificatesForCompletedPaths } from '@/lib/quiz/certificates'
import { GET, PATCH, DELETE } from '@/app/api/admin/progress/route'

type Result = { data?: unknown; error?: unknown }

function chain(result: Result) {
  return {
    eq: () => chain(result),
    in: () => chain(result),
    is: () => chain(result),
    maybeSingle: () => Promise.resolve(result),
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

function mockGetRequest(params: Record<string, string>): NextRequest {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as unknown as NextRequest
}

function mockJsonRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

function setAdmin(isAdmin: boolean) {
  vi.mocked(createServerClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: isAdmin ? { id: 'admin1' } : null } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: isAdmin ? { user_id: 'admin1' } : null }),
        }),
      }),
    }),
  } as unknown as Awaited<ReturnType<typeof createServerClient>>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/progress', () => {
  it('403s when the caller is not an admin', async () => {
    setAdmin(false)
    const res = await GET(mockGetRequest({ user_id: 'u1' }))
    expect(res.status).toBe(403)
  })

  it('400s without a user_id', async () => {
    setAdmin(true)
    const res = await GET(mockGetRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns progress and certificates for the user', async () => {
    setAdmin(true)
    vi.mocked(createAdminClient).mockReturnValue(
      mockDb({
        course_progress: { select: { data: [{ topic_id: 't1', tier: 'beginner', passed_at: '2026-01-01' }], error: null } },
        certificates: { select: { data: [{ id: 'c1', path_slug: 'p1', tier: 'beginner', serial_code: 'X', issued_at: '2026-01-01' }], error: null } },
      }) as unknown as ReturnType<typeof createAdminClient>,
    )
    const res = await GET(mockGetRequest({ user_id: 'u1' }))
    const body = await res.json()
    expect(body.progress).toHaveLength(1)
    expect(body.certificates).toHaveLength(1)
  })
})

describe('PATCH /api/admin/progress', () => {
  it('400s when required fields are missing', async () => {
    setAdmin(true)
    const res = await PATCH(mockJsonRequest({ user_id: 'u1' }))
    expect(res.status).toBe(400)
  })

  it('clears progress and skips certificate issuance when passed is false', async () => {
    setAdmin(true)
    vi.mocked(createAdminClient).mockReturnValue(mockDb({}) as unknown as ReturnType<typeof createAdminClient>)
    const res = await PATCH(mockJsonRequest({ user_id: 'u1', topic_id: 't1', tier: 'beginner', passed: false }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.certificateIssued).toBe(false)
    expect(issueCertificatesForCompletedPaths).not.toHaveBeenCalled()
  })

  it('upserts progress and reports certificate issuance when passed is true', async () => {
    setAdmin(true)
    vi.mocked(createAdminClient).mockReturnValue(mockDb({}) as unknown as ReturnType<typeof createAdminClient>)
    vi.mocked(issueCertificatesForCompletedPaths).mockResolvedValue(['path-a'])
    const res = await PATCH(mockJsonRequest({ user_id: 'u1', topic_id: 't1', tier: 'beginner', passed: true }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.certificateIssued).toBe(true)
    expect(body.issuedPaths).toEqual(['path-a'])
    expect(issueCertificatesForCompletedPaths).toHaveBeenCalledWith(expect.anything(), 'u1', 'beginner', 't1')
  })
})

describe('DELETE /api/admin/progress', () => {
  it('400s without an id', async () => {
    setAdmin(true)
    const res = await DELETE(mockGetRequest({}))
    expect(res.status).toBe(400)
  })

  it('revokes the certificate', async () => {
    setAdmin(true)
    vi.mocked(createAdminClient).mockReturnValue(mockDb({}) as unknown as ReturnType<typeof createAdminClient>)
    const res = await DELETE(mockGetRequest({ id: 'c1' }))
    expect(res.status).toBe(200)
  })
})
