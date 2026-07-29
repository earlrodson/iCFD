'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowLeft, CaretDown, CaretUp } from '@phosphor-icons/react'
import { RangeShareBar } from '@/components/reference/RangeShareBar'
import { fetchDocMeta, fetchDocSections, countDocSections, DOCUMENT_BATCH, type DocMeta, type DocSection } from '@/lib/content/documentFetch'
import { parseNumericRanges, formatNumericRanges } from '@/lib/numericRange'

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ section, expanded, onToggle }: {
  section: DocSection
  expanded: boolean
  onToggle: () => void
}) {
  const body = expanded ? section.text : (section.summary ?? section.text)
  return (
    <div
      id={`section-${section.section_num}`}
      className="border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onToggle}
    >
      {section.section_label && (
        <div className="px-4 pt-3 pb-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {section.section_label}
          </p>
        </div>
      )}
      <div className="flex items-start gap-3 p-4">
        <span className="text-xs font-mono font-bold text-primary/70 bg-primary/8 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
          §{section.section_num}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm text-foreground leading-relaxed', !expanded && 'line-clamp-3')}>
            {body ?? ''}
          </p>
          {!expanded && (body ?? '').length > 240 && (
            <span className="text-xs text-muted-foreground mt-1 flex items-center gap-0.5">
              <CaretDown size={11} /> read more
            </span>
          )}
          {expanded && (
            <span className="text-xs text-muted-foreground mt-1 flex items-center gap-0.5">
              <CaretUp size={11} /> collapse
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DocumentClient() {
  const { slug }   = useParams<{ slug: string }>()
  const router     = useRouter()
  const searchParams = useSearchParams()

  const [meta, setMeta]         = useState<DocMeta | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)

  const [sections, setSections]   = useState<DocSection[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  // Ref-based guard so concurrent scroll/effect calls can't both slip through
  // before setLoading(true) propagates through React state.
  const fetchingRef = useRef(false)
  const sectionsRef = useRef<DocSection[]>([])

  const [expanded, setExpanded]   = useState<Set<number>>(new Set())

  // Reference-range search ("12-15, 20") + share, mirroring the Bible page.
  const [rangeInput, setRangeInput] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [rangeResults, setRangeResults] = useState<DocSection[]>([])
  const [rangeView, setRangeView] = useState(false)
  const [rangeExpanded, setRangeExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const runRangeSearch = useCallback(async (raw: string, syncUrl: boolean) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    const ranges = parseNumericRanges(trimmed)
    if (!ranges) {
      setRangeError(`Couldn't parse "${trimmed}" — try "12" or "12-15, 20".`)
      return
    }
    setRangeError(null)
    setRangeView(true)
    setRangeExpanded(null)
    const results = await Promise.all(ranges.map(r => fetchDocSections(slug, r.start, r.end)))
    const flat = results.flat().sort((a, b) => a.section_num - b.section_num)
    setRangeResults(flat)
    if (flat.length === 1) setRangeExpanded(flat[0].section_num)

    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('s')
      params.set('s', trimmed)
      router.replace(`/documents/${slug}?${params.toString()}`, { scroll: false })
    }
  }, [slug, router, searchParams])

  const handleRangeSubmit = () => runRangeSearch(rangeInput, true)

  const handleShareRange = async () => {
    const ranges = parseNumericRanges(rangeInput.trim())
    const url = window.location.href
    const title = ranges && meta
      ? `${meta.title} §${formatNumericRanges(ranges)}`
      : meta?.title ?? 'Church Document'
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
    params.delete('s')
    router.replace(params.toString() ? `/documents/${slug}?${params.toString()}` : `/documents/${slug}`, { scroll: false })
  }

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || rangeView) return
    const current = sectionsRef.current
    if (initialLoaded && current.length >= total) return
    fetchingRef.current = true
    setLoading(true)
    const from = current.length > 0
      ? current[current.length - 1].section_num + 1
      : 1
    const to = from + DOCUMENT_BATCH - 1
    const next = await fetchDocSections(slug, from, to)
    setSections(prev => {
      const merged = [...prev, ...next]
      sectionsRef.current = merged
      return merged
    })
    setLoading(false)
    setInitialLoaded(true)
    fetchingRef.current = false
  }, [initialLoaded, total, slug, rangeView])

  // Initial load — reset all state when slug changes
  useEffect(() => {
    setSections([])
    sectionsRef.current = []
    fetchingRef.current = false
    setInitialLoaded(false)
    setTotal(0)
    setMetaLoading(true)
    fetchDocMeta(slug).then(m => {
      setMeta(m)
      setMetaLoading(false)
    })
    countDocSections(slug).then(setTotal)
  }, [slug])

  useEffect(() => {
    if (!metaLoading) loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaLoading])

  // Auto-run a shared range link (?s=12-15,20) once meta has loaded.
  useEffect(() => {
    if (metaLoading) return
    const s = searchParams.get('s')
    if (!s) return
    setRangeInput(s)
    runRangeSearch(s, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaLoading])

  // Infinite scroll
  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400
      if (nearBottom) loadMore()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [loadMore])

  const toggleExpanded = (num: number) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })

  if (metaLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="h-6 w-48 bg-muted animate-pulse rounded mb-2" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!meta) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-muted-foreground text-sm">Document not found.</p>
        <Link href="/library" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Back to Library
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back nav */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={14} />
        Library
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground leading-tight">{meta.title}</h1>
        {meta.subtitle && (
          <p className="text-sm text-muted-foreground mt-1 italic">{meta.subtitle}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {meta.author && (
            <span className="text-xs text-muted-foreground capitalize">{meta.author.replace(/-/g, ' ')}</span>
          )}
          {meta.author && meta.year && <span className="text-muted-foreground/40 text-xs">·</span>}
          {meta.year && (
            <span className="text-xs text-muted-foreground">{meta.year}</span>
          )}
          {total > 0 && (
            <>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground">{total} sections</span>
            </>
          )}
        </div>
        {meta.description && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-l-2 border-border pl-3">
            {meta.description}
          </p>
        )}
      </div>

      {/* Reference search + share */}
      <RangeShareBar
        value={rangeInput}
        onChange={setRangeInput}
        onSubmit={handleRangeSubmit}
        placeholder="Jump to a section (12) or range (12-15, 20)"
        hint={<>Range: <span className="font-mono">12-15</span> · Multiple: <span className="font-mono">12-15, 20</span></>}
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
              {rangeResults.length} section{rangeResults.length !== 1 ? 's' : ''} found
            </p>
            <button onClick={exitRangeView} className="text-xs text-primary hover:underline">
              Back to full text
            </button>
          </div>
          <div className="space-y-3">
            {rangeResults.map(s => (
              <SectionCard
                key={s.section_num}
                section={s}
                expanded={rangeExpanded === s.section_num}
                onToggle={() => setRangeExpanded(rangeExpanded === s.section_num ? null : s.section_num)}
              />
            ))}
            {rangeResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No sections found for that range.</p>
            )}
          </div>
        </>
      ) : (
        /* Sections */
        <div className="space-y-3">
          {sections.map(s => (
            <SectionCard
              key={s.section_num}
              section={s}
              expanded={expanded.has(s.section_num)}
              onToggle={() => toggleExpanded(s.section_num)}
            />
          ))}

          {loading && (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
                  <div className="h-4 w-full bg-muted rounded mb-2" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              ))}
            </>
          )}

          {initialLoaded && sections.length >= total && total > 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              End of document · {total} sections
            </p>
          )}
        </div>
      )}
    </div>
  )
}
