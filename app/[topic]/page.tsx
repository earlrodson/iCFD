import { notFound } from 'next/navigation'
import { TopicPageContent } from '@/components/topic/TopicPageContent'
import type { Topic } from '@/data/schema/topic.schema'

interface TopicPageProps {
  params: Promise<{ topic: string }>
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic } = await params
  const topicId = decodeURIComponent(topic)

  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const contentPath = path.join(process.cwd(), 'public', 'data', 'content', 'en', 'handbook.json')
    const contentData = await fs.readFile(contentPath, 'utf-8')
    const content = JSON.parse(contentData)

    const topicData: Topic | undefined = content.topics?.find((t: { id: string }) => t.id === topicId)
    if (!topicData) notFound()

    return <TopicPageContent topicId={topicId} fallbackTopic={topicData} />
  } catch {
    notFound()
  }
}

export async function generateStaticParams() {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const languages = ['en', 'tl', 'ceb']
    const params: Array<{ topic: string }> = []
    const seen = new Set<string>()

    for (const lang of languages) {
      try {
        const contentPath = path.join(process.cwd(), 'public', 'data', 'content', lang, 'handbook.json')
        const contentData = await fs.readFile(contentPath, 'utf-8')
        const content = JSON.parse(contentData)

        if (content.topics && Array.isArray(content.topics)) {
          for (const topic of content.topics as { id: string }[]) {
            const encoded = encodeURIComponent(topic.id)
            if (!seen.has(encoded)) {
              seen.add(encoded)
              params.push({ topic: encoded })
            }
          }
        }
      } catch {
        // Missing language file — skip
      }
    }
    return params
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: TopicPageProps) {
  const { topic } = await params
  const topicId = decodeURIComponent(topic)

  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const contentPath = path.join(process.cwd(), 'public', 'data', 'content', 'en', 'handbook.json')
    const contentData = await fs.readFile(contentPath, 'utf-8')
    const content = JSON.parse(contentData)
    const topicData = content.topics?.find((t: { id: string }) => t.id === topicId)

    if (!topicData) return { title: 'Topic Not Found' }

    return {
      title: `${topicData.title} — Catholic Faith Defender`,
      description: topicData.question,
      keywords: topicData.tags?.join(', ') ?? '',
      openGraph: {
        title: topicData.title,
        description: topicData.question,
        type: 'article',
        publishedTime: topicData.lastUpdated,
      },
    }
  } catch {
    return { title: 'Catholic Faith Defender' }
  }
}
