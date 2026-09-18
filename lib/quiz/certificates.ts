import { createAdminClient } from '@/lib/supabase/admin'

/**
 * CFD-{year}-{counter}, e.g. CFD-2026-001. The counter increments per
 * calendar year via next_certificate_number(), a Postgres function using an
 * atomic INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING — this makes
 * concurrent issuance (e.g. two learners passing at once, or the admin
 * testing tool's bulk-mark-complete issuing several certificates in one
 * request) race-safe without any read-then-write counting in app code. See
 * docs/specifications/certificate-sequential-serial-numbers.md.
 */
async function nextSerialCode(db: ReturnType<typeof createAdminClient>): Promise<string> {
  const year = new Date().getFullYear()
  const { data, error } = await db.rpc('next_certificate_number', { p_year: year })
  if (error || typeof data !== 'number') {
    throw new Error(`Failed to allocate certificate serial number: ${error?.message ?? 'no value returned'}`)
  }
  return `CFD-${year}-${String(data).padStart(3, '0')}`
}

/**
 * Issues a certificate for (user, path, tier) once every topic in a path
 * has been passed at that tier — a path/tier combo the just-passed topic
 * could plausibly have completed. A topic can appear in more than one
 * path, so more than one certificate may be issued from a single passing
 * attempt. No-op for any path that isn't fully complete yet, or that
 * already has a certificate for this user/tier. Returns the slugs of
 * paths a certificate was newly issued for.
 *
 * Shared by the real quiz submission flow (app/api/quiz/route.ts) and the
 * admin testing tool (app/api/admin/progress/route.ts), which fabricates
 * course_progress rows to exercise this same issuance path without
 * requiring a user to actually take every quiz.
 */
export async function issueCertificatesForCompletedPaths(
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

    const serialCode = await nextSerialCode(db)
    const { error } = await db.from('certificates').insert({ user_id: userId, path_slug: path.slug, tier, serial_code: serialCode })
    if (!error) issued.push(path.slug)
  }
  return issued
}
