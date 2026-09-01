import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

import { createServerClient } from '@/lib/supabase/server'
import { PATCH } from '@/app/api/admin/board-seat-limits/route'

type TableResponses = Record<string, { mutate?: { data: unknown; error: unknown } }>

function mockDb(responses: TableResponses) {
  return {
    from: (table: string) => {
      const r = responses[table] ?? {}
      const chain = {
        update: () => chain,
        eq: () => chain,
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(r.mutate ?? { data: null, error: null }).then(resolve),
      }
      return chain
    },
  }
}

function mockRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

function withAuthedAdmin(extra: TableResponses = {}) {
  const db = mockDb(extra)
  const client = db as unknown as { auth: { getUser: () => Promise<unknown> }; from: typeof db.from }
  client.auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) }
  // getAdminClient() also queries the admins table via .maybeSingle() — patch
  // from() to answer that first, then delegate to the seat-limits mock.
  const originalFrom = client.from
  client.from = ((table: string) => {
    if (table === 'admins') {
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { user_id: 'admin-1' }, error: null }) }) }) }
    }
    return originalFrom(table)
  }) as typeof db.from
  vi.mocked(createServerClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createServerClient>>)
}

describe('PATCH /api/admin/board-seat-limits', () => {
  it('rejects an invalid level', async () => {
    withAuthedAdmin()
    const res = await PATCH(mockRequest({ level: 'parish', max_seats: 10 }))
    expect(res.status).toBe(400)
  })

  it('rejects a non-positive max_seats', async () => {
    withAuthedAdmin()
    const res = await PATCH(mockRequest({ level: 'diocese', max_seats: 0 }))
    expect(res.status).toBe(400)
  })

  it('updates a level cap', async () => {
    withAuthedAdmin({ board_seat_limits: { mutate: { data: null, error: null } } })
    const res = await PATCH(mockRequest({ level: 'diocese', max_seats: 20 }))
    expect(res.status).toBe(200)
  })

  it('surfaces a friendly error when lowering below the current roster size', async () => {
    withAuthedAdmin({
      board_seat_limits: {
        mutate: {
          data: null,
          error: { code: 'P0001', message: 'Cannot set diocese seat limit to 5 — an existing roster already has 12 members' },
        },
      },
    })
    const res = await PATCH(mockRequest({ level: 'diocese', max_seats: 5 }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('already has 12 members')
  })
})
