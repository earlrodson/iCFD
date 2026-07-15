'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Cross, Shield, Star, ArrowRight } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useReadingStore } from '@/store/useReadingStore'
import pathsData from '@/public/data/content/paths.json'

interface LearningPath {
  slug: string
  title: string
  description: string
  icon: string
  topicIds: string[]
}

const iconMap: Record<string, React.ElementType> = {
  cross: Cross,
  shield: Shield,
  star: Star,
}

export default function PathsPage() {
  const { availableTopics, initialize } = useAppStore()
  const { readProgress } = useReadingStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (availableTopics.length === 0) initialize()
  }, [availableTopics.length, initialize])

  const paths = pathsData.paths as LearningPath[]

  function getProgress(topicIds: string[]) {
    if (!mounted) return { read: 0, total: topicIds.length }
    const read = topicIds.filter((id) => readProgress[id]?.isRead).length
    return { read, total: topicIds.length }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8">
        <h1 className="text-2xl font-bold text-foreground">Learning Paths</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated sequences of topics to guide your study.
        </p>

        <div className="mt-6 space-y-4">
          {paths.map((path) => {
            const Icon = iconMap[path.icon] ?? Star
            const { read, total } = getProgress(path.topicIds)
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
