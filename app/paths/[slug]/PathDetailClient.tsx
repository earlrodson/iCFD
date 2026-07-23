'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, User, Lock } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useReadingStore } from '@/store/useReadingStore'
import { Badge } from '@/components/ui/badge'
import { getUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import type { Topic } from '@/data/schema/topic.schema'
import type { LearningPath } from '@/lib/content/paths'

interface PathDetailClientProps {
  path: LearningPath
}

const TIERS = [
  { key: 'beginner', label: 'B' },
  { key: 'intermediate', label: 'I' },
  { key: 'advanced', label: 'A' },
] as const

export function PathDetailClient({ path }: PathDetailClientProps) {
  const { availableTopics, initialize } = useAppStore()
  const { readProgress, markAsRead, markAsUnread } = useReadingStore()
  const [mounted, setMounted] = useState(false)
  // "topicId:tier" keys the user has already passed — drives sequential locking.
  const [passed, setPassed] = useState<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
    if (availableTopics.length === 0) initialize()
  }, [availableTopics.length, initialize])

  useEffect(() => {
    getUser().then(async (user) => {
      if (!user) return
      const { data } = await createClient()
        .from('course_progress')
        .select('topic_id,tier')
        .eq('user_id', user.id)
        .in('topic_id', path.topicIds)
      setPassed(new Set((data ?? []).map((r) => `${r.topic_id}:${r.tier}`)))
    })
  }, [path.topicIds])

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
        {(path.audience || path.estimatedMinutes) && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {path.estimatedMinutes && (
              <span className="flex items-center gap-1">
                <Clock weight="light" size={12} />
                ~{path.estimatedMinutes} min read
              </span>
            )}
            {path.audience && (
              <span className="flex items-center gap-1">
                <User weight="light" size={12} />
                {path.audience}
              </span>
            )}
          </div>
        )}

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

                  {/* Quiz tier buttons */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {TIERS.map(({ key, label }) => {
                      const prevId = index > 0 ? path.topicIds[index - 1] : null
                      const locked =
                        path.quizMode === 'sequential' &&
                        prevId !== null &&
                        !passed.has(`${prevId}:${key}`)

                      if (locked) {
                        return (
                          <span
                            key={key}
                            title={`Complete the previous topic's ${key} quiz first`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground/50 cursor-not-allowed"
                          >
                            <Lock weight="light" size={12} />
                          </span>
                        )
                      }

                      const donePrefix = passed.has(`${id}:${key}`) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                      return (
                        <Link
                          key={key}
                          href={`/quiz/${id}/${key}?path=${path.slug}`}
                          title={`${key} quiz`}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-colors ${donePrefix}`}
                        >
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
