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

// GET /api/admin/topic-doc-refs?topic_id=X
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const topicId = req.nextUrl.searchParams.get('topic_id')
  if (!topicId) return NextResponse.json({ error: 'topic_id required' }, { status: 400 })

  const { data, error } = await adminSupabase()
    .from('topic_document_refs')
    .select('id,doc_slug,section_num,section_label,church_document_meta(title)')
    .eq('topic_id', topicId)
    .order('doc_slug')
    .order('section_num')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/topic-doc-refs — add a ref
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { topic_id, doc_slug, section_num, section_label } = body

  if (!topic_id || !doc_slug || section_num == null) {
    return NextResponse.json({ error: 'topic_id, doc_slug, section_num required' }, { status: 400 })
  }

  const { error } = await adminSupabase()
    .from('topic_document_refs')
    .upsert({ topic_id, doc_slug, section_num, section_label }, { onConflict: 'topic_id,doc_slug,section_num' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/topic-doc-refs?topic_id=X&doc_slug=Y&section_num=Z
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const p = req.nextUrl.searchParams
  const topicId   = p.get('topic_id')
  const docSlug   = p.get('doc_slug')
  const sectionNum = p.get('section_num')

  if (!topicId || !docSlug || !sectionNum) {
    return NextResponse.json({ error: 'topic_id, doc_slug, section_num required' }, { status: 400 })
  }

  const { error } = await adminSupabase()
    .from('topic_document_refs')
    .delete()
    .eq('topic_id', topicId)
    .eq('doc_slug', docSlug)
    .eq('section_num', parseInt(sectionNum, 10))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
