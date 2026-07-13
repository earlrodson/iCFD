'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePathsStore } from '@/store/usePathsStore'
import { useProgressStore } from '@/store/useProgressStore'
import { BookOpen, Clock, ChevronRight } from 'lucide-react'

export default function PathsPage() {
  const { paths, loadPaths } = usePathsStore()
  const { readTopicIds, loadProgress } = useProgressStore()
  const pathsStore = usePathsStore()

  useEffect(() => {
    loadPaths()
    loadProgress()
  }, [loadPaths, loadProgress])

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Learning Paths</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <p className="text-muted-foreground mb-6 text-sm">
          Guided sequences of topics to help you learn and defend the faith step by step.
        </p>

        <div className="space-y-4">
          {paths.map(path => {
            const { completed, total, percent } = pathsStore.getPathProgress(path.slug, readTopicIds)
            return (
              <Link
                key={path.slug}
                href={`/paths/${path.slug}`}
                className="block border rounded-xl p-5 hover:bg-accent/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{path.icon}</span>
                      <h2 className="font-bold text-lg leading-tight">{path.title}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {path.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {total} topics
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        ~{path.estimatedMinutes} min
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">{path.difficulty}</Badge>
                    </div>
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{completed} of {total} completed</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>

        {paths.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Loading paths…</p>
          </div>
        )}
      </div>
    </div>
  )
}
