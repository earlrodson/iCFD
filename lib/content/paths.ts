/**
 * Learning Paths — fetched live from Supabase (`paths` + `path_topics`).
 *
 * Previously the public /paths pages read a static, build-time
 * public/data/content/paths.json while the admin PathEditor wrote to the DB,
 * so admin edits never reached users. This module is the single read path
 * for both the list and detail pages, closing that gap.
 */

export type QuizMode = 'sequential' | 'agnostic'

export interface LearningPath {
  slug: string
  title: string
  description: string
  icon: string
  audience?: string
  estimatedMinutes?: number
  topicIds: string[]
  pinned: boolean
  quizMode: QuizMode
}

interface PathRow {
  slug: string
  title: string
  description: string
  audience: string | null
  estimated_minutes: number | null
  icon: string
  pinned: boolean
  quiz_mode: QuizMode
  path_topics: { topic_id: string; position: number }[]
}

function getRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url?.startsWith('https://') || !key || key.startsWith('your-')) return null
  return { base: url.replace(/\/$/, ''), key }
}

async function fetchPathRows(params: URLSearchParams): Promise<PathRow[]> {
  const config = getRestConfig()
  if (!config) return []
  params.set('select', 'slug,title,description,audience,estimated_minutes,icon,pinned,quiz_mode,path_topics(topic_id,position)')
  const res = await fetch(`${config.base}/rest/v1/paths?${params.toString()}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    next: { revalidate: 60 },
  })
  if (!res.ok) return []
  return res.json() as Promise<PathRow[]>
}

function toLearningPath(row: PathRow): LearningPath {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    icon: row.icon,
    audience: row.audience ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    pinned: row.pinned,
    quizMode: row.quiz_mode,
    topicIds: [...row.path_topics]
      .sort((a, b) => a.position - b.position)
      .map((pt) => pt.topic_id),
  }
}

export async function fetchPaths(): Promise<LearningPath[]> {
  // Pinned first, then oldest first — pinned/created_at.asc in one order
  // clause so PostgREST does the sort, rather than pinned-then-client-sort.
  const rows = await fetchPathRows(new URLSearchParams({ order: 'pinned.desc,created_at.asc' }))
  return rows.map(toLearningPath)
}

export async function fetchPathBySlug(slug: string): Promise<LearningPath | null> {
  const rows = await fetchPathRows(new URLSearchParams({ slug: `eq.${slug}`, limit: '1' }))
  return rows[0] ? toLearningPath(rows[0]) : null
}
