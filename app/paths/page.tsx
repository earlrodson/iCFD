'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Cross, Shield, Star, GraduationCap, ArrowRight, Clock, User } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useReadingStore } from '@/store/useReadingStore'
import { fetchPaths, type LearningPath } from '@/lib/content/paths'
import { isTopicComplete } from '@/lib/content/pathProgress'
import { getUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'

const iconMap: Record<string, React.ElementType> = {
  cross: Cross,
  shield: Shield,
  star: Star,
  'graduation-cap': GraduationCap,
}

export default function PathsPage() {
  const { availableTopics, initialize } = useAppStore()
  const { readProgress } = useReadingStore()
  const [mounted, setMounted] = useState(false)
  const [paths, setPaths] = useState<LearningPath[]>([])
  // "topicId:tier" keys the user has already passed — mirrors PathDetailClient.
  const [passed, setPassed] = useState<Set<string>>(new Set())
  // Per-path set of topic ids that have an authored quiz bank (generic or
  // authored for that path specifically) — mirrors PathDetailClient, since a
  // topic quizzed only for one path shouldn't count as quizzed for another.
  const [quizTopicsByPath, setQuizTopicsByPath] = useState<Record<string, Set<string>>>({})

  useEffect(() => {
    setMounted(true)
    if (availableTopics.length === 0) initialize()
    fetchPaths().then(setPaths)
  }, [availableTopics.length, initialize])

  useEffect(() => {
    const allTopicIds = [...new Set(paths.flatMap((p) => p.topicIds))]
    if (allTopicIds.length === 0) return

    getUser().then(async (user) => {
      if (!user) return
      const { data } = await createClient()
        .from('course_progress')
        .select('topic_id,tier')
        .eq('user_id', user.id)
        .in('topic_id', allTopicIds)
      setPassed(new Set((data ?? []).map((r) => `${r.topic_id}:${r.tier}`)))
    })

    const supabase = createClient()
    const base = () =>
      supabase.from('quiz_questions').select('topic_id').eq('active', true).in('topic_id', allTopicIds)
    Promise.all([
      base().is('path_slug', null),
      supabase.from('quiz_questions').select('topic_id,path_slug').eq('active', true).in('topic_id', allTopicIds).not('path_slug', 'is', null),
    ]).then(([generic, pathSpecific]) => {
      const genericIds = (generic.data ?? []).map((r) => r.topic_id)
      const byPath: Record<string, Set<string>> = {}
      for (const path of paths) {
        const specificIds = (pathSpecific.data ?? [])
          .filter((r) => r.path_slug === path.slug)
          .map((r) => r.topic_id)
        byPath[path.slug] = new Set([...genericIds, ...specificIds])
      }
      setQuizTopicsByPath(byPath)
    })
  }, [paths])

  function getProgress(path: LearningPath) {
    if (!mounted) return { read: 0, total: path.topicIds.length }
    const quizTopics = quizTopicsByPath[path.slug] ?? new Set<string>()
    const read = path.topicIds.filter((id) =>
      isTopicComplete(id, quizTopics.has(id), passed, readProgress[id]?.isRead ?? false),
    ).length
    return { read, total: path.topicIds.length }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <h1 className="text-2xl font-bold text-foreground">Learning Paths</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated sequences of topics to guide your study.
        </p>

        <div className="mt-6 space-y-4">
          {paths.map((path) => {
            const Icon = iconMap[path.icon] ?? Star
            const { read, total } = getProgress(path)
            const pct = total > 0 ? Math.round((read / total) * 100) : 0

            return (
              <Link key={path.slug} href={`/paths/${path.slug}`} className="block group">
                <div className="rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon weight="light" size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-semibold text-foreground">{path.title}</h2>
                        <ArrowRight
                          weight="light"
                          size={18}
                          className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                        />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {path.description}
                      </p>
                      {/* Audience + time */}
                      {(path.audience || path.estimatedMinutes) && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {path.estimatedMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock weight="light" size={12} />
                              ~{path.estimatedMinutes} min
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
                      {/* Progress */}
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{total} topics</span>
                          <span>{pct}% complete</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
