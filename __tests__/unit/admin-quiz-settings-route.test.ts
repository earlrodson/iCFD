import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PATCH } from '@/app/api/admin/quiz-settings/route'

function mockJsonRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

function setAdmin(isAdmin: boolean) {
  vi.mocked(createServerClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: isAdmin ? { id: 'admin1' } : null } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: isAdmin ? { user_id: 'admin1' } : null }) }) }) }),
  } as unknown as Awaited<ReturnType<typeof createServerClient>>)
}

function mockAdminDb(updateError: unknown = null) {
  const eq = vi.fn(() => Promise.resolve({ error: updateError }))
  const update = vi.fn(() => ({ eq }))
  return { db: { from: () => ({ update }) }, update, eq }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/admin/quiz-settings', () => {
  it('403s when the caller is not an admin', async () => {
    setAdmin(false)
    const res = await PATCH(mockJsonRequest({ tier: 'beginner', time_limit_minutes: 15 }))
    expect(res.status).toBe(403)
  })

  it('400s on an invalid tier', async () => {
    setAdmin(true)
    const res = await PATCH(mockJsonRequest({ tier: 'expert', time_limit_minutes: 15 }))
    expect(res.status).toBe(400)
  })

  it.each([0, -5, 181, 15.5, 'fifteen'])('400s on an out-of-range or non-integer time_limit_minutes (%s)', async (value) => {
    setAdmin(true)
    const res = await PATCH(mockJsonRequest({ tier: 'beginner', time_limit_minutes: value }))
    expect(res.status).toBe(400)
  })

  it('updates the tier row on valid input', async () => {
    setAdmin(true)
    const { db, update, eq } = mockAdminDb()
    vi.mocked(createAdminClient).mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>)

    const res = await PATCH(mockJsonRequest({ tier: 'beginner', time_limit_minutes: 20 }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ time_limit_minutes: 20 }))
    expect(eq).toHaveBeenCalledWith('tier', 'beginner')
  })

  it('surfaces a db error as a 500', async () => {
    setAdmin(true)
    const { db } = mockAdminDb({ message: 'boom' })
    vi.mocked(createAdminClient).mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>)

    const res = await PATCH(mockJsonRequest({ tier: 'beginner', time_limit_minutes: 20 }))
    expect(res.status).toBe(500)
  })
})
