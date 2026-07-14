'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathsStore } from '@/store/usePathsStore'
import { useProgressStore } from '@/store/useProgressStore'
import { BookOpen, Clock, ChevronRight, GraduationCap, Shield, Flower2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const PATH_ICONS: Record<string, LucideIcon> = {
  'new-catholic': GraduationCap,
  'defend-the-faith': Shield,
  'marian-apologetics': Flower2,
}

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
      <div className="bg-background/80 backdrop-blur-xl sticky top-0 z-10 border-b border-border/60">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center h-12">
            <h1 className="text-[17px] font-semibold">Learning Paths</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-2xl space-y-3">
        <p className="text-[13px] text-muted-foreground">
          Guided sequences to help you learn and defend the faith step by step.
        </p>

        <div className="rounded-2xl bg-card overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] divide-y divide-border">
          {paths.map(path => {
            const { completed, total, percent } = pathsStore.getPathProgress(path.slug, readTopicIds)
            const PathIcon = PATH_ICONS[path.slug] ?? BookOpen
            return (
              <Link
                key={path.slug}
                href={`/paths/${path.slug}`}
                className="flex items-center gap-4 px-4 py-4 active:bg-muted transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <PathIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-semibold text-foreground leading-snug">{path.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 mb-2">
                    <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />{total} topics
                    </span>
                    <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />~{path.estimatedMinutes} min
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{completed}/{total}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </Link>
            )
          })}
        </div>

        {paths.length === 0 && (
          <div className="rounded-2xl bg-card p-10 text-center shadow-sm">
            <BookOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-[14px] text-muted-foreground">Loading paths…</p>
          </div>
        )}
      </div>
    </div>
  )
}
