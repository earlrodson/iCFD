'use client'

import { useEffect, useState } from 'react'
import { Heart, SortAscending } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { TopicCard } from '@/components/topic/TopicCard'
import type { Topic } from '@/data/schema/topic.schema'

type SortOption = 'title' | 'category' | 'difficulty'

function sortTopics(topics: Topic[], sort: SortOption): Topic[] {
  return [...topics].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    if (sort === 'category') return a.category.localeCompare(b.category)
    const order = { beginner: 0, intermediate: 1, advanced: 2 }
    return order[a.difficulty] - order[b.difficulty]
  })
}

export default function FavoritesPage() {
  const { availableTopics, initialize } = useAppStore()
  const { favoriteIds } = useFavoritesStore()
  const [sort, setSort] = useState<SortOption>('title')

  useEffect(() => {
    if (availableTopics.length === 0) initialize()
  }, [availableTopics.length, initialize])

  const favorites = availableTopics.filter((t) => favoriteIds.includes(t.id))
  const sorted = sortTopics(favorites, sort)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between pt-6 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Favorites</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {favorites.length} saved {favorites.length === 1 ? 'topic' : 'topics'}
            </p>
          </div>

          {favorites.length > 0 && (
            <div className="flex items-center gap-1.5">
              <SortAscending weight="light" size={14} className="text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="rounded-lg bg-card border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="title">Title A–Z</option>
                <option value="category">Category</option>
                <option value="difficulty">Difficulty</option>
              </select>
            </div>
          )}
        </div>

        {/* Empty state */}
        {favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Heart weight="light" size={32} className="text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">No favorites yet</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Tap the heart icon on any topic card to save it here for quick access.
            </p>
          </div>
        )}

        {/* Topic grid */}
        {sorted.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sorted.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
