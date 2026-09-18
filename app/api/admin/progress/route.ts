import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isQuizTier } from '@/lib/content/quizTiers'
import { issueCertificatesForCompletedPaths } from '@/lib/quiz/certificates'

// Testing-only tool (see /admin/testing): lets an admin fabricate
// course_progress rows for a user without them actually taking a quiz, so
// QA can exercise "what happens once every topic in a path is done" —
// certificate issuance in particular — without grinding through real
// attempts. Never touches quiz_attempts; course_progress is the only ledger
// the real submit flow (app/api/quiz/route.ts) and the certificate
// issuance check actually read.
async function requireAdmin() {
  const client = await createServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return false
  const { data } = await client.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return !!data
}

// GET /api/admin/progress?user_id=X — this user's course_progress + certificates
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId?.trim()) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

  const db = createAdminClient()
  const [{ data: progress, error: progressError }, { data: certificates, error: certsError }] = await Promise.all([
    db.from('course_progress').select('topic_id,tier,passed_at').eq('user_id', userId),
    db.from('certificates').select('id,path_slug,tier,serial_code,issued_at').eq('user_id', userId),
  ])
  if (progressError) return NextResponse.json({ error: progressError.message }, { status: 500 })
  if (certsError) return NextResponse.json({ error: certsError.message }, { status: 500 })

  return NextResponse.json({ progress: progress ?? [], certificates: certificates ?? [] })
}

// PATCH /api/admin/progress — toggle one (user, topic, tier) as passed/not passed.
// Marking passed also runs the real certificate-issuance check, same as a
// genuine quiz submission would.
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { user_id, topic_id, tier, passed } = body as {
    user_id?: string
    topic_id?: string
    tier?: string
    passed?: boolean
  }
  if (!user_id?.trim() || !topic_id?.trim() || !isQuizTier(tier) || typeof passed !== 'boolean') {
    return NextResponse.json({ error: 'user_id, topic_id, tier, and passed are required' }, { status: 400 })
  }

  const db = createAdminClient()

  if (!passed) {
    const { error } = await db.from('course_progress').delete().eq('user_id', user_id).eq('topic_id', topic_id).eq('tier', tier)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, certificateIssued: false })
  }

  const { error } = await db.from('course_progress').upsert(
    { user_id, topic_id, tier, passed_at: new Date().toISOString() },
    { onConflict: 'user_id,topic_id,tier' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const issuedPaths = await issueCertificatesForCompletedPaths(db, user_id, tier, topic_id)
  return NextResponse.json({ ok: true, certificateIssued: issuedPaths.length > 0, issuedPaths })
}

// DELETE /api/admin/progress?id=<certificate id> — revoke a fabricated
// certificate so issuance can be re-tested from a clean state.
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id?.trim()) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from('certificates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
