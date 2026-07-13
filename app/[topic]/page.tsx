import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, BookOpen, User, Heart, Share2 } from 'lucide-react'
import { getCategoryName, getCategoryColor, getCategoryIcon } from '@/lib/utils/categories'
import Link from 'next/link'
import { TopicContent } from '@/components/topic/TopicContent'
import { getCitations } from '@/lib/content/normalize'
import type { Topic } from '@/data/schema/topic.schema'

interface TopicPageProps {
  params: Promise<{
    topic: string
  }>
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

    const relatedTopics: Topic[] = topicData.relatedTopics
      ? content.topics?.filter((t: { id: string }) => topicData.relatedTopics!.includes(t.id)) ?? []
      : []

    const citations = getCitations(topicData)
    const scriptureCount = citations.filter(c => c.type === 'scripture').length
    const fathersCount = citations.filter(c => c.type === 'church-father').length

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">

          {/* Navigation */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Topics
              </Link>
            </Button>
          </div>

          {/* Topic Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge className={getCategoryColor(topicData.category)}>
                <span className="mr-1">{getCategoryIcon(topicData.category)}</span>
                {getCategoryName(topicData.category)}
              </Badge>
              <Badge variant="outline">{topicData.difficulty}</Badge>
              <Badge variant="secondary">{topicData.lang.toUpperCase()}</Badge>
            </div>

            <h1 className="text-3xl font-bold mb-4">{topicData.title}</h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(topicData.lastUpdated).toLocaleDateString()}
              </div>
              {scriptureCount > 0 && (
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {scriptureCount} Scripture {scriptureCount === 1 ? 'reference' : 'references'}
                </div>
              )}
              {fathersCount > 0 && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {fathersCount} Church {fathersCount === 1 ? 'Father' : 'Fathers'}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {topicData.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-8">
            <Button variant="outline" size="sm">
              <Heart className="h-4 w-4 mr-2" />
              Add to Favorites
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Topic Content — client component handles mode toggle + rendering */}
          <TopicContent topic={topicData} />

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <div className="mt-8 border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Related Topics</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {relatedTopics.map((relatedTopic: Topic) => (
                  <Link
                    key={relatedTopic.id}
                    href={`/${encodeURIComponent(relatedTopic.id)}`}
                    className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(relatedTopic.category)}>
                        {getCategoryIcon(relatedTopic.category)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getCategoryName(relatedTopic.category)}
                      </span>
                    </div>
                    <h3 className="font-medium mb-1">{relatedTopic.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {relatedTopic.question}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading topic:', error)
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
