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
  scripture: Json | null       // [number, ...]  — scripture_verses.id
  catechism: Json | null       // [number, ...]  — ccc_paragraphs.paragraph
  church_fathers: Json | null  // [number, ...]  — church_father_quotes.id
  objections: Json | null
  tags: Json
  difficulty: Topic['difficulty']
  related_topics: Json | null
  last_updated: string
}

interface ScriptureVerseRow {
  id: number
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
  verses: Map<number, ScriptureVerseRow>
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

async function resolveRefs(rows: TopicRow[]): Promise<ResolvedRefs> {
  const verseIds = [...new Set(rows.flatMap(r => jsonArray<number>(r.scripture)))]
  const quoteIds = [...new Set(rows.flatMap(r => jsonArray<number>(r.church_fathers)))]

  const [verses, quotes] = await Promise.all([
    verseIds.length
      ? restFetch<ScriptureVerseRow>(
          'scripture_verses',
          new URLSearchParams({ id: `in.(${verseIds.join(',')})`, select: 'id,reference,version,text' }),
        )
      : Promise.resolve([]),
    quoteIds.length
      ? restFetch<ChurchFatherQuoteRow>(
          'church_father_quotes',
          new URLSearchParams({ id: `in.(${quoteIds.join(',')})`, select: 'id,author,quote,source' }),
        )
      : Promise.resolve([]),
  ])

  return {
    verses: new Map(verses.map(v => [v.id, v])),
    quotes: new Map(quotes.map(q => [q.id, q])),
  }
}

// ── Row → Topic ───────────────────────────────────────────────────────────────

export function topicRowToTopic(row: TopicRow, refs: ResolvedRefs): Topic {
  const scriptureIds = jsonArray<number>(row.scripture)
  const quoteIds = jsonArray<number>(row.church_fathers)
  const catechismNums = jsonArray<number>(row.catechism)

  return {
    id: row.id,
    category: row.category,
    title: row.title,
    question: row.question,
    answer: answerToString(row.answer),
    answerFull: row.answer_full ?? undefined,
    scripture: scriptureIds
      .map(id => refs.verses.get(id))
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
