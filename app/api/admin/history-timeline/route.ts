import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

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

// GET /api/admin/history-timeline — list all entries
export async function GET() {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await db
    .from('history_timeline')
    .select('id,year,title,body,icon,sort_order')
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/history-timeline — create entry
export async function POST(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { year, title, body: text, icon, sort_order } = body
  if (!year || !title || !text) {
    return NextResponse.json({ error: 'year, title, body required' }, { status: 400 })
  }
  const { error } = await db
    .from('history_timeline')
    .insert({ year, title, body: text, icon: icon || 'users', sort_order: sort_order ?? 0 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/history-timeline — update entry
export async function PATCH(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await db
    .from('history_timeline')
    .update(fields)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/history-timeline?id=X
export async function DELETE(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await db
    .from('history_timeline')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
