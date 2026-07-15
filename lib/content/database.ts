import {
  HandbookContentSchema,
  type HandbookContent,
  type Language,
  type Topic,
} from '@/data/schema/topic.schema'
import type { Json } from '@/lib/supabase/database.types'

interface TopicRow {
  id: string
  lang: Language
  category: Topic['category']
  title: string
  question: string
  answer: Json
  scripture: Json | null
  catechism: Json | null
  church_fathers: Json | null
  tags: Json
  difficulty: Topic['difficulty']
  related_topics: Json | null
  last_updated: string
}

const TOPIC_SELECT = [
  'id',
  'lang',
  'category',
  'title',
  'question',
  'answer',
  'scripture',
  'catechism',
  'church_fathers',
  'tags',
  'difficulty',
  'related_topics',
  'last_updated',
].join(',')

function getSupabaseRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url?.startsWith('https://') || !key || key.startsWith('your-')) {
    return null
  }

  return {
    url: `${url.replace(/\/$/, '')}/rest/v1/topics`,
    key,
  }
}

function answerToString(answer: Json): string {
  if (typeof answer === 'string') return answer

  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    const full = answer.full
    const summary = answer.summary

    if (typeof full === 'string') return full
    if (typeof summary === 'string') return summary
  }

  return ''
}

function jsonArray<T>(value: Json | null): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function topicRowToTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    question: row.question,
    answer: answerToString(row.answer),
    scripture: jsonArray(row.scripture),
    catechism: jsonArray(row.catechism),
    churchFathers: jsonArray(row.church_fathers),
    tags: jsonArray(row.tags),
    difficulty: row.difficulty,
    lang: row.lang,
    relatedTopics: jsonArray(row.related_topics),
    lastUpdated: row.last_updated,
  }
}

async function fetchTopicRows(params: URLSearchParams): Promise<TopicRow[] | null> {
  const config = getSupabaseRestConfig()
  if (!config) return null

  params.set('select', TOPIC_SELECT)

  const response = await fetch(`${config.url}?${params.toString()}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
    },
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch topics from Supabase: ${response.status}`)
  }

  return (await response.json()) as TopicRow[]
}

export async function loadTopicsFromDatabase(lang: Language): Promise<HandbookContent | null> {
  const params = new URLSearchParams({
    lang: `eq.${lang}`,
    order: 'title.asc',
  })
  const rows = await fetchTopicRows(params)
  if (!rows?.length) return null

  return HandbookContentSchema.parse({
    topics: rows.map(topicRowToTopic),
  })
}

export async function loadTopicFromDatabase(
  id: string,
  lang: Language = 'en',
): Promise<Topic | null> {
  const params = new URLSearchParams({
    id: `eq.${id}`,
    lang: `eq.${lang}`,
    limit: '1',
  })
  const rows = await fetchTopicRows(params)
  const row = rows?.[0]
  if (!row) return null

  return topicRowToTopic(row)
}
