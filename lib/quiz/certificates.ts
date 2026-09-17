import { createAdminClient } from '@/lib/supabase/admin'

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

    const serialCode = `CFD-${tier.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const { error } = await db.from('certificates').insert({ user_id: userId, path_slug: path.slug, tier, serial_code: serialCode })
    if (!error) issued.push(path.slug)
  }
  return issued
}
