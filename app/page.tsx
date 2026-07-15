'use client'

import { useEffect, useState } from 'react'
import { Clock } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useSearchStore } from '@/store/useSearchStore'
import { useReadingStore } from '@/store/useReadingStore'
import { HeroSection } from '@/components/home/HeroSection'
import { CategoryFilter } from '@/components/home/CategoryFilter'
import { TopicGrid } from '@/components/home/TopicGrid'
import { TopicCard } from '@/components/topic/TopicCard'
import { DailyCarousel } from '@/components/home/DailyCarousel'
import { SearchBar } from '@/components/search/SearchBar'
import type { Category, Topic } from '@/data/schema/topic.schema'

export default function HomePage() {
  const { availableTopics, loading, error, initialize } = useAppStore()
  const { getFilteredTopics } = useSearchStore()
  const { getRecentlyViewed, readProgress } = useReadingStore()
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('')

  useEffect(() => {
    if (availableTopics.length === 0) {
      initialize()
    }
  }, [availableTopics.length, initialize])

  const categoryFiltered = selectedCategory
    ? availableTopics.filter((t) => t.category === selectedCategory)
    : availableTopics

  const displayTopics = getFilteredTopics(categoryFiltered)

  const readCount = Object.values(readProgress).filter((p) => p.isRead).length
  const recentIds = getRecentlyViewed(3)
  const recentTopics = recentIds
    .map((id) => availableTopics.find((t) => t.id === id))
    .filter((t): t is Topic => t !== undefined)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <HeroSection topics={availableTopics} readCount={readCount} />

        {/* Search */}
        <div className="px-4 pb-4">
          <SearchBar placeholder="Search topics, scripture, tags…" />
        </div>

        {/* Continue Reading */}
        {recentTopics.length > 0 && (
          <section className="px-4 pb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock weight="light" size={15} />
              Continue Reading
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {recentTopics.map((topic) => (
                <div key={topic.id} className="w-64 shrink-0">
                  <TopicCard topic={topic} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Daily Featured Topics Carousel */}
        <DailyCarousel topics={availableTopics} />

        {/* Category filter */}
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

        {/* Results */}
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
