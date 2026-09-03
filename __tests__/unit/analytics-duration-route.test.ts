import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { POST } from '@/app/api/analytics/duration/route'

function mockRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

function withDb() {
  const eqCalls: [string, unknown][] = []
  const chain = {
    update: () => chain,
    eq: (col: string, val: unknown) => {
      eqCalls.push([col, val])
      return chain
    },
    is: () => Promise.resolve({ data: null, error: null }),
  }
  const client = { from: () => chain } as unknown as ReturnType<typeof createAdminClient>
  vi.mocked(createAdminClient).mockReturnValue(client)
  return eqCalls
}

describe('POST /api/analytics/duration', () => {
  it('rejects a body missing visitorId', async () => {
    withDb()
    const res = await POST(mockRequest({ id: 1, durationMs: 500 }))
    expect(res.status).toBe(400)
  })

  it('rejects a body missing id', async () => {
    withDb()
    const res = await POST(mockRequest({ visitorId: 'v1', durationMs: 500 }))
    expect(res.status).toBe(400)
  })

  it('scopes the update to both id and the caller-supplied visitor_id', async () => {
    const eqCalls = withDb()
    const res = await POST(mockRequest({ id: 42, visitorId: 'visitor-abc', durationMs: 1000 }))
    expect(res.status).toBe(200)
    expect(eqCalls).toContainEqual(['id', 42])
    expect(eqCalls).toContainEqual(['visitor_id', 'visitor-abc'])
  })
})
