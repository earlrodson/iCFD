import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const CHAPTER_TYPES = ['parish', 'school'] as const
type ChapterType = typeof CHAPTER_TYPES[number]

function isChapterType(value: unknown): value is ChapterType {
  return CHAPTER_TYPES.includes(value as ChapterType)
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

// GET /api/admin/chapters[?diocese_id=X] — list chapters, optionally scoped to a diocese
export async function GET(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const dioceseId = req.nextUrl.searchParams.get('diocese_id')
  let query = db.from('chapters').select('id,name,type,diocese_id,lat,lng,created_at').order('name')
  if (dioceseId) query = query.eq('diocese_id', dioceseId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/chapters — create a chapter under a diocese
export async function POST(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { name, type, diocese_id } = body
  if (!name?.trim() || !diocese_id) {
    return NextResponse.json({ error: 'name, diocese_id required' }, { status: 400 })
  }
  if (!isChapterType(type)) {
    return NextResponse.json({ error: `type must be one of: ${CHAPTER_TYPES.join(', ')}` }, { status: 400 })
  }
  const { error } = await db.from('chapters').insert({ name, type, diocese_id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/chapters — update a chapter
export async function PATCH(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, type, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (type !== undefined && !isChapterType(type)) {
    return NextResponse.json({ error: `type must be one of: ${CHAPTER_TYPES.join(', ')}` }, { status: 400 })
  }
  const { error } = await db.from('chapters').update({ ...fields, ...(type ? { type } : {}) }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/chapters?id=X
export async function DELETE(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await db.from('chapters').delete().eq('id', id)
  if (error) {
    // FK violation — users or board members still reference this chapter.
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Cannot delete a chapter that still has users or board members assigned to it' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
