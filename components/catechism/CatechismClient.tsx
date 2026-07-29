'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { OfflineFallback } from '@/components/ui/OfflineFallback'
import { RangeShareBar } from '@/components/reference/RangeShareBar'
import { fetchParagraphs, getCachedParagraphs, type CccParagraph } from '@/lib/content/catechismFetch'
import { parseNumericRanges, formatNumericRanges } from '@/lib/numericRange'

// ── Types ─────────────────────────────────────────────────────────────────────

const PARTS = [
  { label: 'Part One: The Profession of Faith',               range: [1,   1065] },
  { label: 'Part Two: The Celebration of the Christian Mystery', range: [1066, 1690] },
  { label: 'Part Three: Life in Christ',                      range: [1691, 2557] },
  { label: 'Part Four: Christian Prayer',                     range: [2558, 2865] },
] as const

// ── Components ────────────────────────────────────────────────────────────────

function ParagraphCard({ para, expanded, onToggle }: {
  para: CccParagraph
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
          {para.paragraph}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm text-foreground leading-relaxed', !expanded && 'line-clamp-2')}>
            {expanded ? para.text : (para.summary ?? para.text)}
          </p>
          {!expanded && para.text.length > 180 && (
            <span className="text-xs text-muted-foreground mt-1 block">tap to expand</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ParagraphCardSkeleton() {
  return (
    <div className="border border-border rounded-lg p-4 flex items-start gap-3">
      <span className="h-5 w-8 rounded bg-muted animate-pulse shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-2 py-0.5">
        <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
        <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CatechismClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activePart, setActivePart] = useState(0)
  const [paragraphs, setParagraphs] = useState<CccParagraph[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  // Guards against a slow background revalidation (or slow first fetch) for
  // a part the user has since navigated away from clobbering current state.
  const latestPartRef = useRef(0)

  // Reference-range search ("1213-1220, 2258") + share, mirroring the Bible page.
  const [rangeInput, setRangeInput] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [rangeResults, setRangeResults] = useState<CccParagraph[]>([])
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
      setRangeError(`Couldn't parse "${trimmed}" — try "1213" or "1213-1220, 2258".`)
      return
    }
    setRangeError(null)
    setRangeView(true)
    setRangeExpanded(null)
    const results = await Promise.all(ranges.map(r => fetchParagraphs(r.start, r.end)))
    const flat = results.flat().sort((a, b) => a.paragraph - b.paragraph)
    setRangeResults(flat)
    if (flat.length === 1) setRangeExpanded(flat[0].paragraph)

    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('p', trimmed)
      router.replace(`/catechism?${params.toString()}`, { scroll: false })
    }
  }, [router, searchParams])

  // Auto-run a shared range link (?p=1213-1220,2258) on load.
  useEffect(() => {
    const p = searchParams.get('p')
    if (!p) return
    setRangeInput(p)
    runRangeSearch(p, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRangeSubmit = () => runRangeSearch(rangeInput, true)

  const handleShareRange = async () => {
    const ranges = parseNumericRanges(rangeInput.trim())
    const url = window.location.href
    const title = ranges
      ? `CCC ${formatNumericRanges(ranges)} — Catechism of the Catholic Church`
      : 'Catechism of the Catholic Church'
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
    params.delete('p')
    router.replace(params.toString() ? `/catechism?${params.toString()}` : '/catechism', { scroll: false })
  }

  const load = useCallback(async (partIdx: number) => {
    latestPartRef.current = partIdx
    setExpandedId(null)
    const [from, to] = PARTS[partIdx].range

    // Stale-while-revalidate: a cache hit renders instantly with no skeleton
    // at all, then quietly refreshes in the background in case content changed.
    const cached = await getCachedParagraphs(from, to)
    if (latestPartRef.current !== partIdx) return
    if (cached) {
      setParagraphs(cached)
      setLoading(false)
      const fresh = await fetchParagraphs(from, to)
      if (fresh.length > 0 && latestPartRef.current === partIdx) setParagraphs(fresh)
      return
    }

    setLoading(true)
    setParagraphs([])
    const data = await fetchParagraphs(from, to)
    if (latestPartRef.current === partIdx) {
      setParagraphs(data)
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (!rangeView) load(activePart) }, [activePart, load, rangeView])

  const filtered = search.trim()
    ? paragraphs.filter(p =>
        p.text?.toLowerCase().includes(search.toLowerCase()) ||
        String(p.paragraph).includes(search)
      )
    : paragraphs

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Catechism of the Catholic Church</h1>
        <p className="text-sm text-muted-foreground">Second Edition</p>
      </div>

      {/* Reference search + share */}
      <RangeShareBar
        value={rangeInput}
        onChange={setRangeInput}
        onSubmit={handleRangeSubmit}
        placeholder="Jump to a paragraph (1213) or range (1213-1220, 2258)"
        hint={<>Range: <span className="font-mono">1213-1220</span> · Multiple: <span className="font-mono">1213-1220, 2258</span></>}
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
              {rangeResults.length} paragraph{rangeResults.length !== 1 ? 's' : ''} found
            </p>
            <button onClick={exitRangeView} className="text-xs text-primary hover:underline">
              Back to browsing
            </button>
          </div>
          <div className="space-y-2">
            {rangeResults.map(para => (
              <ParagraphCard
                key={para.paragraph}
                para={para}
                expanded={rangeExpanded === para.paragraph}
                onToggle={() => setRangeExpanded(rangeExpanded === para.paragraph ? null : para.paragraph)}
              />
            ))}
            {rangeResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No paragraphs found for that range.</p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Part tabs */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {PARTS.map((part, i) => (
              <button
                key={i}
                onClick={() => setActivePart(i)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  activePart === i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                Part {i + 1}
              </button>
            ))}
          </div>

          {/* Part title */}
          <p className="text-sm font-medium text-foreground mb-3">{PARTS[activePart].label}</p>

          {/* Search */}
          <div className="mb-4">
            <input
              type="search"
              placeholder="Search paragraphs or enter a number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Count */}
          {!loading && (
            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length} paragraph{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </p>
          )}

          {/* Loading — only shown on a true cache miss; a stale-while-revalidate
              hit renders the previous result instantly instead. */}
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <ParagraphCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Paragraphs */}
          {!loading && (
            <div className="space-y-2">
              {filtered.map(para => (
                <div key={para.paragraph} id={`p-${para.paragraph}`}>
                  <ParagraphCard
                    para={para}
                    expanded={expandedId === para.paragraph}
                    onToggle={() => setExpandedId(expandedId === para.paragraph ? null : para.paragraph)}
                  />
                </div>
              ))}
              {filtered.length === 0 && (
                isOffline && !search
                  ? <OfflineFallback contentLabel="paragraphs" />
                  : <p className="text-sm text-muted-foreground text-center py-8">
                      No paragraphs found{search ? ` for "${search}"` : ''}.
                    </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
