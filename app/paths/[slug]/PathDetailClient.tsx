'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useReadingStore } from '@/store/useReadingStore'
import { Badge } from '@/components/ui/Badge'
import type { Topic } from '@/data/schema/topic.schema'

interface LearningPath {
  slug: string
  title: string
  description: string
  icon: string
  topicIds: string[]
}

interface PathDetailClientProps {
  path: LearningPath
}

export function PathDetailClient({ path }: PathDetailClientProps) {
  const { availableTopics, initialize } = useAppStore()
  const { readProgress, markAsRead, markAsUnread } = useReadingStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (availableTopics.length === 0) initialize()
  }, [availableTopics.length, initialize])

  const pathTopics = path.topicIds
    .map((id) => availableTopics.find((t) => t.id === id))
    .filter((t): t is Topic => t !== undefined)

  const readCount = mounted
    ? path.topicIds.filter((id) => readProgress[id]?.isRead).length
    : 0
  const pct = path.topicIds.length > 0
    ? Math.round((readCount / path.topicIds.length) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
        {/* Back */}
        <div className="mb-6">
          <Link
            href="/paths"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft weight="light" size={16} />
            All Paths
          </Link>
        </div>

        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground">{path.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{path.description}</p>

        {/* Overall progress */}
        <div className="mt-4 rounded-2xl bg-card border border-border p-4 shadow-sm">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {readCount} of {path.topicIds.length} topics completed
            </span>
            <span className="font-semibold text-foreground">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Topic list */}
        <div className="mt-6 space-y-3">
          {path.topicIds.map((id, index) => {
            const topic = pathTopics.find((t) => t.id === id)
            const isRead = mounted ? (readProgress[id]?.isRead ?? false) : false

            return (
              <div
                key={id}
                className="flex items-start gap-3 rounded-2xl bg-card border border-border p-4 shadow-sm"
              >
                {/* Step indicator / read toggle */}
                <button
                  onClick={() => (isRead ? markAsUnread(id) : markAsRead(id))}
                  className="mt-0.5 shrink-0 transition-colors"
                  aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
                >
                  {isRead ? (
                    <CheckCircle weight="fill" size={22} className="text-green-500" />
                  ) : (
                    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-muted-foreground/40 text-[11px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                </button>

                {/* Topic info */}
                <div className="min-w-0 flex-1">
                  {topic ? (
                    <Link href={`/${topic.id}?path=${path.slug}`} className="group block">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="category" value={topic.category} />
                        <Badge variant="difficulty" value={topic.difficulty} />
                      </div>
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {topic.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {topic.question}
                      </p>
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {id.replace(/-/g, ' ')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
