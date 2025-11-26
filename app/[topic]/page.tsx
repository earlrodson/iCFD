import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Heart, Share2, Calendar, User, BookOpen } from 'lucide-react'
import { getCategoryName, getCategoryColor, getCategoryIcon } from '@/lib/utils/categories'
import { contentLoader } from '@/lib/content/loader'
import Link from 'next/link'
import type { Topic } from '@/data/schema/topic.schema'

interface TopicPageProps {
  params: Promise<{
    topic: string
  }>
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic } = await params
  const topicId = decodeURIComponent(topic)
  // Default to English for static generation
  const language = 'en'

  try {
    // For static export, read content from file system
    const fs = await import('fs/promises')
    const path = await import('path')

    const contentPath = path.join(process.cwd(), 'public', 'data', 'content', language, 'handbook.json')
    const contentData = await fs.readFile(contentPath, 'utf-8')
    const content = JSON.parse(contentData)

    const topicData = content.topics?.find((t: { id: string }) => t.id === topicId)

    if (!topicData) {
      notFound()
    }

    // Get related topics by IDs
    const relatedTopics = topicData.relatedTopics
      ? content.topics?.filter((t: { id: string }) => topicData.relatedTopics.includes(t.id)) || []
      : []

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
            <div className="flex items-center gap-2 mb-4">
              <Badge className={getCategoryColor(topicData.category)}>
                <span className="mr-1">{getCategoryIcon(topicData.category)}</span>
                {getCategoryName(topicData.category)}
              </Badge>
              <Badge variant="outline">{topicData.difficulty}</Badge>
              <Badge variant="secondary">{topicData.lang.toUpperCase()}</Badge>
            </div>

            <h1 className="text-3xl font-bold mb-2">{topicData.title}</h1>

            {/* Topic metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(topicData.lastUpdated).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {topicData.scripture.length} Scripture references
              </div>
              {topicData.churchFathers && topicData.churchFathers.length > 0 && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {topicData.churchFathers.length} Church Fathers
                </div>
              )}
            </div>

            {/* Tags */}
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

          {/* Question */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">The Question</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">{topicData.question}</p>
            </CardContent>
          </Card>

          {/* Answer */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">The Answer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate max-w-none">
                {topicData.answer.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scripture References */}
          {topicData.scripture.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Scripture References
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topicData.scripture.map((ref: any, index: number) => (
                    <div key={index} className="border-l-4 border-primary pl-4">
                      <blockquote className="italic text-lg mb-2">
                        "{ref.text}"
                      </blockquote>
                      <cite className="text-sm text-muted-foreground">
                        — {ref.reference}
                        {ref.version && ` (${ref.version})`}
                      </cite>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Catechism References */}
          {topicData.catechism && topicData.catechism.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Catechism References</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {topicData.catechism.map((reference: string, index: number) => (
                    <li key={index} className="text-sm">
                      <span className="font-medium">CCC {reference}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Church Fathers */}
          {topicData.churchFathers && topicData.churchFathers.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Church Fathers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {topicData.churchFathers.map((father: any, index: number) => (
                    <div key={index} className="border-l-4 border-secondary pl-4">
                      <div className="mb-2">
                        <span className="font-medium">{father.author}</span>
                        {father.source && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ({father.source})
                          </span>
                        )}
                      </div>
                      <blockquote className="italic">
                        "{father.quote}"
                      </blockquote>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Related Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {relatedTopics.map((relatedTopic: any) => (
                    <Link
                      key={relatedTopic.id}
                      href={`/${encodeURIComponent(relatedTopic.id)}?lang=${language}`}
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading topic:', error)
    notFound()
  }
}

// Generate static params for all topics
export async function generateStaticParams() {
  try {
    // Since we're doing static export, we need to read from file system directly
    const fs = await import('fs/promises')
    const path = await import('path')

    const languages = ['en', 'tl'] // Only include languages we have content for
    const params: Array<{ topic: string }> = []

    for (const lang of languages) {
      try {
        const contentPath = path.join(process.cwd(), 'public', 'data', 'content', lang, 'handbook.json')
        const contentData = await fs.readFile(contentPath, 'utf-8')
        const content = JSON.parse(contentData)

        if (content.topics && Array.isArray(content.topics)) {
          params.push(...content.topics.map((topic: { id: string }) => ({
            topic: encodeURIComponent(topic.id)
          })))
        }
      } catch (langError) {
        console.warn(`Could not load content for language ${lang}:`, langError)
      }
    }

    return params
  } catch (error) {
    console.error('Error generating static params:', error)
    // Return an empty array to prevent build failure
    return []
  }
}

// Generate metadata for each topic
export async function generateMetadata({ params }: TopicPageProps) {
  const { topic } = await params
  const topicId = decodeURIComponent(topic)

  try {
    // For static build, read from file system directly
    const fs = await import('fs/promises')
    const path = await import('path')

    const contentPath = path.join(process.cwd(), 'public', 'data', 'content', 'en', 'handbook.json')
    const contentData = await fs.readFile(contentPath, 'utf-8')
    const content = JSON.parse(contentData)

    const topicData = content.topics?.find((t: { id: string }) => t.id === topicId)

    if (!topicData) {
      return {
        title: 'Topic Not Found',
        description: 'The requested topic could not be found.'
      }
    }

    return {
      title: `${topicData.title} - Catholic Faith Defender`,
      description: topicData.question,
      keywords: topicData.tags?.join(', ') || '',
      openGraph: {
        title: topicData.title,
        description: topicData.question,
        type: 'article',
        publishedTime: topicData.lastUpdated,
      },
      twitter: {
        card: 'summary_large_image',
        title: topicData.title,
        description: topicData.question,
      },
    }
  } catch (error) {
    return {
      title: 'Catholic Faith Defender',
      description: 'Catholic apologetics content',
    }
  }
}