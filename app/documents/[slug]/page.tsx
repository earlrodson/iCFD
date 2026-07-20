'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowLeft, CaretDown, CaretUp } from '@phosphor-icons/react'
import { cachedLibraryFetch } from '@/lib/libraryCache'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocMeta {
  slug: string
  title: string
  subtitle: string | null
  author: string | null
  year: number | null
  description: string | null
  free_access: boolean
  sort_order: number
}

interface DocSection {
  section_num: number
  section_label: string | null
  text: string | null
  summary: string | null
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const BATCH = 50

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchMeta(slug: string): Promise<DocMeta | null> {
  try {
    const res = await cachedLibraryFetch(
      `${SUPABASE_URL}/rest/v1/church_document_meta?slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    )
    if (!res.ok) return null
    const rows: DocMeta[] = await res.json()
    return rows[0] ?? null
  } catch {
    return null
  }
}

async function fetchSections(slug: string, from: number, to: number): Promise<DocSection[]> {
  try {
    const params = new URLSearchParams({
      slug: `eq.${slug}`,
      section_num: `gte.${from}`,
      and: `(section_num.lte.${to})`,
      order: 'section_num.asc',
      select: 'section_num,section_label,text,summary',
      limit: String(BATCH),
    })
    const res = await cachedLibraryFetch(
      `${SUPABASE_URL}/rest/v1/church_documents?${params}`,
      { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function countSections(slug: string): Promise<number> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/church_documents?slug=eq.${encodeURIComponent(slug)}&select=section_num`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'count=exact',
          Range: '0-0',
        },
      },
    )
    const cr = res.headers.get('content-range')
    if (cr) {
      const total = parseInt(cr.split('/')[1] ?? '0', 10)
      if (!isNaN(total)) return total
    }
    return 0
  } catch {
    return 0
  }
}

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

export default function DocumentPage() {
  const { slug }   = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const deepLink   = searchParams.get('s') ? parseInt(searchParams.get('s')!, 10) : null

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

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return
    const current = sectionsRef.current
    if (initialLoaded && current.length >= total) return
    fetchingRef.current = true
    setLoading(true)
    const from = current.length > 0
      ? current[current.length - 1].section_num + 1
      : 1
    const to = from + BATCH - 1
    const next = await fetchSections(slug, from, to)
    setSections(prev => {
      const merged = [...prev, ...next]
      sectionsRef.current = merged
      return merged
    })
    setLoading(false)
    setInitialLoaded(true)
    fetchingRef.current = false
  }, [initialLoaded, total, slug])

  // Initial load — reset all state when slug changes
  useEffect(() => {
    setSections([])
    sectionsRef.current = []
    fetchingRef.current = false
    setInitialLoaded(false)
    setTotal(0)
    setMetaLoading(true)
    fetchMeta(slug).then(m => {
      setMeta(m)
      setMetaLoading(false)
    })
    countSections(slug).then(setTotal)
  }, [slug])

  useEffect(() => {
    if (!metaLoading) loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaLoading])

  // Deep-link: once the target section is loaded, expand + scroll to it
  const deepLinkedRef = useRef(false)
  useEffect(() => {
    if (!deepLink || deepLinkedRef.current) return
    const target = sections.find(s => s.section_num === deepLink)
    if (!target) return
    deepLinkedRef.current = true
    setExpanded(prev => new Set([...prev, deepLink]))
    setTimeout(() => {
      document.getElementById(`section-${deepLink}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }, [sections, deepLink])

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
      next.has(num) ? next.delete(num) : next.add(num)
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

      {/* Sections */}
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
    </div>
  )
}
