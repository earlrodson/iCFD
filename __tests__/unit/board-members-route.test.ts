import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

import { createServerClient } from '@/lib/supabase/server'
import { GET, POST, PATCH, DELETE } from '@/app/api/admin/board-members/route'

type TableResponses = Record<string, {
  maybeSingle?: { data: unknown; error: unknown }
  list?: { data: unknown; error: unknown }
  mutate?: { data: unknown; error: unknown }
}>

function mockDb(responses: TableResponses) {
  return {
    from: (table: string) => {
      const r = responses[table] ?? {}
      const chain = {
        select: () => chain,
        insert: () => chain,
        update: () => chain,
        delete: () => chain,
        eq: () => chain,
        is: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve(r.maybeSingle ?? { data: null, error: null }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(r.list ?? r.mutate ?? { data: [], error: null }).then(resolve),
      }
      return chain
    },
  }
}

function mockRequest(body?: unknown, url = 'http://localhost/api/admin/board-members'): NextRequest {
  return {
    json: async () => body,
    nextUrl: new URL(url),
  } as unknown as NextRequest
}

function asClient(db: ReturnType<typeof mockDb>) {
  return db as unknown as Awaited<ReturnType<typeof createServerClient>>
}

const ADMIN_ROW = { admins: { maybeSingle: { data: { user_id: 'admin-1' }, error: null } } }

function withAuthedAdmin(extra: TableResponses = {}) {
  const db = mockDb({ ...ADMIN_ROW, ...extra })
  const client = asClient(db) as unknown as { auth: { getUser: () => Promise<unknown> }; from: typeof db.from }
  client.auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) }
  vi.mocked(createServerClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createServerClient>>)
}

function withUnauthenticated() {
  const db = mockDb({})
  const client = asClient(db) as unknown as { auth: { getUser: () => Promise<unknown> }; from: typeof db.from }
  client.auth = { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
  vi.mocked(createServerClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createServerClient>>)
}

describe('GET /api/admin/board-members', () => {
  it('rejects a non-admin caller', async () => {
    withUnauthenticated()
    const res = await GET(mockRequest(undefined, 'http://localhost/api/admin/board-members?level=national'))
    expect(res.status).toBe(403)
  })

  it('rejects an invalid level', async () => {
    withAuthedAdmin()
    const res = await GET(mockRequest(undefined, 'http://localhost/api/admin/board-members?level=parish'))
    expect(res.status).toBe(400)
  })

  it('lists the roster for a valid level', async () => {
    withAuthedAdmin({ board_members: { list: { data: [{ id: 'bm1' }], error: null } } })
    const res = await GET(mockRequest(undefined, 'http://localhost/api/admin/board-members?level=national'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: 'bm1' }])
  })
})

describe('POST /api/admin/board-members', () => {
  it('rejects a non-admin caller', async () => {
    withUnauthenticated()
    const res = await POST(mockRequest({ level: 'national', user_id: 'u1' }))
    expect(res.status).toBe(403)
  })

  it('requires diocese_id for diocese-level members', async () => {
    withAuthedAdmin()
    const res = await POST(mockRequest({ level: 'diocese', user_id: 'u1' }))
    expect(res.status).toBe(400)
  })

  it('requires chapter_id for chapter-level members', async () => {
    withAuthedAdmin()
    const res = await POST(mockRequest({ level: 'chapter', user_id: 'u1' }))
    expect(res.status).toBe(400)
  })

  it('adds a national board member with no org unit needed', async () => {
    withAuthedAdmin({ board_members: { mutate: { data: null, error: null } } })
    const res = await POST(mockRequest({ level: 'national', user_id: 'u1' }))
    expect(res.status).toBe(200)
  })

  it('surfaces a friendly error when the seat cap trigger fires', async () => {
    withAuthedAdmin({
      board_members: {
        mutate: { data: null, error: { code: 'P0001', message: 'Board seat limit (21) reached for national level' } },
      },
    })
    const res = await POST(mockRequest({ level: 'national', user_id: 'u1' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('seat limit')
  })

  it('surfaces a friendly error when the user is already on the board', async () => {
    withAuthedAdmin({
      board_members: { mutate: { data: null, error: { code: '23505', message: 'duplicate key' } } },
    })
    const res = await POST(mockRequest({ level: 'national', user_id: 'u1' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('This user is already on this board')
  })
})

describe('PATCH /api/admin/board-members', () => {
  it('rejects an invalid office', async () => {
    withAuthedAdmin()
    const res = await PATCH(mockRequest({ id: 'bm1', office: 'not-a-real-office' }))
    expect(res.status).toBe(400)
  })

  it('allows clearing an office with null', async () => {
    withAuthedAdmin({ board_members: { mutate: { data: null, error: null } } })
    const res = await PATCH(mockRequest({ id: 'bm1', office: null }))
    expect(res.status).toBe(200)
  })

  it('assigns a valid office to an existing board member', async () => {
    withAuthedAdmin({ board_members: { mutate: { data: null, error: null } } })
    const res = await PATCH(mockRequest({ id: 'bm1', office: 'president' }))
    expect(res.status).toBe(200)
  })

  it('surfaces a friendly error when the office is already held', async () => {
    withAuthedAdmin({
      board_members: { mutate: { data: null, error: { code: '23505', message: 'duplicate key' } } },
    })
    const res = await PATCH(mockRequest({ id: 'bm1', office: 'president' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Someone else already holds this office on this board')
  })
})

describe('DELETE /api/admin/board-members', () => {
  it('requires an id', async () => {
    withAuthedAdmin()
    const res = await DELETE(mockRequest(undefined, 'http://localhost/api/admin/board-members'))
    expect(res.status).toBe(400)
  })

  it('removes a board member', async () => {
    withAuthedAdmin({ board_members: { mutate: { data: null, error: null } } })
    const res = await DELETE(mockRequest(undefined, 'http://localhost/api/admin/board-members?id=bm1'))
    expect(res.status).toBe(200)
  })
})
