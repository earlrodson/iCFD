'use client'

import { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Buildings,
  Flower,
  Scroll,
  Star,
  Crown,
  Drop,
  Heart,
  CalendarStar,
} from '@phosphor-icons/react'
import type { Topic, Category } from '@/data/schema/topic.schema'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

// ── Category visual config ────────────────────────────────────────────────────

type GradientPair = readonly [string, string] // [from, to]

const GRADIENTS: Record<Category, GradientPair> = {
  bible:            ['#1e3a5f', '#2563eb'],
  'church-teaching':['#1e3a5f', '#7c3aed'],
  mary:             ['#701a75', '#c026d3'],
  tradition:        ['#713f12', '#d97706'],
  saints:           ['#14532d', '#16a34a'],
  papacy:           ['#1e3a5f', '#0891b2'],
  sacraments:       ['#0c4a6e', '#06b6d4'],
  salvation:        ['#7f1d1d', '#dc2626'],
}

const ICONS: Record<Category, React.ElementType> = {
  bible: BookOpen,
  'church-teaching': Buildings,
  mary: Flower,
  tradition: Scroll,
  saints: Star,
  papacy: Crown,
  sacraments: Drop,
  salvation: Heart,
}

const LABELS: Record<Category, string> = {
  bible: 'Bible',
  'church-teaching': 'Church Teaching',
  mary: 'Mary',
  tradition: 'Tradition',
  saints: 'Saints',
  papacy: 'Papacy',
  sacraments: 'Sacraments',
  salvation: 'Salvation',
}

// ── Deterministic daily selection ─────────────────────────────────────────────

function getDayOfYear(): number {
  const now = new Date()
  return Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  )
}

/** Deterministic float in [0, 1) for a given day + secondary seed. */
function hash(day: number, extra: number): number {
  return Math.abs(Math.sin(day * 127.1 + extra * 311.7))
}

function getDailyPicks(topics: Topic[]): Topic[] {
  if (topics.length === 0) return []
  const day = getDayOfYear()
  const allCategories = Object.keys(GRADIENTS) as Category[]

  // Shuffle categories deterministically by day so picks span different areas
  const shuffled = [...allCategories].sort(
    (a, b) =>
      hash(day, allCategories.indexOf(a)) - hash(day, allCategories.indexOf(b)),
  )

  const picks: Topic[] = []
  for (const cat of shuffled) {
    if (picks.length === 3) break
    const inCat = topics.filter((t) => t.category === cat)
    if (inCat.length === 0) continue
    const idx = Math.floor(hash(day, allCategories.indexOf(cat)) * inCat.length)
    picks.push(inCat[idx])
  }
  return picks
}

// ── Card ──────────────────────────────────────────────────────────────────────

function CarouselCard({ topic }: { topic: Topic }) {
  const [from, to] = GRADIENTS[topic.category]
  const Icon = ICONS[topic.category]

  return (
    <Link
      href={`/${topic.id}`}
      className="block flex-none w-[calc(100%-4rem)] md:w-full"
      style={{ scrollSnapAlign: 'start' }}
    >
      <article className="h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        {/* Gradient banner */}
        <div
          className="relative flex h-36 items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          <Icon weight="light" size={52} className="text-white/70" />
          <div className="absolute bottom-3 right-3">
            <Badge variant="difficulty" value={topic.difficulty} />
          </div>
        </div>

        {/* Text content */}
        <div className="p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {LABELS[topic.category]}
          </p>
          <h3 className="font-semibold text-foreground leading-snug line-clamp-2">
            {topic.title}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed italic">
            &ldquo;{topic.question}&rdquo;
          </p>
        </div>
      </article>
    </Link>
  )
}

// ── Carousel ──────────────────────────────────────────────────────────────────

interface DailyCarouselProps {
  topics: Topic[]
}

export function DailyCarousel({ topics }: DailyCarouselProps) {
  const picks = getDailyPicks(topics)
  const [activeIdx, setActiveIdx] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const el = trackRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const ratio = el.scrollLeft / (el.scrollWidth - el.clientWidth)
    setActiveIdx(Math.round(ratio * (picks.length - 1)))
  }, [picks.length])

  if (picks.length === 0) return null

  return (
    <section className="pb-6">
      {/* Section heading */}
      <h2 className="mb-3 flex items-center gap-2 px-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <CalendarStar weight="light" size={15} />
        Today&rsquo;s Picks
      </h2>

      {/* Scroll track — horizontal on mobile, 3-col grid on desktop */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none md:grid md:grid-cols-3 md:overflow-x-visible md:pb-0"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {picks.map((topic) => (
          <CarouselCard key={topic.id} topic={topic} />
        ))}
      </div>

      {/* Dot indicators — mobile only */}
      {picks.length > 1 && (
        <div className="mt-3 flex justify-center gap-2 md:hidden">
          {picks.map((_, i) => (
            <span
              key={i}
              className={cn(
                'block h-1.5 rounded-full transition-all duration-200',
                i === activeIdx
                  ? 'w-4 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
