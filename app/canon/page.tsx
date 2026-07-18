'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { OfflineFallback } from '@/components/ui/OfflineFallback'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Canon {
  canon: number
  text: string
  summary: string
  book: string
}

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchCanons(from: number, to: number): Promise<Canon[]> {
  try {
    const params = new URLSearchParams({
      canon: `gte.${from}`,
      and: `(canon.lte.${to})`,
      lang: 'eq.en',
      text: 'not.is.null',
      order: 'canon.asc',
      select: 'canon,text,summary,book',
      limit: '600',
    })
    const res = await fetch(`${SUPABASE_URL}/rest/v1/canons?${params}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
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

export default function CanonPage() {
  const [activeBook, setActiveBook] = useState(0)
  const [canons, setCanons] = useState<Canon[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const on = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const load = useCallback(async (bookIdx: number) => {
    setLoading(true)
    setCanons([])
    setExpandedId(null)
    const [from, to] = BOOKS[bookIdx].range
    const data = await fetchCanons(from, to)
    setCanons(data)
    setLoading(false)
  }, [])

  useEffect(() => { load(activeBook) }, [activeBook, load])

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
            <CanonCard
              key={item.canon}
              item={item}
              expanded={expandedId === item.canon}
              onToggle={() => setExpandedId(expandedId === item.canon ? null : item.canon)}
            />
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
    </div>
  )
}
