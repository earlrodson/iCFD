import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser } from '@/lib/supabase/auth'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function verifyAdmin(): Promise<boolean> {
  const user = await getUser()
  if (!user) return false
  const { data } = await adminSupabase().from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return !!data
}

// GET /api/admin/topic-terms?topic_id=X — list terms linked to a topic
// GET /api/admin/topic-terms?all=1 — list all available theological_terms
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (req.nextUrl.searchParams.get('all')) {
    const { data, error } = await adminSupabase()
      .from('theological_terms')
      .select('slug,term,pronunciation,language,root_text,root_meaning,definition,debate_note')
      .order('term')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const topicId = req.nextUrl.searchParams.get('topic_id')
  if (!topicId) return NextResponse.json({ error: 'topic_id required' }, { status: 400 })

  const { data, error } = await adminSupabase()
    .from('topic_terms')
    .select('term_slug,theological_terms(slug,term,pronunciation,language,root_text,root_meaning,definition,debate_note)')
    .eq('topic_id', topicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/topic-terms — link a term to a topic
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { topic_id, term_slug } = body

  if (!topic_id || !term_slug) {
    return NextResponse.json({ error: 'topic_id and term_slug required' }, { status: 400 })
  }

  const { error } = await adminSupabase()
    .from('topic_terms')
    .upsert({ topic_id, term_slug }, { onConflict: 'topic_id,term_slug' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/topic-terms?topic_id=X&term_slug=Y
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const p = req.nextUrl.searchParams
  const topicId  = p.get('topic_id')
  const termSlug = p.get('term_slug')

  if (!topicId || !termSlug) {
    return NextResponse.json({ error: 'topic_id and term_slug required' }, { status: 400 })
  }

  const { error } = await adminSupabase()
    .from('topic_terms')
    .delete()
    .eq('topic_id', topicId)
    .eq('term_slug', termSlug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
