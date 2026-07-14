import { notFound } from 'next/navigation'
import { HandbookContentSchema } from '@/data/schema/topic.schema'
import { TopicContent } from '@/components/topic/TopicContent'
import { readFileSync } from 'fs'
import { join } from 'path'

interface TopicPageProps {
  params: Promise<{ topic: string }>
}

function loadHandbook() {
  const filePath = join(process.cwd(), 'public', 'data', 'content', 'en', 'handbook.json')
  const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown
  return HandbookContentSchema.parse(raw)
}

export async function generateStaticParams() {
  const handbook = loadHandbook()
  return handbook.topics.map((t) => ({ topic: t.id }))
}

export async function generateMetadata({ params }: TopicPageProps) {
  const { topic: topicId } = await params
  const handbook = loadHandbook()
  const topic = handbook.topics.find((t) => t.id === topicId)

  if (!topic) return { title: 'Topic Not Found' }

  return {
    title: `${topic.title} — Catholic Faith Defender`,
    description: topic.question,
  }
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic: topicId } = await params
  const handbook = loadHandbook()
  const topic = handbook.topics.find((t) => t.id === topicId)

  if (!topic) notFound()

  return (
    <div className="min-h-screen bg-background">
      <TopicContent topic={topic} />
    </div>
  )
}
