import {
  HandbookContentSchema,
  type HandbookContent,
  type Language,
  type Topic,
} from '@/data/schema/topic.schema'
import type { Json } from '@/lib/supabase/database.types'

// ── Row shapes ────────────────────────────────────────────────────────────────

interface TopicRow {
  id: string
  lang: Language
  category: Topic['category']
  title: string
  question: string
  answer: Json
  answer_full: string | null
  scripture: Json | null       // [string, ...]  — scripture_verses.reference
  catechism: Json | null       // [number, ...]  — ccc_paragraphs.paragraph
  church_fathers: Json | null  // [number, ...]  — church_father_quotes.id
  objections: Json | null
  tags: Json
  difficulty: Topic['difficulty']
  related_topics: Json | null
  last_updated: string
}

interface ScriptureVerseRow {
  reference: string
  version: string
  text: string
}

interface ChurchFatherQuoteRow {
  id: number
  author: string
  quote: string
  source: string
}

interface ResolvedRefs {
  // keyed by reference; preferred version wins, falls back to any available
  verses: Map<string, ScriptureVerseRow>
  quotes: Map<number, ChurchFatherQuoteRow>
}

// ── Supabase REST config ──────────────────────────────────────────────────────

function getRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url?.startsWith('https://') || !key || key.startsWith('your-')) return null
  return { base: url.replace(/\/$/, ''), key }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function answerToString(answer: Json): string {
  if (typeof answer === 'string') return answer
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    const { summary, full } = answer as Record<string, unknown>
    if (typeof summary === 'string') return summary
    if (typeof full === 'string') return full
  }
  return ''
}

function jsonArray<T>(value: Json | null): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

async function restFetch<T>(path: string, params: URLSearchParams): Promise<T[]> {
  const config = getRestConfig()
  if (!config) return []
  const res = await fetch(`${config.base}/rest/v1/${path}?${params.toString()}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Supabase fetch ${path} failed: ${res.status}`)
  return res.json() as Promise<T[]>
}

// ── Reference resolvers ───────────────────────────────────────────────────────

async function resolveRefs(
  rows: TopicRow[],
  preferredVersion = 'NABRE',
): Promise<ResolvedRefs> {
  const verseRefs = [...new Set(rows.flatMap(r => jsonArray<string>(r.scripture)))]
  const quoteIds  = [...new Set(rows.flatMap(r => jsonArray<number>(r.church_fathers)))]

  const [allVerses, quotes] = await Promise.all([
    verseRefs.length
      ? restFetch<ScriptureVerseRow>(
          'scripture_verses',
          new URLSearchParams({
            // Quote each reference so spaces survive the URL
            reference: `in.(${verseRefs.map(r => `"${r}"`).join(',')})`,
            select: 'reference,version,text',
          }),
        )
      : Promise.resolve([]),
    quoteIds.length
      ? restFetch<ChurchFatherQuoteRow>(
          'church_father_quotes',
          new URLSearchParams({ id: `in.(${quoteIds.join(',')})`, select: 'id,author,quote,source' }),
        )
      : Promise.resolve([]),
  ])

  // Prefer the requested version; fall back to whatever is in DB
  const verseMap = new Map<string, ScriptureVerseRow>()
  for (const v of allVerses) {
    const existing = verseMap.get(v.reference)
    if (!existing || v.version === preferredVersion) {
      verseMap.set(v.reference, v)
    }
  }

  return {
    verses: verseMap,
    quotes: new Map(quotes.map(q => [q.id, q])),
  }
}

// ── Row → Topic ───────────────────────────────────────────────────────────────

export function topicRowToTopic(row: TopicRow, refs: ResolvedRefs): Topic {
  const verseRefs     = jsonArray<string>(row.scripture)
  const quoteIds      = jsonArray<number>(row.church_fathers)
  const catechismNums = jsonArray<number>(row.catechism)

  return {
    id: row.id,
    category: row.category,
    title: row.title,
    question: row.question,
    answer: answerToString(row.answer),
    answerFull: row.answer_full ?? undefined,
    scripture: verseRefs
      .map(ref => refs.verses.get(ref))
      .filter((v): v is ScriptureVerseRow => !!v),
    catechism: catechismNums.map(n => `CCC ${n}`),
    churchFathers: quoteIds
      .map(id => refs.quotes.get(id))
      .filter((q): q is ChurchFatherQuoteRow => !!q),
    objections: jsonArray(row.objections),
    tags: jsonArray(row.tags),
    difficulty: row.difficulty,
    lang: row.lang,
    relatedTopics: jsonArray(row.related_topics),
    lastUpdated: row.last_updated,
  }
}

// ── Topic fetchers ────────────────────────────────────────────────────────────

const TOPIC_SELECT = [
  'id','lang','category','title','question','answer','answer_full',
  'scripture','catechism','church_fathers','objections',
  'tags','difficulty','related_topics','last_updated',
].join(',')

async function fetchTopicRows(params: URLSearchParams): Promise<TopicRow[] | null> {
  const config = getRestConfig()
  if (!config) return null
  params.set('select', TOPIC_SELECT)
  const res = await fetch(`${config.base}/rest/v1/topics?${params.toString()}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Failed to fetch topics: ${res.status}`)
  return res.json() as Promise<TopicRow[]>
}

export async function loadTopicsFromDatabase(lang: Language): Promise<HandbookContent | null> {
  const rows = await fetchTopicRows(new URLSearchParams({ lang: `eq.${lang}`, published: 'eq.true', order: 'title.asc' }))
  if (!rows?.length) return null
  const refs = await resolveRefs(rows)
  return HandbookContentSchema.parse({ topics: rows.map(r => topicRowToTopic(r, refs)) })
}

export async function loadTopicFromDatabase(
  id: string,
  lang: Language = 'en',
): Promise<Topic | null> {
  const rows = await fetchTopicRows(new URLSearchParams({ id: `eq.${id}`, lang: `eq.${lang}`, limit: '1' }))
  const row = rows?.[0]
  if (!row) return null
  const refs = await resolveRefs([row])
  return topicRowToTopic(row, refs)
}
