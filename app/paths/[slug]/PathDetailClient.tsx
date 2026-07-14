'use client'

import { useEffect, use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePathsStore } from '@/store/usePathsStore'
import { useProgressStore } from '@/store/useProgressStore'
import { useAppStore, useAvailableTopics } from '@/store/useAppStore'
import { getCategoryName, type Category } from '@/lib/utils/categories'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { CheckCircle, Circle, BookOpen, Clock, ArrowLeft, ChevronRight, GraduationCap, Shield, Flower2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const PATH_ICONS: Record<string, LucideIcon> = {
  'new-catholic': GraduationCap,
  'defend-the-faith': Shield,
  'marian-apologetics': Flower2,
}
import type { Topic } from '@/data/schema/topic.schema'

interface Props {
  params: Promise<{ slug: string }>
}

export default function PathDetailClient({ params }: Props) {
  const { slug } = use(params)

  const { paths, loadPaths, getPathProgress, getNextTopic } = usePathsStore()
  const { readTopicIds, loadProgress } = useProgressStore()
  const { initialize } = useAppStore()
  const availableTopics = useAvailableTopics()

  useEffect(() => {
    initialize()
    loadPaths()
    loadProgress()
  }, [initialize, loadPaths, loadProgress])

  const path = paths.find(p => p.slug === slug)
  if (paths.length > 0 && !path) notFound()

  if (!path) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>
  }

  const topicMap = availableTopics.reduce<Record<string, Topic>>((acc, t) => { acc[t.id] = t; return acc }, {})
  const { completed, total, percent } = getPathProgress(slug, readTopicIds)
  const nextTopicId = getNextTopic(slug, readTopicIds)
  const readSet = new Set(readTopicIds)

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="-ml-2">
              <Link href="/paths"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {(() => { const PathIcon = PATH_ICONS[path.slug] ?? BookOpen; return <PathIcon className="h-5 w-5 text-primary" /> })()}
              <h1 className="font-bold text-lg truncate">{path.title}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <p className="text-muted-foreground text-sm mb-4">{path.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-6">
          <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {total} topics</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{path.estimatedMinutes} min</span>
          <Badge variant="outline" className="text-xs capitalize">{path.difficulty}</Badge>
        </div>

        {/* Progress bar */}
        <div className="mb-6 p-4 bg-muted/40 rounded-xl">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Progress</span>
            <span className="text-primary">{completed}/{total} completed</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
          {percent === 100 && (
            <p className="text-sm text-green-600 font-medium mt-2 text-center">🎉 Path complete!</p>
          )}
        </div>

        {nextTopicId && (
          <Button className="w-full mb-6" asChild>
            <Link href={`/${encodeURIComponent(nextTopicId)}?path=${slug}`}>
              Continue Path <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}

        <div className="space-y-2">
          {path.topics.map((topicId, idx) => {
            const topic = topicMap[topicId]
            const isRead = readSet.has(topicId)
            return (
              <Link
                key={topicId}
                href={`/${encodeURIComponent(topicId)}?path=${slug}`}
                className={`flex items-center gap-3 p-4 border rounded-lg transition-colors hover:bg-accent/40 ${isRead ? 'opacity-70' : ''}`}
              >
                <span className="text-xs text-muted-foreground w-5 shrink-0 text-center font-medium">{idx + 1}</span>
                {isRead
                  ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  : <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  {topic ? (
                    <>
                      <p className="font-medium text-sm truncate">{topic.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CategoryIcon category={topic.category} className="h-3 w-3" />
                        {getCategoryName(topic.category as Category)} · {topic.difficulty}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{topicId}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
