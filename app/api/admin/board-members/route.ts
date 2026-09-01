import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const BOARD_LEVELS = ['national', 'diocese', 'chapter'] as const
type BoardLevel = typeof BOARD_LEVELS[number]

const OFFICES = [
  'spiritual_adviser', 'theological_adviser', 'adviser', 'president',
  'internal_vice_president', 'external_vice_president', 'secretary',
  'treasurer', 'auditor', 'pio',
] as const
type Office = typeof OFFICES[number]

function isBoardLevel(value: unknown): value is BoardLevel {
  return BOARD_LEVELS.includes(value as BoardLevel)
}

function isOffice(value: unknown): value is Office {
  return OFFICES.includes(value as Office)
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

// GET /api/admin/board-members?level=X[&diocese_id=X|&chapter_id=X]
// Lists the roster for one org unit (national has no diocese_id/chapter_id).
export async function GET(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const level = req.nextUrl.searchParams.get('level')
  const dioceseId = req.nextUrl.searchParams.get('diocese_id')
  const chapterId = req.nextUrl.searchParams.get('chapter_id')
  if (!isBoardLevel(level)) {
    return NextResponse.json({ error: `level must be one of: ${BOARD_LEVELS.join(', ')}` }, { status: 400 })
  }
  let query = db
    .from('board_members')
    .select('id,level,diocese_id,chapter_id,user_id,office,created_at')
    .eq('level', level)
  query = dioceseId ? query.eq('diocese_id', dioceseId) : query.is('diocese_id', null)
  query = chapterId ? query.eq('chapter_id', chapterId) : query.is('chapter_id', null)
  const { data, error } = await query.order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/board-members — add a user to a board (no office yet)
export async function POST(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { level, diocese_id, chapter_id, user_id } = body
  if (!isBoardLevel(level)) {
    return NextResponse.json({ error: `level must be one of: ${BOARD_LEVELS.join(', ')}` }, { status: 400 })
  }
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }
  if (level === 'diocese' && !diocese_id) {
    return NextResponse.json({ error: 'diocese_id is required for diocese-level board members' }, { status: 400 })
  }
  if (level === 'chapter' && !chapter_id) {
    return NextResponse.json({ error: 'chapter_id is required for chapter-level board members' }, { status: 400 })
  }
  const { error } = await db.from('board_members').insert({
    level,
    diocese_id: level === 'diocese' ? diocese_id : null,
    chapter_id: level === 'chapter' ? chapter_id : null,
    user_id,
  })
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This user is already on this board' }, { status: 409 })
    }
    // Raised by enforce_board_seat_limit — the board is already at capacity.
    if (error.code === 'P0001') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/board-members — assign or clear an existing board member's office
export async function PATCH(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, office } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (office !== null && !isOffice(office)) {
    return NextResponse.json({ error: `office must be null or one of: ${OFFICES.join(', ')}` }, { status: 400 })
  }
  const { error } = await db.from('board_members').update({ office }).eq('id', id)
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Someone else already holds this office on this board' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/board-members?id=X — remove a board member (and any office they hold)
export async function DELETE(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await db.from('board_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
