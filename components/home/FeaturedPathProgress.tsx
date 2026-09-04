'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Ladder, ArrowRight } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/supabase/auth'
import { fetchPathBySlug, type LearningPath } from '@/lib/content/paths'
import { isTopicComplete } from '@/lib/content/pathProgress'
import { useReadingStore } from '@/store/useReadingStore'

interface FeaturedPathProgressProps {
  slug: string
}

// Admin-controlled home-page widget (see /admin/paths' "Feature on home
// page" toggle, backed by site_config.home_featured_path) — mirrors the
// progress logic in app/paths/page.tsx and PathDetailClient.tsx so "X of Y
// complete" means the same thing everywhere: a passed quiz for quizzed
// topics, the manual read toggle otherwise.
export function FeaturedPathProgress({ slug }: FeaturedPathProgressProps) {
  const { readProgress } = useReadingStore()
  const [path, setPath] = useState<LearningPath | null>(null)
  const [passed, setPassed] = useState<Set<string>>(new Set())
  const [quizTopics, setQuizTopics] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPathBySlug(slug).then(setPath)
  }, [slug])

  useEffect(() => {
    if (!path) return

    getUser().then(async (user) => {
      if (!user) return
      const { data } = await createClient()
        .from('course_progress')
        .select('topic_id,tier')
        .eq('user_id', user.id)
        .in('topic_id', path.topicIds)
      setPassed(new Set((data ?? []).map((r) => `${r.topic_id}:${r.tier}`)))
    })

    const supabase = createClient()
    const base = () =>
      supabase.from('quiz_questions').select('topic_id').eq('active', true).in('topic_id', path.topicIds)
    Promise.all([base().is('path_slug', null), base().eq('path_slug', path.slug)]).then(
      ([generic, pathSpecific]) => {
        const ids = [...(generic.data ?? []), ...(pathSpecific.data ?? [])].map((r) => r.topic_id)
        setQuizTopics(new Set(ids))
      },
    )
  }, [path])

  if (!path || path.topicIds.length === 0) return null

  const completedCount = path.topicIds.filter((id) =>
    isTopicComplete(id, quizTopics.has(id), passed, readProgress[id]?.isRead ?? false),
  ).length
  const total = path.topicIds.length
  const pct = Math.round((completedCount / total) * 100)
  const finished = completedCount === total

  return (
    <div className="mx-4 mb-5">
      <Link
        href={`/paths/${path.slug}`}
        className="block rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ladder weight="light" size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {finished ? 'Course Complete' : 'Continue Course'}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{path.title}</p>
            </div>
          </div>
          <ArrowRight weight="light" size={16} className="shrink-0 text-muted-foreground" />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {total} topics</span>
            <span className={finished ? 'font-semibold text-primary' : ''}>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Link>
    </div>
  )
}
