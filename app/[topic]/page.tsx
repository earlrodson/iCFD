import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { HandbookContentSchema, LanguageSchema, type Language } from '@/data/schema/topic.schema'
import { TopicContent } from '@/components/topic/TopicContent'
import { loadTopicFromDatabase } from '@/lib/content/database'
import { readFileSync } from 'fs'
import { join } from 'path'

interface TopicPageProps {
  params: Promise<{ topic: string }>
}

function loadHandbook(lang: Language = 'en') {
  const filePath = join(process.cwd(), 'public', 'data', 'content', lang, 'handbook.json')
  const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown
  return HandbookContentSchema.parse(raw)
}

async function getPreferredLanguage(): Promise<Language> {
  const stored = (await cookies()).get('lang')?.value
  const parsed = LanguageSchema.safeParse(stored)
  return parsed.success ? parsed.data : 'en'
}

export async function generateMetadata({ params }: TopicPageProps) {
  const { topic: topicId } = await params
  const topic =
    (await loadTopicFromDatabase(topicId, 'en').catch(() => null)) ??
    loadHandbook('en').topics.find((t) => t.id === topicId)

  if (!topic) return { title: 'Topic Not Found' }

  return {
    title: `${topic.title} — Catholic Faith Defender`,
    description: topic.question,
  }
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic: topicId } = await params
  const lang = await getPreferredLanguage()
  const topic =
    (await loadTopicFromDatabase(topicId, lang).catch(() => null)) ??
    loadHandbook(lang).topics.find((t) => t.id === topicId) ??
    loadHandbook('en').topics.find((t) => t.id === topicId)

  if (!topic) notFound()

  // loadTopicFromDatabase already falls back to English internally when the
  // requested language is missing or an untranslated stub — topic.lang then
  // differs from the cookie's preferred language, which is our fallback signal.
  const requestedButUnavailable = topic.lang !== lang ? lang : undefined

  return (
    <div className="min-h-screen bg-background">
      <TopicContent topic={topic} requestedLang={requestedButUnavailable} />
    </div>
  )
}
