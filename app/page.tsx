'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Clock, Heart, Sparkle } from '@phosphor-icons/react/dist/ssr'
import { useAppStore } from '@/store/useAppStore'
import { useSearchStore } from '@/store/useSearchStore'
import { useReadingStore } from '@/store/useReadingStore'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { CategoryFilter } from '@/components/home/CategoryFilter'
import { TopicGrid } from '@/components/home/TopicGrid'
import { TopicCard } from '@/components/topic/TopicCard'
import { DailyCarousel } from '@/components/home/DailyCarousel'
import type { Category, Topic } from '@/data/schema/topic.schema'

// Compact category colour dot for Continue Reading chips
const CHIP_COLOR: Record<string, string> = {
  bible:            'bg-blue-600',
  'church-teaching':'bg-violet-600',
  mary:             'bg-fuchsia-600',
  tradition:        'bg-amber-600',
  saints:           'bg-green-600',
  papacy:           'bg-cyan-700',
  sacraments:       'bg-sky-500',
  salvation:        'bg-red-600',
}

const DIFFICULTY_UP: Record<string, string> = {
  beginner: 'intermediate',
  intermediate: 'advanced',
  advanced: 'advanced',
}

function getRecommended(
  allTopics: Topic[],
  readProgress: Record<string, { isRead: boolean }>,
  recentTopics: Topic[],
): Topic[] {
  const unread = allTopics.filter((t) => !readProgress[t.id]?.isRead)
  if (unread.length === 0) return []

  const recentDiffs = recentTopics.map((t) => t.difficulty)
  const dominant =
    recentDiffs.length > 0
      ? recentDiffs.sort(
          (a, b) =>
            recentDiffs.filter((d) => d === b).length -
            recentDiffs.filter((d) => d === a).length,
        )[0]
      : 'beginner'

  const targetDiff = DIFFICULTY_UP[dominant]
  const sameLevel = unread.filter((t) => t.difficulty === targetDiff)
  const pool = sameLevel.length >= 3 ? sameLevel : unread

  return [...pool].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 3)
}

export default function HomePage() {
  const { availableTopics, loading, error, initialize } = useAppStore()
  const { getFilteredTopics } = useSearchStore()
  const { getRecentlyViewed, readProgress } = useReadingStore()
  const { favoriteIds } = useFavoritesStore()
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('')

  const topicsReadCount = Object.values(readProgress).filter((p) => p.isRead).length
  const favoritesCount = favoriteIds.length
  const totalTopics = availableTopics.length

  useEffect(() => {
    if (availableTopics.length === 0) initialize()
  }, [availableTopics.length, initialize])

  const categoryFiltered = selectedCategory
    ? availableTopics.filter((t) => t.category === selectedCategory)
    : availableTopics

  const displayTopics = getFilteredTopics(categoryFiltered)

  const recentIds = getRecentlyViewed(5)
  const recentTopics = recentIds
    .map((id) => availableTopics.find((t) => t.id === id))
    .filter((t): t is Topic => t !== undefined)

  const recommended = getRecommended(availableTopics, readProgress, recentTopics)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl">

        {/* Today's Picks — hero carousel */}
        <div className="pt-4">
          <DailyCarousel topics={availableTopics} />
        </div>

        {/* Personal stats bar */}
        {(topicsReadCount > 0 || favoritesCount > 0) && (
          <div className="mx-4 mb-5 flex gap-3">
            <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-card border border-border px-4 py-3">
              <BookOpen weight="fill" size={18} className="shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Read</p>
                <p className="text-sm font-semibold text-foreground leading-none">
                  {topicsReadCount}
                  {totalTopics > 0 && (
                    <span className="text-muted-foreground font-normal"> / {totalTopics}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-card border border-border px-4 py-3">
              <Heart weight="fill" size={18} className="shrink-0 text-rose-500" />
              <div>
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Saved</p>
                <p className="text-sm font-semibold text-foreground leading-none">{favoritesCount}</p>
              </div>
            </div>
            {totalTopics > 0 && topicsReadCount > 0 && (
              <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-card border border-border px-4 py-3">
                <div className="shrink-0 h-[18px] w-[18px] relative">
                  <svg viewBox="0 0 18 18" className="h-full w-full -rotate-90">
                    <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/40" />
                    <circle
                      cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeDasharray={`${2 * Math.PI * 7}`}
                      strokeDashoffset={`${2 * Math.PI * 7 * (1 - topicsReadCount / totalTopics)}`}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-500"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none mb-0.5">Progress</p>
                  <p className="text-sm font-semibold text-foreground leading-none">
                    {Math.round((topicsReadCount / totalTopics) * 100)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Continue Reading — compact chips */}
        {recentTopics.length > 0 && (
          <section className="px-4 pb-5">
            <h2 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock weight="bold" size={13} />
              Continue Reading
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {recentTopics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/${topic.id}`}
                  className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted active:scale-95"
                  style={{ minWidth: '148px', maxWidth: '180px' }}
                >
                  <span
                    className={`h-7 w-7 shrink-0 rounded-lg ${CHIP_COLOR[topic.category] ?? 'bg-primary'}`}
                  />
                  <span className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
                    {topic.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recommended for You */}
        {recommended.length > 0 && (
          <section className="px-4 pb-6">
            <h2 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkle weight="bold" size={13} />
              Recommended for You
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {recommended.map((topic) => (
                <div key={topic.id} className="w-64 shrink-0">
                  <TopicCard topic={topic} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category filter + topic grid */}
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

        <div className="mt-4 pb-24">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="mx-4 rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && (
            <TopicGrid
              topics={displayTopics}
              emptyMessage="No topics match your search. Try a different term or category."
            />
          )}
        </div>
      </div>
    </div>
  )
}
