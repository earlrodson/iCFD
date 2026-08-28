import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isQuizTier as isTier, previousTier } from '@/lib/content/quizTiers'
import { LanguageSchema } from '@/data/schema/topic.schema'

function parseLang(v: string | null): 'en' | 'tl' | 'ceb' {
  const parsed = LanguageSchema.safeParse(v)
  return parsed.success ? parsed.data : 'en'
}

// A quiz left open for longer than this is almost certainly an idle/
// backgrounded tab, not genuine time-on-task.
const MAX_QUIZ_DURATION_MS = 60 * 60 * 1000

/**
 * Issues a certificate for (user, path, tier) once every topic in a path
 * has been passed at that tier — a path/tier combo the just-passed topic
 * could plausibly have completed. A topic can appear in more than one
 * path, so more than one certificate may be issued from a single passing
 * attempt. No-op for any path that isn't fully complete yet, or that
 * already has a certificate for this user/tier. Returns the slugs of
 * paths a certificate was newly issued for.
 */
async function issueCertificatesForCompletedPaths(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  tier: string,
  topicId: string,
): Promise<string[]> {
  const { data: containingPaths } = await db.from('path_topics').select('path_slug').eq('topic_id', topicId)
  const candidateSlugs = [...new Set((containingPaths ?? []).map((p) => p.path_slug))]
  if (candidateSlugs.length === 0) return []

  const { data: activePaths } = await db.from('paths').select('slug').in('slug', candidateSlugs).is('deleted_at', null)
  if (!activePaths || activePaths.length === 0) return []

  const { data: progress } = await db
    .from('course_progress')
    .select('topic_id')
    .eq('user_id', userId)
    .eq('tier', tier)
  const doneTopics = new Set((progress ?? []).map((p) => p.topic_id))

  const issued: string[] = []
  for (const path of activePaths) {
    const { data: existing } = await db
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('path_slug', path.slug)
      .eq('tier', tier)
      .maybeSingle()
    if (existing) continue

    const { data: pathTopics } = await db.from('path_topics').select('topic_id').eq('path_slug', path.slug)
    if (!pathTopics || pathTopics.length === 0) continue
    if (!pathTopics.every((pt) => doneTopics.has(pt.topic_id))) continue

    const serialCode = `CFD-${tier.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const { error } = await db.from('certificates').insert({ user_id: userId, path_slug: path.slug, tier, serial_code: serialCode })
    if (!error) issued.push(path.slug)
  }
  return issued
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
  const pathSlug = req.nextUrl.searchParams.get('path')
  const lang = parseLang(req.nextUrl.searchParams.get('lang'))
  if (!topicId || !isTier(tier)) {
    return NextResponse.json({ error: 'topicId and a valid tier are required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: settings, error: settingsError } = await db.from('quiz_settings').select('item_count').eq('tier', tier).maybeSingle()
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 })
  if (!settings) return NextResponse.json({ error: 'Unknown tier' }, { status: 400 })

  // The bank pools two sets: generic questions (path_slug IS NULL, reusable by
  // any path) plus, when a path context is given, that path's own questions.
  // Two queries instead of a single .or() filter — keeps the path slug out of
  // a hand-built PostgREST filter string entirely.
  const baseQuery = (queryLang: string) =>
    db.from('quiz_questions').select('id,question,choices').eq('topic_id', topicId).eq('tier', tier).eq('lang', queryLang).eq('active', true)
  const fetchBank = async (queryLang: string) => {
    const [{ data: generic, error: genericError }, { data: pathSpecific, error: pathError }] = await Promise.all([
      baseQuery(queryLang).is('path_slug', null),
      pathSlug ? baseQuery(queryLang).eq('path_slug', pathSlug) : Promise.resolve({ data: [], error: null }),
    ])
    if (genericError) throw new Error(genericError.message)
    if (pathError) throw new Error(pathError.message)
    return [...(generic ?? []), ...(pathSpecific ?? [])]
  }

  let bank
  try {
    bank = await fetchBank(lang)
    // Untranslated topics fall back to the English bank rather than showing
    // no quiz at all — matches loadTopicFromDatabase's own lang fallback.
    if (bank.length === 0 && lang !== 'en') bank = await fetchBank('en')
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load questions' }, { status: 500 })
  }
  if (bank.length === 0) {
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
  const { topicId, tier, questionIds, answers, pathSlug, durationMs } = body as {
    topicId?: string
    tier?: string
    questionIds?: number[]
    answers?: number[]
    pathSlug?: string
    durationMs?: number
  }
  // No lang param needed here — questionIds already pin the exact rows GET served.

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

  const validDuration = typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs >= 0
  const clampedDuration = validDuration ? Math.round(Math.min(durationMs, MAX_QUIZ_DURATION_MS)) : null

  const { error: insertErr } = await db.from('quiz_attempts').insert({
    user_id: user.id,
    topic_id: topicId,
    tier,
    question_ids: questionIds,
    answers,
    score_percent: scorePercent,
    passed,
    duration_ms: clampedDuration,
    attempted_at: new Date().toISOString(),
  })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  let certificateIssued = false
  if (passed) {
    await db.from('course_progress').upsert(
      { user_id: user.id, topic_id: topicId, tier, passed_at: new Date().toISOString() },
      { onConflict: 'user_id,topic_id,tier' },
    )
    const issuedPaths = await issueCertificatesForCompletedPaths(db, user.id, tier, topicId)
    certificateIssued = issuedPaths.length > 0
  }

  return NextResponse.json({ scorePercent, passed, correctCount, total: questionIds.length, certificateIssued, tier })
}
