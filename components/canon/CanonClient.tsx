'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { OfflineFallback } from '@/components/ui/OfflineFallback'
import { RangeShareBar } from '@/components/reference/RangeShareBar'
import { fetchCanons, type Canon } from '@/lib/content/canonFetch'
import { parseNumericRanges, formatNumericRanges } from '@/lib/numericRange'

// ── Types ─────────────────────────────────────────────────────────────────────

const BOOKS = [
  { label: 'Book I',   range: [1,    203]  },
  { label: 'Book II',  range: [204,  746]  },
  { label: 'Book III', range: [747,  833]  },
  { label: 'Book IV',  range: [834,  1253] },
  { label: 'Book V',   range: [1254, 1310] },
  { label: 'Book VI',  range: [1311, 1399] },
  { label: 'Book VII', range: [1400, 1752] },
] as const

const BOOK_SUBTITLES: Record<string, string> = {
  'Book I':   'General Norms (cc. 1–203)',
  'Book II':  'The People of God (cc. 204–746)',
  'Book III': 'The Teaching Office of the Church (cc. 747–833)',
  'Book IV':  'The Office of Sanctifying in the Church (cc. 834–1253)',
  'Book V':   'The Temporal Goods of the Church (cc. 1254–1310)',
  'Book VI':  'Sanctions in the Church (cc. 1311–1399)',
  'Book VII': 'Processes (cc. 1400–1752)',
}

// ── Components ────────────────────────────────────────────────────────────────

function CanonCard({ item, expanded, onToggle }: {
  item: Canon
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-start gap-3 p-4">
        <span className="text-xs font-mono font-bold text-primary/70 bg-primary/8 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
          c.{item.canon}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm text-foreground leading-relaxed', !expanded && 'line-clamp-2')}>
            {expanded ? item.text : (item.summary ?? item.text)}
          </p>
          {!expanded && item.text.length > 180 && (
            <span className="text-xs text-muted-foreground mt-1 block">tap to expand</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CanonClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeBook, setActiveBook] = useState(0)
  const [canons, setCanons] = useState<Canon[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [isOffline, setIsOffline] = useState(false)

  // Reference-range search ("849-852, 1055") + share, mirroring the Bible page.
  const [rangeInput, setRangeInput] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [rangeResults, setRangeResults] = useState<Canon[]>([])
  const [rangeView, setRangeView] = useState(false)
  const [rangeExpanded, setRangeExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const on = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const runRangeSearch = useCallback(async (raw: string, syncUrl: boolean) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    const ranges = parseNumericRanges(trimmed)
    if (!ranges) {
      setRangeError(`Couldn't parse "${trimmed}" — try "849" or "849-852, 1055".`)
      return
    }
    setRangeError(null)
    setRangeView(true)
    setRangeExpanded(null)
    const results = await Promise.all(ranges.map(r => fetchCanons(r.start, r.end)))
    const flat = results.flat().sort((a, b) => a.canon - b.canon)
    setRangeResults(flat)
    if (flat.length === 1) setRangeExpanded(flat[0].canon)

    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('canon', trimmed)
      router.replace(`/canon?${params.toString()}`, { scroll: false })
    }
  }, [router, searchParams])

  // Auto-run a shared range link (?canon=849-852,1055) on load.
  useEffect(() => {
    const c = searchParams.get('canon')
    if (!c) return
    setRangeInput(c)
    runRangeSearch(c, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRangeSubmit = () => runRangeSearch(rangeInput, true)

  const handleShareRange = async () => {
    const ranges = parseNumericRanges(rangeInput.trim())
    const url = window.location.href
    const title = ranges
      ? `Canon ${formatNumericRanges(ranges)} — Code of Canon Law`
      : 'Code of Canon Law'
    if (navigator.share) {
      await navigator.share({ title, url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const exitRangeView = () => {
    setRangeView(false)
    setRangeInput('')
    setRangeError(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('canon')
    router.replace(params.toString() ? `/canon?${params.toString()}` : '/canon', { scroll: false })
  }

  const load = useCallback(async (bookIdx: number) => {
    setLoading(true)
    setCanons([])
    setExpandedId(null)
    const [from, to] = BOOKS[bookIdx].range
    const data = await fetchCanons(from, to)
    setCanons(data)
    setLoading(false)
  }, [])

  useEffect(() => { if (!rangeView) load(activeBook) }, [activeBook, load, rangeView])

  const filtered = search.trim()
    ? canons.filter(c =>
        c.text?.toLowerCase().includes(search.toLowerCase()) ||
        String(c.canon).includes(search)
      )
    : canons

  const activeLabel = BOOKS[activeBook].label

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Code of Canon Law
        </h1>
        <p className="text-sm text-muted-foreground">1983 · 1,752 Canons</p>
      </div>

      {/* Reference search + share */}
      <RangeShareBar
        value={rangeInput}
        onChange={setRangeInput}
        onSubmit={handleRangeSubmit}
        placeholder="Jump to a canon (849) or range (849-852, 1055)"
        hint={<>Range: <span className="font-mono">849-852</span> · Multiple: <span className="font-mono">849-852, 1055</span></>}
        error={rangeError}
        onShare={handleShareRange}
        shareDisabled={!rangeView}
        copied={copied}
      />

      {rangeView ? (
        <>
          {/* ── Range results ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">
              {rangeResults.length} canon{rangeResults.length !== 1 ? 's' : ''} found
            </p>
            <button onClick={exitRangeView} className="text-xs text-primary hover:underline">
              Back to browsing
            </button>
          </div>
          <div className="space-y-2">
            {rangeResults.map(item => (
              <CanonCard
                key={item.canon}
                item={item}
                expanded={rangeExpanded === item.canon}
                onToggle={() => setRangeExpanded(rangeExpanded === item.canon ? null : item.canon)}
              />
            ))}
            {rangeResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No canons found for that range.</p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Book tabs */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {BOOKS.map((bk, i) => (
              <button
                key={i}
                onClick={() => setActiveBook(i)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  activeBook === i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {bk.label}
              </button>
            ))}
          </div>

          {/* Book subtitle */}
          <p className="text-sm font-medium text-foreground mb-3">
            {BOOK_SUBTITLES[activeLabel]}
          </p>

          {/* Search */}
          <div className="mb-4">
            <input
              type="search"
              placeholder="Search canons or enter a number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Count */}
          {!loading && (
            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length} canon{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </p>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {/* Canons */}
          {!loading && (
            <div className="space-y-2">
              {filtered.map(item => (
                <div key={item.canon} id={`c-${item.canon}`}>
                  <CanonCard
                    item={item}
                    expanded={expandedId === item.canon}
                    onToggle={() => setExpandedId(expandedId === item.canon ? null : item.canon)}
                  />
                </div>
              ))}
              {filtered.length === 0 && (
                isOffline && !search
                  ? <OfflineFallback contentLabel="canons" />
                  : <p className="text-sm text-muted-foreground text-center py-8">
                      No canons found{search ? ` for "${search}"` : ''}.
                    </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
