import {
  TopicSchema,
  type HandbookContent,
  type Language,
  type Topic,
  type DocumentRef,
  type Term,
  type Citation,
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
  cover_image: string | null
  scripture: Json | null       // [string, ...]  — scripture_verses.reference
  catechism: Json | null       // [number, ...]  — ccc_paragraphs.paragraph
  church_fathers: Json | null  // [number, ...]  — church_father_quotes.id
  objections: Json | null
  citations: Json | null       // [Citation, ...] — self-contained, no FK resolution
  tags: Json
  difficulty: Topic['difficulty']
  related_topics: Json | null
  last_updated: string
  translation_source: string | null
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

interface ScriptureRefEntry {
  reference: string
  stance?: 'supporting' | 'objection'
}

// `scripture` is a flat array of reference strings for nearly every topic.
// Only the 20 Apologetics-ceb/tl essay topics use the richer
// {reference, stance} shape (tools/seed-apologetics-topic.ts) to mark verses
// an objector cites against Catholic teaching vs. verses that support it.
function normalizeScriptureRefs(value: Json | null): ScriptureRefEntry[] {
  return jsonArray<Json>(value).map((entry) =>
    typeof entry === 'string' ? { reference: entry } : (entry as unknown as ScriptureRefEntry),
  )
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

// Preferred Bible version per topic language — falls back to whatever's in DB
// (usually NABRE/Douay-Rheims) when no native-language row exists under a
// given reference key.
const LANG_VERSION: Record<Language, string> = {
  en: 'NABRE',
  tl: 'Ang Biblia',
  ceb: 'CEB',
}

async function resolveRefs(
  rows: TopicRow[],
  preferredVersion = LANG_VERSION[rows[0]?.lang ?? 'en'],
): Promise<ResolvedRefs> {
  const verseRefs = [...new Set(rows.flatMap(r => normalizeScriptureRefs(r.scripture).map(e => e.reference)))]
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
  const verseRefs     = normalizeScriptureRefs(row.scripture)
  const quoteIds      = jsonArray<number>(row.church_fathers)
  const catechismNums = jsonArray<number>(row.catechism)

  return {
    id: row.id,
    category: row.category,
    title: row.title,
    question: row.question,
    answer: answerToString(row.answer),
    answerFull: row.answer_full ?? undefined,
    coverImage: row.cover_image ?? undefined,
    scripture: verseRefs
      .flatMap(({ reference, stance }) => {
        const verse = refs.verses.get(reference)
        return verse ? [{ ...verse, stance }] : []
      }),
    catechism: catechismNums.map(n => `CCC ${n}`),
    churchFathers: quoteIds
      .map(id => refs.quotes.get(id))
      .filter((q): q is ChurchFatherQuoteRow => !!q),
    objections: jsonArray(row.objections),
    citations: jsonArray<Citation>(row.citations).length ? jsonArray<Citation>(row.citations) : undefined,
    tags: jsonArray(row.tags),
    difficulty: row.difficulty,
    lang: row.lang,
    relatedTopics: jsonArray(row.related_topics),
    lastUpdated: row.last_updated,
    documentRefs: undefined, // populated separately via fetchDocumentRefs
    keyTerms: undefined,     // populated separately via fetchKeyTerms
    translationSource: row.translation_source === 'manual' || row.translation_source === 'machine' || row.translation_source === 'stub'
      ? row.translation_source
      : undefined,
  }
}

// ── Document refs fetcher ─────────────────────────────────────────────────────

interface DocRefRow {
  doc_slug:      string
  section_num:   number
  section_label: string | null
  church_document_meta: { title: string } | null
}

async function fetchDocumentRefs(topicId: string): Promise<DocumentRef[]> {
  const config = getRestConfig()
  if (!config) return []
  try {
    const res = await fetch(
      `${config.base}/rest/v1/topic_document_refs` +
        `?topic_id=eq.${encodeURIComponent(topicId)}` +
        `&select=doc_slug,section_num,section_label,church_document_meta(title)` +
        `&order=doc_slug.asc,section_num.asc`,
      {
        headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
        next: { revalidate: 60 },
      },
    )
    if (!res.ok) return []
    const rows: DocRefRow[] = await res.json()
    return rows.map(r => ({
      docSlug:      r.doc_slug,
      docTitle:     r.church_document_meta?.title ?? r.doc_slug,
      sectionNum:   r.section_num,
      sectionLabel: r.section_label,
    }))
  } catch {
    return []
  }
}

// ── Key terms fetcher ─────────────────────────────────────────────────────────

interface TermRow {
  theological_terms: {
    slug: string
    term: string
    pronunciation: string | null
    language: string
    root_text: string | null
    root_meaning: string
    definition: string
    debate_note: string | null
    keywords: string | null
  }
}

async function fetchKeyTerms(topicId: string): Promise<Term[]> {
  const config = getRestConfig()
  if (!config) return []
  try {
    const res = await fetch(
      `${config.base}/rest/v1/topic_terms` +
        `?topic_id=eq.${encodeURIComponent(topicId)}` +
        `&select=theological_terms(slug,term,pronunciation,language,root_text,root_meaning,definition,debate_note,keywords)`,
      {
        headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
        next: { revalidate: 60 },
      },
    )
    if (!res.ok) return []
    const rows: TermRow[] = await res.json()
    return rows
      .map((r) => r.theological_terms)
      .filter(Boolean)
      .map((t) => ({
        slug:          t.slug,
        term:          t.term,
        pronunciation: t.pronunciation,
        language:      t.language,
        rootText:      t.root_text,
        rootMeaning:   t.root_meaning,
        definition:    t.definition,
        debateNote:    t.debate_note,
        keywords:      t.keywords,
      }))
  } catch {
    return []
  }
}

// ── Cross-translation cover image fallback ────────────────────────────────────

interface CoverImageRow {
  id: string
  cover_image: string | null
}

// `cover_image` is set per (id, lang) row, so a machine-translated row often
// lacks the upload a sibling translation has. Fetch any translation's image
// for the given ids so callers can fill in gaps instead of showing nothing.
async function fetchCoverImageFallbacks(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const rows = await restFetch<CoverImageRow>(
    'topics',
    new URLSearchParams({
      id: `in.(${ids.join(',')})`,
      cover_image: 'not.is.null',
      select: 'id,cover_image',
    }),
  )
  const map = new Map<string, string>()
  for (const row of rows) {
    if (!map.has(row.id) && row.cover_image) map.set(row.id, row.cover_image)
  }
  return map
}

async function applyCoverImageFallbacks(topics: Topic[]): Promise<void> {
  const missingIds = topics.filter(t => !t.coverImage).map(t => t.id)
  if (missingIds.length === 0) return
  const fallbacks = await fetchCoverImageFallbacks(missingIds)
  for (const topic of topics) {
    const fallback = fallbacks.get(topic.id)
    if (!topic.coverImage && fallback) topic.coverImage = fallback
  }
}

// ── Topic fetchers ────────────────────────────────────────────────────────────

const TOPIC_SELECT = [
  'id','lang','category','title','question','answer','answer_full','cover_image',
  'scripture','catechism','church_fathers','objections','citations',
  'tags','difficulty','related_topics','last_updated','translation_source',
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
  const params = new URLSearchParams({ lang: `eq.${lang}`, published: 'eq.true', order: 'title.asc' })
  // Untranslated stub rows shouldn't appear as if they were real content when
  // browsing a non-English language — only the topic detail page falls back.
  if (lang !== 'en') params.set('translation_source', 'neq.stub')
  const rows = await fetchTopicRows(params)
  if (!rows?.length) return null
  const refs = await resolveRefs(rows)
  const topics = rows.map(r => topicRowToTopic(r, refs))
  await applyCoverImageFallbacks(topics)

  // Validate row-by-row: one malformed topic (e.g. a bad enum value) must not
  // take down every topic in every language by failing a whole-array parse.
  const validTopics = topics.flatMap((topic) => {
    const parsed = TopicSchema.safeParse(topic)
    if (!parsed.success) {
      console.warn(`Dropping invalid topic "${topic.id}" (${lang}):`, parsed.error)
      return []
    }
    return [parsed.data]
  })
  return { topics: validTopics }
}

export async function loadTopicFromDatabase(
  id: string,
  lang: Language = 'en',
): Promise<Topic | null> {
  const rows = await fetchTopicRows(new URLSearchParams({ id: `eq.${id}`, lang: `eq.${lang}`, limit: '1' }))
  let row = rows?.[0]

  // A 'stub' row is untranslated placeholder text — treat it the same as a
  // missing row and fall back to English rather than showing it as real content.
  if (lang !== 'en' && (!row || row.translation_source === 'stub')) {
    const enRows = await fetchTopicRows(new URLSearchParams({ id: `eq.${id}`, lang: 'eq.en', limit: '1' }))
    row = enRows?.[0]
  }
  if (!row) return null

  const [refs, documentRefs, keyTerms] = await Promise.all([
    resolveRefs([row]),
    fetchDocumentRefs(id),
    fetchKeyTerms(id),
  ])
  const topic = topicRowToTopic(row, refs)
  topic.documentRefs = documentRefs.length ? documentRefs : undefined
  topic.keyTerms = keyTerms.length ? keyTerms : undefined
  await applyCoverImageFallbacks([topic])
  // topic.lang !== requested lang tells the caller a fallback occurred
  return topic
}
