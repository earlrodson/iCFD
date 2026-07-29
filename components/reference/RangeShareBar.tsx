'use client'

import type { ReactNode } from 'react'
import { CheckCircle, Export, MagnifyingGlass, Warning } from '@phosphor-icons/react'

interface RangeShareBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  hint: ReactNode
  error?: string | null
  onShare: () => void
  shareDisabled: boolean
  copied: boolean
}

/** Reference-range search + share bar, shared by CCC, Canon Law, and magisterial
 *  document pages — mirrors the Bible page's "John 1:1-14,16" search + share UX. */
export function RangeShareBar({
  value, onChange, onSubmit, placeholder, hint, error, onShare, shareDisabled, copied,
}: RangeShareBarProps) {
  return (
    <div className="mb-4">
      <form
        onSubmit={e => { e.preventDefault(); onSubmit() }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <MagnifyingGlass weight="bold" size={16} />
          <span className="hidden sm:inline">Go</span>
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={shareDisabled}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-40"
          aria-label="Share"
        >
          {copied
            ? <><CheckCircle weight="fill" size={16} className="text-green-500" /> <span className="hidden sm:inline">Copied</span></>
            : <><Export weight="bold" size={16} /> <span className="hidden sm:inline">Share</span></>}
        </button>
      </form>
      <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-400 mt-2">
          <Warning weight="fill" size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
