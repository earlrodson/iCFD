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

// GET /api/admin/glossary — list all terms
export async function GET() {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await db
    .from('theological_terms')
    .select('slug,term,pronunciation,language,root_text,root_meaning,definition,debate_note,keywords')
    .order('term')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/glossary — create term
export async function POST(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { slug, term, pronunciation, language, root_text, root_meaning, definition, debate_note, keywords } = body
  if (!slug || !term || !language || !root_meaning || !definition) {
    return NextResponse.json({ error: 'slug, term, language, root_meaning, definition required' }, { status: 400 })
  }
  const { error } = await db
    .from('theological_terms')
    .insert({ slug, term, pronunciation, language, root_text, root_meaning, definition, debate_note, keywords })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/glossary — update term
export async function PATCH(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { slug, ...fields } = body
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const { error } = await db
    .from('theological_terms')
    .update(fields)
    .eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/glossary?slug=X
export async function DELETE(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const { error } = await db
    .from('theological_terms')
    .delete()
    .eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
