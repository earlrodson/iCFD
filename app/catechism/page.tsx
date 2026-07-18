'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { OfflineFallback } from '@/components/ui/OfflineFallback'
import { cachedLibraryFetch } from '@/lib/libraryCache'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CccParagraph {
  paragraph: number
  text: string
  summary: string
  section: string
}

const PARTS = [
  { label: 'Part One: The Profession of Faith',               range: [1,   1065] },
  { label: 'Part Two: The Celebration of the Christian Mystery', range: [1066, 1690] },
  { label: 'Part Three: Life in Christ',                      range: [1691, 2557] },
  { label: 'Part Four: Christian Prayer',                     range: [2558, 2865] },
] as const

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchParagraphs(from: number, to: number): Promise<CccParagraph[]> {
  try {
    const params = new URLSearchParams({
      paragraph: `gte.${from}`,
      and: `(paragraph.lte.${to})`,
      lang: 'eq.en',
      text: 'not.is.null',
      order: 'paragraph.asc',
      select: 'paragraph,text,summary,section',
      limit: '200',
    })
    const res = await cachedLibraryFetch(
      `${SUPABASE_URL}/rest/v1/ccc_paragraphs?${params}`,
      { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CatechismPage() {
  const [activePart, setActivePart] = useState(0)
  const [paragraphs, setParagraphs] = useState<CccParagraph[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  const [targetPara, setTargetPara] = useState<number | null>(null)
  const [deepLink, setDeepLink] = useState<CccParagraph | null>(null)
  const scrolled = useRef(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const on = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Read ?p= deep link param on mount
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('p')
    const num = p ? parseInt(p) : null
    if (!num) return
    setTargetPara(num)
    // Auto-switch to the correct part
    const partIdx = PARTS.findIndex(({ range }) => num >= range[0] && num <= range[1])
    if (partIdx !== -1) setActivePart(partIdx)
    // Fetch that specific paragraph for the featured card
    fetchParagraphs(num, num).then(rows => { if (rows[0]) setDeepLink(rows[0]) })
  }, [])

  // Scroll to deep-linked paragraph once it appears in the list
  useEffect(() => {
    if (!targetPara || loading || scrolled.current) return
    const el = document.getElementById(`p-${targetPara}`)
    if (!el) return
    scrolled.current = true
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('highlight-flash')
  }, [targetPara, loading, paragraphs])

  const load = useCallback(async (partIdx: number) => {
    setLoading(true)
    setParagraphs([])
    setExpandedId(null)
    const [from, to] = PARTS[partIdx].range
    const data = await fetchParagraphs(from, to)
    setParagraphs(data)
    setLoading(false)
  }, [])

  useEffect(() => { load(activePart) }, [activePart, load])

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

      {/* Deep-link featured card */}
      {deepLink && (
        <div className="mb-5 rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-mono font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">
              CCC {deepLink.paragraph}
            </span>
            <button
              onClick={() => setDeepLink(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{deepLink.text ?? deepLink.summary}</p>
          {deepLink.section && <p className="text-xs text-muted-foreground mt-2">{deepLink.section}</p>}
        </div>
      )}

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

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
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
    </div>
  )
}
