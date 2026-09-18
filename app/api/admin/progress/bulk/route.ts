import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isQuizTier } from '@/lib/content/quizTiers'
import { issueCertificatesForCompletedPaths } from '@/lib/quiz/certificates'

async function requireAdmin() {
  const client = await createServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return false
  const { data } = await client.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return !!data
}

// POST /api/admin/progress/bulk — mark (passed: true) or clear (passed:
// false) every topic in one path, at one tier, for one user. Testing-only
// shortcut for the "all topics done" certificate scenario — see
// /admin/testing and app/api/admin/progress/route.ts for the single-topic
// version this composes.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { user_id, path_slug, tier, passed } = body as {
    user_id?: string
    path_slug?: string
    tier?: string
    passed?: boolean
  }
  if (!user_id?.trim() || !path_slug?.trim() || !isQuizTier(tier) || typeof passed !== 'boolean') {
    return NextResponse.json({ error: 'user_id, path_slug, tier, and passed are required' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: pathTopics, error: pathTopicsError } = await db.from('path_topics').select('topic_id').eq('path_slug', path_slug)
  if (pathTopicsError) return NextResponse.json({ error: pathTopicsError.message }, { status: 500 })
  if (!pathTopics || pathTopics.length === 0) return NextResponse.json({ error: 'That path has no topics' }, { status: 400 })

  if (!passed) {
    const topicIds = pathTopics.map((pt) => pt.topic_id)
    const { error: clearError } = await db
      .from('course_progress')
      .delete()
      .eq('user_id', user_id)
      .eq('tier', tier)
      .in('topic_id', topicIds)
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 })

    // Also revoke any certificate already earned for this path/tier — leaving
    // it in place while progress is cleared would misrepresent the state a
    // re-test is trying to observe.
    const { error: certError } = await db.from('certificates').delete().eq('user_id', user_id).eq('path_slug', path_slug).eq('tier', tier)
    if (certError) return NextResponse.json({ error: certError.message }, { status: 500 })

    return NextResponse.json({ ok: true, certificateIssued: false })
  }

  const now = new Date().toISOString()
  const { error: upsertError } = await db.from('course_progress').upsert(
    pathTopics.map((pt) => ({ user_id, topic_id: pt.topic_id, tier, passed_at: now })),
    { onConflict: 'user_id,topic_id,tier' },
  )
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  const issuedPaths = await issueCertificatesForCompletedPaths(db, user_id, tier, pathTopics[0].topic_id)
  return NextResponse.json({ ok: true, certificateIssued: issuedPaths.includes(path_slug), issuedPaths })
}
