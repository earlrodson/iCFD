'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CaretLeft, CaretRight, CalendarStar } from '@phosphor-icons/react'
import type { Topic, Category } from '@/data/schema/topic.schema'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Category config ───────────────────────────────────────────────────────────

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

// Gradient fallback shown while/if the Unsplash image fails to load
const GRADIENTS: Record<Category, string> = {
  bible:            'linear-gradient(135deg,#1e3a5f,#2563eb)',
  'church-teaching':'linear-gradient(135deg,#1e3a5f,#7c3aed)',
  mary:             'linear-gradient(135deg,#701a75,#c026d3)',
  tradition:        'linear-gradient(135deg,#713f12,#d97706)',
  saints:           'linear-gradient(135deg,#14532d,#16a34a)',
  papacy:           'linear-gradient(135deg,#1e3a5f,#0891b2)',
  sacraments:       'linear-gradient(135deg,#0c4a6e,#06b6d4)',
  salvation:        'linear-gradient(135deg,#7f1d1d,#dc2626)',
}

// Curated Unsplash photos — one per category
// URL: https://images.unsplash.com/photo-{id}?w=800&auto=format&fit=crop&q=80
const UNSPLASH_IDS: Record<Category, string> = {
  bible:            '1504052434569-70ad5836ab65',
  'church-teaching':'1548625149-720f618c04cb',
  mary:             '1544761634-dc512f2238a3',
  tradition:        '1509023464322-41a1e1f09a50',
  saints:           '1548164557-fd01dc0e7485',
  papacy:           '1531572753322-ad063cecc140',
  sacraments:       '1547592180-85f173990554',
  salvation:        '1499209974431-9dddcece7f88',
}

function imageUrl(category: Category): string {
  return `https://images.unsplash.com/photo-${UNSPLASH_IDS[category]}?w=800&auto=format&fit=crop&q=80`
}

// ── Deterministic daily selection ─────────────────────────────────────────────

function getDayOfYear(): number {
  const now = new Date()
  return Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  )
}

function hash(day: number, extra: number): number {
  return Math.abs(Math.sin(day * 127.1 + extra * 311.7))
}

function getDailyPicks(topics: Topic[]): Topic[] {
  if (topics.length === 0) return []
  const day = getDayOfYear()
  const allCats = Object.keys(GRADIENTS) as Category[]

  const shuffled = [...allCats].sort(
    (a, b) => hash(day, allCats.indexOf(a)) - hash(day, allCats.indexOf(b)),
  )

  const picks: Topic[] = []
  for (const cat of shuffled) {
    if (picks.length === 3) break
    const inCat = topics.filter((t) => t.category === cat)
    if (inCat.length === 0) continue
    picks.push(inCat[Math.floor(hash(day, allCats.indexOf(cat)) * inCat.length)])
  }
  return picks
}

// ── Slide ─────────────────────────────────────────────────────────────────────

function Slide({ topic, active }: { topic: Topic; active: boolean }) {
  return (
    <div
      aria-hidden={!active}
      className={cn(
        'absolute inset-0 transition-opacity duration-700 ease-in-out',
        active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none',
      )}
    >
      {/* Gradient fallback layer — always visible, image sits on top */}
      <div
        className="absolute inset-0"
        style={{ background: GRADIENTS[topic.category] }}
      />

      {/* Topic-specific or category-level photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={topic.coverImage ?? imageUrl(topic.category)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />

      {/* Dark scrim — bottom-heavy so text is always readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

      {/* Content */}
      <Link href={`/${topic.id}`} className="absolute inset-0 flex flex-col justify-end p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
            {LABELS[topic.category]}
          </span>
          <Badge variant="difficulty" value={topic.difficulty} />
        </div>
        <h3 className="text-lg font-bold text-white leading-snug line-clamp-2">
          {topic.title}
        </h3>
        <p className="mt-1.5 text-sm text-white/75 line-clamp-2 leading-relaxed italic">
          &ldquo;{topic.question}&rdquo;
        </p>
      </Link>
    </div>
  )
}

// ── Slider ────────────────────────────────────────────────────────────────────

interface DailyCarouselProps {
  topics: Topic[]
}

export function DailyCarousel({ topics }: DailyCarouselProps) {
  const picks = getDailyPicks(topics)
  const [activeIdx, setActiveIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef(0)

  // Auto-advance — setTimeout so manual navigation resets the 5s countdown
  useEffect(() => {
    if (paused || picks.length <= 1) return
    const t = setTimeout(
      () => setActiveIdx((i) => (i + 1) % picks.length),
      5000,
    )
    return () => clearTimeout(t)
  }, [activeIdx, paused, picks.length])

  if (picks.length === 0) return null

  const prev = () => setActiveIdx((i) => (i - 1 + picks.length) % picks.length)
  const next = () => setActiveIdx((i) => (i + 1) % picks.length)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    setPaused(true)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) delta > 0 ? next() : prev()
    setPaused(false)
  }

  return (
    <section className="pb-6">
      <h2 className="mb-3 flex items-center gap-2 px-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <CalendarStar weight="light" size={15} />
        Today&rsquo;s Picks
      </h2>

      {/* Slider stage */}
      <div
        className="relative mx-4 h-72 overflow-hidden rounded-2xl shadow-md"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {picks.map((topic, i) => (
          <Slide key={topic.id} topic={topic} active={i === activeIdx} />
        ))}

        {/* Prev arrow */}
        {picks.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
            aria-label="Previous topic"
          >
            <CaretLeft weight="bold" size={16} />
          </button>
        )}

        {/* Next arrow */}
        {picks.length > 1 && (
          <button
            onClick={next}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
            aria-label="Next topic"
          >
            <CaretRight weight="bold" size={16} />
          </button>
        )}

        {/* Dot indicators */}
        {picks.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {picks.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300 bg-white',
                  i === activeIdx ? 'w-5 opacity-100' : 'w-1.5 opacity-50',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
