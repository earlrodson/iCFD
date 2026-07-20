'use client'

import { ArrowCircleDown, CheckCircle, WifiSlash, Trash, Warning } from '@phosphor-icons/react'
import { useOfflineCache } from '@/lib/useOfflineCache'
import { SectionLabel } from './components'
import { cn } from '@/lib/utils'

export function OfflineCacheSection() {
  const { status, progress, failCount, download, clear } = useOfflineCache()

  if (status === 'unsupported') return null

  const isDownloading = status === 'downloading'
  const isDone    = status === 'done'
  const isPartial = status === 'partial'
  const isError   = status === 'error'

  function statusLabel() {
    if (isDone)        return 'All content cached'
    if (isPartial)     return `Partially cached${failCount > 0 ? ` (${failCount} failed)` : ''}`
    if (isError)       return 'Download failed'
    if (isDownloading) return `Caching… ${progress}%`
    return 'Download for offline'
  }

  function statusSub() {
    if (isDone)        return 'All topics + Sacred Texts Library available offline'
    if (isPartial)     return 'Tap Download to retry missing items'
    if (isError)       return 'Check your connection and try again'
    if (isDownloading) return 'Please stay on this screen until complete'
    return 'Save all content for use without internet'
  }

  return (
    <section className="space-y-3">
      <SectionLabel>Offline Access</SectionLabel>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            isDone    ? 'bg-emerald-500/10' :
            isError   ? 'bg-rose-500/10' :
            isPartial ? 'bg-amber-500/10' :
            'bg-primary/10',
          )}>
            {isDone    && <CheckCircle weight="fill"  size={20} className="text-emerald-500" />}
            {isError   && <WifiSlash   weight="light" size={20} className="text-rose-500" />}
            {isPartial && <Warning     weight="fill"  size={20} className="text-amber-500" />}
            {!isDone && !isError && !isPartial &&
              <ArrowCircleDown weight="light" size={20} className="text-primary" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{statusLabel()}</p>
            <p className="text-xs text-muted-foreground">{statusSub()}</p>
          </div>

          {/* Action button */}
          {!isDownloading && !isDone && (
            <button
              onClick={download}
              className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Download
            </button>
          )}
          {(isDone || isPartial) && (
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
        {(isDownloading || (isPartial && progress > 0)) && (
          <div className="px-4 pb-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  isPartial ? 'bg-amber-500' : 'bg-primary',
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
