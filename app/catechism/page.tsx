'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
  const params = new URLSearchParams({
    paragraph: `gte.${from}`,
    and: `(paragraph.lte.${to})`,
    lang: 'eq.en',
    text: 'not.is.null',
    order: 'paragraph.asc',
    select: 'paragraph,text,summary,section',
    limit: '200',
  })
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ccc_paragraphs?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!res.ok) return []
  return res.json()
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
            <ParagraphCard
              key={para.paragraph}
              para={para}
              expanded={expandedId === para.paragraph}
              onToggle={() => setExpandedId(expandedId === para.paragraph ? null : para.paragraph)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No paragraphs found{search ? ` for "${search}"` : ''}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
