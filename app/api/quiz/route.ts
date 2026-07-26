import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isQuizTier as isTier, previousTier } from '@/lib/content/quizTiers'

/**
 * Issues a certificate for (user, tier) once every topic in the active
 * course path has been passed at that tier — a no-op if one already exists
 * or the path isn't fully complete yet. The certificates schema is one row
 * per (user_id, tier), which assumes a single active course path defines
 * what "completing a tier" means; revisit if a second path is ever added.
 * Returns true only when a new certificate was issued by this call.
 */
async function maybeIssueCertificate(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  tier: string,
): Promise<boolean> {
  const { data: existing } = await db
    .from('certificates')
    .select('id')
    .eq('user_id', userId)
    .eq('tier', tier)
    .maybeSingle()
  if (existing) return false

  const { data: coursePath } = await db.from('paths').select('slug').is('deleted_at', null).limit(1).maybeSingle()
  if (!coursePath) return false

  const { data: pathTopics } = await db.from('path_topics').select('topic_id').eq('path_slug', coursePath.slug)
  if (!pathTopics || pathTopics.length === 0) return false

  const { data: progress } = await db
    .from('course_progress')
    .select('topic_id')
    .eq('user_id', userId)
    .eq('tier', tier)
  const doneTopics = new Set((progress ?? []).map((p) => p.topic_id))
  const allDone = pathTopics.every((pt) => doneTopics.has(pt.topic_id))
  if (!allDone) return false

  const serialCode = `CFD-${tier.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  const { error } = await db.from('certificates').insert({ user_id: userId, tier, serial_code: serialCode })
  return !error
}

/**
 * Shuffles then trims to `n` — good enough for quiz rotation (not
 * cryptographically sensitive, just needs to vary across attempts).
 */
function sample<T>(pool: T[], n: number): T[] {
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

// GET /api/quiz?topicId=X&tier=Y — rotate a fresh question set.
// Open to anonymous visitors: browsing/attempting a quiz never requires
// auth, only submitting a scored result does (see POST below).
export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get('topicId')
  const tier = req.nextUrl.searchParams.get('tier')
  if (!topicId || !isTier(tier)) {
    return NextResponse.json({ error: 'topicId and a valid tier are required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: settings, error: settingsError } = await db.from('quiz_settings').select('item_count').eq('tier', tier).maybeSingle()
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 })
  if (!settings) return NextResponse.json({ error: 'Unknown tier' }, { status: 400 })

  const { data: bank, error } = await db
    .from('quiz_questions')
    .select('id,question,choices')
    .eq('topic_id', topicId)
    .eq('tier', tier)
    .eq('active', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bank || bank.length === 0) {
    return NextResponse.json({ error: 'No questions available for this topic/tier yet' }, { status: 404 })
  }

  const questions = sample(bank, Math.min(settings.item_count, bank.length))
  return NextResponse.json({ questions })
}

// POST /api/quiz — submit answers for scoring.
// Body: { topicId, tier, questionIds: number[], answers: number[], pathSlug?: string }
// answers[i] is the chosen choice index for questionIds[i].
export async function POST(req: NextRequest) {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required to submit a quiz' }, { status: 401 })

  const body = await req.json()
  const { topicId, tier, questionIds, answers, pathSlug } = body as {
    topicId?: string
    tier?: string
    questionIds?: number[]
    answers?: number[]
    pathSlug?: string
  }

  if (!topicId || !isTier(tier) || !Array.isArray(questionIds) || !Array.isArray(answers)
    || questionIds.length === 0 || questionIds.length !== answers.length) {
    return NextResponse.json({ error: 'topicId, tier, questionIds, and matching answers are required' }, { status: 400 })
  }

  const db = createAdminClient()

  // Tier gating — intermediate/advanced require the previous tier passed for
  // this same topic first, regardless of any path's sequential-topic gating
  // below. Enforced here (submit time), not on GET, since browsing a quiz
  // never requires progress — only a scored attempt does.
  const prevTier = previousTier(tier)
  if (prevTier) {
    const { data: prevTierProgress } = await db
      .from('course_progress')
      .select('topic_id')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .eq('tier', prevTier)
      .maybeSingle()
    if (!prevTierProgress) {
      return NextResponse.json(
        { error: `Complete the ${prevTier} quiz for this topic first` },
        { status: 403 },
      )
    }
  }

  // Weekly retake cooldown
  const { data: lastAttempt } = await db
    .from('quiz_attempts')
    .select('attempted_at')
    .eq('user_id', user.id)
    .eq('topic_id', topicId)
    .eq('tier', tier)
    .order('attempted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastAttempt) {
    const elapsedMs = Date.now() - new Date(lastAttempt.attempted_at).getTime()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    if (elapsedMs < weekMs) {
      const retryAt = new Date(new Date(lastAttempt.attempted_at).getTime() + weekMs)
      return NextResponse.json(
        { error: 'This quiz can only be retaken once a week', retryAt: retryAt.toISOString() },
        { status: 429 },
      )
    }
  }

  // Sequential gating — only enforced at submit time, never at browse time.
  if (pathSlug) {
    const { data: path } = await db.from('paths').select('quiz_mode').eq('slug', pathSlug).maybeSingle()
    if (path?.quiz_mode === 'sequential') {
      const { data: pathTopics } = await db
        .from('path_topics')
        .select('topic_id,position')
        .eq('path_slug', pathSlug)
        .order('position')

      const idx = (pathTopics ?? []).findIndex((pt) => pt.topic_id === topicId)
      const prev = idx > 0 ? pathTopics![idx - 1] : null
      if (prev) {
        const { data: prevProgress } = await db
          .from('course_progress')
          .select('topic_id')
          .eq('user_id', user.id)
          .eq('topic_id', prev.topic_id)
          .eq('tier', tier)
          .maybeSingle()
        if (!prevProgress) {
          return NextResponse.json(
            { error: `Complete the "${prev.topic_id}" quiz at this tier first` },
            { status: 403 },
          )
        }
      }
    }
  }

  // Grade — correct_index is fetched here, server-side only, never sent to the client.
  const { data: questions, error: qErr } = await db
    .from('quiz_questions')
    .select('id,correct_index')
    .in('id', questionIds)
    .eq('topic_id', topicId)
    .eq('tier', tier)
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
  if (!questions || questions.length !== questionIds.length) {
    return NextResponse.json({ error: 'Question set does not match this topic/tier' }, { status: 400 })
  }

  const correctById = new Map(questions.map((q) => [q.id, q.correct_index]))
  let correctCount = 0
  questionIds.forEach((qid, i) => {
    if (correctById.get(qid) === answers[i]) correctCount++
  })
  const scorePercent = Math.round((correctCount / questionIds.length) * 100)

  const { data: settings } = await db.from('quiz_settings').select('pass_percent').eq('tier', tier).maybeSingle()
  const passPercent = settings?.pass_percent ?? 100
  const passed = scorePercent >= passPercent

  const { error: insertErr } = await db.from('quiz_attempts').insert({
    user_id: user.id,
    topic_id: topicId,
    tier,
    question_ids: questionIds,
    answers,
    score_percent: scorePercent,
    passed,
    attempted_at: new Date().toISOString(),
  })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  let certificateIssued = false
  if (passed) {
    await db.from('course_progress').upsert(
      { user_id: user.id, topic_id: topicId, tier, passed_at: new Date().toISOString() },
      { onConflict: 'user_id,topic_id,tier' },
    )
    certificateIssued = await maybeIssueCertificate(db, user.id, tier)
  }

  return NextResponse.json({ scorePercent, passed, correctCount, total: questionIds.length, certificateIssued, tier })
}
