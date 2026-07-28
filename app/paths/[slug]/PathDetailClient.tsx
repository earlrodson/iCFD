'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, User, Lock } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useReadingStore } from '@/store/useReadingStore'
import { Badge } from '@/components/ui/badge'
import { getUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import { isTopicComplete } from '@/lib/content/pathProgress'
import { previousTier } from '@/lib/content/quizTiers'
import type { Topic } from '@/data/schema/topic.schema'
import type { LearningPath } from '@/lib/content/paths'

interface PathDetailClientProps {
  path: LearningPath
}

const TIERS = [
  { key: 'beginner', label: 'Beg' },
  { key: 'intermediate', label: 'Int' },
  { key: 'advanced', label: 'Adv' },
] as const

// Same colors as the difficulty Badge dots above each card, so the tier
// buttons reinforce a color association the user has already seen rather
// than introducing a second one.
const TIER_COLORS: Record<(typeof TIERS)[number]['key'], { available: string; passed: string }> = {
  beginner: {
    available: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40 dark:hover:bg-emerald-900/30',
    passed: 'bg-emerald-600 text-white border border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500',
  },
  intermediate: {
    available: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40 dark:hover:bg-amber-900/30',
    passed: 'bg-amber-600 text-white border border-amber-600 dark:bg-amber-500 dark:border-amber-500',
  },
  advanced: {
    available: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40 dark:hover:bg-rose-900/30',
    passed: 'bg-rose-600 text-white border border-rose-600 dark:bg-rose-500 dark:border-rose-500',
  },
}

export function PathDetailClient({ path }: PathDetailClientProps) {
  const { availableTopics, initialize } = useAppStore()
  const { readProgress, markAsRead, markAsUnread } = useReadingStore()
  const [mounted, setMounted] = useState(false)
  // "topicId:tier" keys the user has already passed — drives sequential locking.
  const [passed, setPassed] = useState<Set<string>>(new Set())
  // Topics in this path that have an authored quiz bank (any tier) — for these,
  // "complete" means "passed a quiz," not "clicked mark-as-read."
  const [quizTopics, setQuizTopics] = useState<Set<string>>(new Set())

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

  useEffect(() => {
    // Two queries instead of one .or() filter — a topic only counts as
    // "has a quiz" for this path if it has generic (reusable) questions or
    // questions authored specifically for this path.
    const supabase = createClient()
    const base = () => supabase.from('quiz_questions').select('topic_id').eq('active', true).in('topic_id', path.topicIds)
    Promise.all([
      base().is('path_slug', null),
      base().eq('path_slug', path.slug),
    ]).then(([generic, pathSpecific]) => {
      const ids = [...(generic.data ?? []), ...(pathSpecific.data ?? [])].map((r) => r.topic_id)
      setQuizTopics(new Set(ids))
    })
  }, [path.topicIds, path.slug])

  const pathTopics = path.topicIds
    .map((id) => availableTopics.find((t) => t.id === id))
    .filter((t): t is Topic => t !== undefined)

  const isComplete = (id: string) =>
    isTopicComplete(id, quizTopics.has(id), passed, readProgress[id]?.isRead ?? false)

  const readCount = mounted
    ? path.topicIds.filter((id) => isComplete(id)).length
    : 0
  const pct = path.topicIds.length > 0
    ? Math.round((readCount / path.topicIds.length) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pt-4">
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
            const hasQuiz = quizTopics.has(id)
            const complete = mounted ? isComplete(id) : false

            return (
              <div
                key={id}
                className="flex items-start gap-3 rounded-2xl bg-card border border-border p-4 shadow-sm"
              >
                {/* Step indicator — quizzed topics show quiz-pass status (not
                    clickable, since only a passed quiz can complete them);
                    non-quizzed topics keep the manual read toggle. */}
                {hasQuiz ? (
                  <span
                    className="mt-0.5 shrink-0"
                    title={complete ? 'Quiz passed' : 'Not yet passed — complete a quiz below'}
                  >
                    {complete ? (
                      <CheckCircle weight="fill" size={22} className="text-green-500" />
                    ) : (
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-muted-foreground/40 text-[11px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </span>
                ) : (
                  <button
                    onClick={() => (complete ? markAsUnread(id) : markAsRead(id))}
                    className="mt-0.5 shrink-0 transition-colors"
                    aria-label={complete ? 'Mark as unread' : 'Mark as read'}
                  >
                    {complete ? (
                      <CheckCircle weight="fill" size={22} className="text-green-500" />
                    ) : (
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-muted-foreground/40 text-[11px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </button>
                )}

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
                  <div className="mt-2.5 flex items-center gap-2">
                    {TIERS.map(({ key, label }) => {
                      const prevId = index > 0 ? path.topicIds[index - 1] : null
                      const pathLocked =
                        path.quizMode === 'sequential' &&
                        prevId !== null &&
                        !passed.has(`${prevId}:${key}`)

                      // Tier gating — intermediate/advanced require the previous
                      // tier passed for THIS topic, independent of path mode.
                      const prevTier = previousTier(key)
                      const tierLocked = prevTier !== null && !passed.has(`${id}:${prevTier}`)

                      if (pathLocked || tierLocked) {
                        return (
                          <span
                            key={key}
                            title={
                              tierLocked
                                ? `Complete the ${prevTier} quiz first`
                                : `Complete the previous topic's ${key} quiz first`
                            }
                            className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg bg-muted px-2.5 text-xs font-semibold text-muted-foreground/50 cursor-not-allowed"
                          >
                            <Lock weight="light" size={14} />
                            {label}
                          </span>
                        )
                      }

                      const isPassed = passed.has(`${id}:${key}`)
                      const colorClasses = isPassed ? TIER_COLORS[key].passed : TIER_COLORS[key].available
                      return (
                        <Link
                          key={key}
                          href={`/quiz/${id}/${key}?path=${path.slug}`}
                          title={`${key} quiz`}
                          className={`flex h-11 min-w-11 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition-colors ${colorClasses}`}
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
