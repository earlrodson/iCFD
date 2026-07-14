'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useSearchStore } from '@/store/useSearchStore'
import { HeroSection } from '@/components/home/HeroSection'
import { CategoryFilter } from '@/components/home/CategoryFilter'
import { TopicGrid } from '@/components/home/TopicGrid'
import { SearchBar } from '@/components/search/SearchBar'
import type { Category } from '@/data/schema/topic.schema'

export default function HomePage() {
  const { availableTopics, loading, error, initialize } = useAppStore()
  const { getFilteredTopics } = useSearchStore()
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <HeroSection topics={availableTopics} />

        {/* Search */}
        <div className="px-4 pb-4">
          <SearchBar placeholder="Search topics, scripture, tags…" />
        </div>

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
