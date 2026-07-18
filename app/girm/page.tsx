'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { OfflineFallback } from '@/components/ui/OfflineFallback'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GirmArticle {
  article: number
  text: string
  summary: string
  section: string
}

const CHAPTERS = [
  { label: 'Preamble',    range: [1,   15]  },
  { label: 'Chapter I',   range: [16,  26]  },
  { label: 'Chapter II',  range: [27,  90]  },
  { label: 'Chapter III', range: [91,  111] },
  { label: 'Chapter IV',  range: [112, 287] },
  { label: 'Chapter V',   range: [288, 318] },
  { label: 'Chapter VI',  range: [319, 351] },
  { label: 'Chapter VII', range: [352, 367] },
  { label: 'Chapter VIII',range: [368, 385] },
  { label: 'Chapter IX',  range: [386, 399] },
] as const

const CHAPTER_SUBTITLES: Record<string, string> = {
  'Preamble':     'Articles 1–15',
  'Chapter I':    'Importance and Dignity of the Eucharistic Celebration',
  'Chapter II':   'Structure, Elements, and Parts of the Mass',
  'Chapter III':  'Duties and Ministries in the Mass',
  'Chapter IV':   'Various Forms of Celebrating Mass',
  'Chapter V':    'Arrangement and Furnishing of Churches',
  'Chapter VI':   'Requisites for the Celebration of Mass',
  'Chapter VII':  'Choice of the Mass and Its Parts',
  'Chapter VIII': 'Masses and Prayers for Various Circumstances',
  'Chapter IX':   'Adaptations within the Competence of Bishops',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchArticles(from: number, to: number): Promise<GirmArticle[]> {
  try {
    const params = new URLSearchParams({
      article: `gte.${from}`,
      and: `(article.lte.${to})`,
      lang: 'eq.en',
      text: 'not.is.null',
      order: 'article.asc',
      select: 'article,text,summary,section',
      limit: '300',
    })
    const res = await fetch(`${SUPABASE_URL}/rest/v1/girm_articles?${params}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

// ── Components ────────────────────────────────────────────────────────────────

function ArticleCard({ item, expanded, onToggle }: {
  item: GirmArticle
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
          {item.article}
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

export default function GirmPage() {
  const [activeChapter, setActiveChapter] = useState(0)
  const [articles, setArticles] = useState<GirmArticle[]>([])
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

  const load = useCallback(async (chapterIdx: number) => {
    setLoading(true)
    setArticles([])
    setExpandedId(null)
    const [from, to] = CHAPTERS[chapterIdx].range
    const data = await fetchArticles(from, to)
    setArticles(data)
    setLoading(false)
  }, [])

  useEffect(() => { load(activeChapter) }, [activeChapter, load])

  const filtered = search.trim()
    ? articles.filter(a =>
        a.text?.toLowerCase().includes(search.toLowerCase()) ||
        String(a.article).includes(search)
      )
    : articles

  const activeLabel = CHAPTERS[activeChapter].label

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          General Instruction of the Roman Missal
        </h1>
        <p className="text-sm text-muted-foreground">GIRM · 399 Articles</p>
      </div>

      {/* Chapter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {CHAPTERS.map((ch, i) => (
          <button
            key={i}
            onClick={() => setActiveChapter(i)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              activeChapter === i
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* Chapter subtitle */}
      <p className="text-sm font-medium text-foreground mb-3">
        {CHAPTER_SUBTITLES[activeLabel]}
      </p>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search articles or enter a number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} article{filtered.length !== 1 ? 's' : ''}
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

      {/* Articles */}
      {!loading && (
        <div className="space-y-2">
          {filtered.map(item => (
            <ArticleCard
              key={item.article}
              item={item}
              expanded={expandedId === item.article}
              onToggle={() => setExpandedId(expandedId === item.article ? null : item.article)}
            />
          ))}
          {filtered.length === 0 && (
            isOffline && !search
              ? <OfflineFallback contentLabel="articles" />
              : <p className="text-sm text-muted-foreground text-center py-8">
                  No articles found{search ? ` for "${search}"` : ''}.
                </p>
          )}
        </div>
      )}
    </div>
  )
}
