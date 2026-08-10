import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

type PresentationRole = 'admin' | 'editor' | 'presenter'

interface Slide {
  heading: string
  bullets: string[]
}

async function getAdminClient(allowedRoles: PresentationRole[]): Promise<SupabaseClient | null> {
  try {
    const client = await createServerClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return null
    const { data } = await client.from('admins').select('user_id, role').eq('user_id', user.id).maybeSingle()
    if (!data || !allowedRoles.includes(data.role as PresentationRole)) return null
    return client
  } catch {
    return null
  }
}

function isValidSlides(slides: unknown): slides is Slide[] {
  return Array.isArray(slides) && slides.length > 0 && slides.every((s) =>
    typeof s === 'object' && s !== null &&
    typeof (s as Slide).heading === 'string' && (s as Slide).heading.trim() &&
    Array.isArray((s as Slide).bullets) && (s as Slide).bullets.every((b) => typeof b === 'string' && b.trim()),
  )
}

// GET /api/admin/presentations?topicId=X — the full row for one topic
// GET /api/admin/presentations — every presentation, topic_id/published only (overview)
export async function GET(req: NextRequest) {
  const db = await getAdminClient(['admin', 'editor', 'presenter'])
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const topicId = req.nextUrl.searchParams.get('topicId')

  if (topicId) {
    const { data, error } = await db
      .from('presentations')
      .select('topic_id, slides, published, created_at, last_updated')
      .eq('topic_id', topicId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await db.from('presentations').select('topic_id, published, last_updated')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/presentations — import/upsert a presentation for a topic (published:false)
export async function POST(req: NextRequest) {
  const db = await getAdminClient(['admin', 'presenter'])
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { topic_id, slides } = body as { topic_id?: string; slides?: unknown }

  if (!topic_id?.trim()) return NextResponse.json({ error: 'topic_id is required' }, { status: 400 })
  if (!isValidSlides(slides)) {
    return NextResponse.json({ error: 'slides must be a non-empty array of {heading, bullets: string[]}' }, { status: 400 })
  }

  const { error } = await db.from('presentations').upsert({
    topic_id, slides, published: false, last_updated: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/presentations — toggle published, or replace slides, for a topic
export async function PATCH(req: NextRequest) {
  const db = await getAdminClient(['admin', 'presenter'])
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { topic_id, published, slides } = body as { topic_id?: string; published?: boolean; slides?: unknown }
  if (!topic_id?.trim()) return NextResponse.json({ error: 'topic_id is required' }, { status: 400 })

  const fields: Record<string, unknown> = { last_updated: new Date().toISOString() }
  if (published !== undefined) fields.published = published
  if (slides !== undefined) {
    if (!isValidSlides(slides)) {
      return NextResponse.json({ error: 'slides must be a non-empty array of {heading, bullets: string[]}' }, { status: 400 })
    }
    fields.slides = slides
  }

  const { error } = await db.from('presentations').update(fields).eq('topic_id', topic_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/presentations?topicId=X
export async function DELETE(req: NextRequest) {
  const db = await getAdminClient(['admin', 'presenter'])
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const topicId = req.nextUrl.searchParams.get('topicId')
  if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 })

  const { error } = await db.from('presentations').delete().eq('topic_id', topicId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
