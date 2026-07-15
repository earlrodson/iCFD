import { notFound } from 'next/navigation'
import { HandbookContentSchema, type Language } from '@/data/schema/topic.schema'
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
  const topic =
    (await loadTopicFromDatabase(topicId, 'en').catch(() => null)) ??
    loadHandbook('en').topics.find((t) => t.id === topicId)

  if (!topic) notFound()

  return (
    <div className="min-h-screen bg-background">
      <TopicContent topic={topic} />
    </div>
  )
}
