'use client'

import { ArrowCircleDown, CheckCircle, WifiSlash, Trash } from '@phosphor-icons/react'
import { useOfflineCache } from '@/lib/useOfflineCache'
import { SectionLabel } from './components'
import { cn } from '@/lib/utils'

export function OfflineCacheSection() {
  const { status, progress, download, clear } = useOfflineCache()

  if (status === 'unsupported') return null

  const isDownloading = status === 'downloading'
  const isDone = status === 'done'

  return (
    <section className="space-y-3">
      <SectionLabel>Offline Access</SectionLabel>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Status row */}
        <div className="flex items-center gap-3 p-4">
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            isDone ? 'bg-emerald-500/10' : 'bg-primary/10',
          )}>
            {isDone
              ? <CheckCircle weight="fill" size={20} className="text-emerald-500" />
              : status === 'error'
              ? <WifiSlash weight="light" size={20} className="text-rose-500" />
              : <ArrowCircleDown weight="light" size={20} className="text-primary" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {isDone ? 'Content cached' : 'Download for offline'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isDone
                ? 'All 3 languages ready offline'
                : status === 'error'
                ? 'Download failed — check connection'
                : isDownloading
                ? `Caching… ${progress}%`
                : 'Save all content for use without internet'}
            </p>
          </div>
          {!isDownloading && !isDone && (
            <button
              onClick={download}
              className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Download
            </button>
          )}
          {isDone && (
            <button
              onClick={clear}
              className="shrink-0 flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-rose-500 transition-colors"
              title="Remove cached content"
            >
              <Trash weight="light" size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Progress bar */}
        {isDownloading && (
          <div className="px-4 pb-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
