import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const BOARD_LEVELS = ['national', 'diocese', 'chapter'] as const
type BoardLevel = typeof BOARD_LEVELS[number]

function isBoardLevel(value: unknown): value is BoardLevel {
  return BOARD_LEVELS.includes(value as BoardLevel)
}

async function getAdminClient(): Promise<SupabaseClient | null> {
  try {
    const client = await createServerClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return null
    const { data } = await client.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    return data ? client : null
  } catch {
    return null
  }
}

// GET /api/admin/board-seat-limits — list the max_seats config per level
export async function GET() {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await db.from('board_seat_limits').select('level,max_seats').order('level')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/admin/board-seat-limits — update a level's max_seats
export async function PATCH(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { level, max_seats } = body
  if (!isBoardLevel(level)) {
    return NextResponse.json({ error: `level must be one of: ${BOARD_LEVELS.join(', ')}` }, { status: 400 })
  }
  if (typeof max_seats !== 'number' || max_seats <= 0) {
    return NextResponse.json({ error: 'max_seats must be a positive number' }, { status: 400 })
  }
  const { error } = await db.from('board_seat_limits').update({ max_seats }).eq('level', level)
  if (error) {
    // Raised by enforce_seat_limit_not_below_roster — the requested cap is
    // below an existing roster's current size.
    if (error.code === 'P0001') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
