import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isQuizTier } from '@/lib/content/quizTiers'
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

// GET /api/admin/quiz?topicId=X — all tiers' questions for one topic
// GET /api/admin/quiz — every question, id/topic_id/tier/active only (for the overview counts)
export async function GET(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const topicId = req.nextUrl.searchParams.get('topicId')

  if (topicId) {
    const { data, error } = await db
      .from('quiz_questions')
      .select('id,topic_id,tier,question,choices,correct_index,active,path_slug,created_at')
      .eq('topic_id', topicId)
      .order('tier')
      .order('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await db.from('quiz_questions').select('id,topic_id,tier,active')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/quiz — create a question
export async function POST(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { topic_id, tier, question, choices, correct_index, active, path_slug } = body as {
    topic_id?: string
    tier?: string
    question?: string
    choices?: unknown
    correct_index?: number
    active?: boolean
    path_slug?: string | null
  }

  if (!topic_id || !isQuizTier(tier) || !question?.trim()) {
    return NextResponse.json({ error: 'topic_id, a valid tier, and question are required' }, { status: 400 })
  }
  if (!Array.isArray(choices) || choices.length < 2 || choices.some((c) => typeof c !== 'string' || !c.trim())) {
    return NextResponse.json({ error: 'choices must be at least 2 non-empty strings' }, { status: 400 })
  }
  if (typeof correct_index !== 'number' || correct_index < 0 || correct_index >= choices.length) {
    return NextResponse.json({ error: 'correct_index must point at one of the choices' }, { status: 400 })
  }

  const { error } = await db.from('quiz_questions').insert({
    topic_id, tier, question: question.trim(), choices, correct_index, active: active ?? true,
    path_slug: path_slug || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/quiz — update a question by id
export async function PATCH(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...fields } = body as { id?: number } & Record<string, unknown>
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  if ('choices' in fields) {
    const choices = fields.choices
    if (!Array.isArray(choices) || choices.length < 2 || choices.some((c) => typeof c !== 'string' || !c.trim())) {
      return NextResponse.json({ error: 'choices must be at least 2 non-empty strings' }, { status: 400 })
    }
  }
  if ('correct_index' in fields) {
    const correctIndex = fields.correct_index
    const choicesLen = Array.isArray(fields.choices) ? fields.choices.length : undefined
    if (typeof correctIndex !== 'number' || correctIndex < 0 || (choicesLen !== undefined && correctIndex >= choicesLen)) {
      return NextResponse.json({ error: 'correct_index must point at one of the choices' }, { status: 400 })
    }
  }
  if ('tier' in fields && !isQuizTier(fields.tier)) {
    return NextResponse.json({ error: 'invalid tier' }, { status: 400 })
  }

  const { error } = await db.from('quiz_questions').update(fields).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/quiz?id=N
export async function DELETE(req: NextRequest) {
  const db = await getAdminClient()
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await db.from('quiz_questions').delete().eq('id', Number(id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
