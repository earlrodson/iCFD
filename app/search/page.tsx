'use client'

import { useEffect } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useSearchStore } from '@/store/useSearchStore'
import { SearchBar } from '@/components/search/SearchBar'
import { TopicCard } from '@/components/topic/TopicCard'
import { cn } from '@/lib/utils'
import type { Category, Difficulty } from '@/data/schema/topic.schema'

const categories: { value: Category | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'bible', label: 'Bible' },
  { value: 'church-teaching', label: 'Church Teaching' },
  { value: 'mary', label: 'Mary' },
  { value: 'tradition', label: 'Tradition' },
  { value: 'saints', label: 'Saints' },
  { value: 'papacy', label: 'Papacy' },
  { value: 'sacraments', label: 'Sacraments' },
  { value: 'salvation', label: 'Salvation' },
]

const difficulties: { value: Difficulty | ''; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export default function SearchPage() {
  const { availableTopics, initialize } = useAppStore()
  const { query, filters, setFilter, getFilteredTopics } = useSearchStore()

  useEffect(() => {
    if (availableTopics.length === 0) initialize()
  }, [availableTopics.length, initialize])

  const results = getFilteredTopics(availableTopics)
  const hasQuery = query.trim().length > 0

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-24">
        {/* Header */}
        <div className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Search</h1>
        </div>

        {/* Prominent search bar */}
        <SearchBar
          placeholder="Search topics, scripture, catechism…"
          autoFocus
          className="mb-4"
        />

        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* Category filter */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(({ value, label }) => (
                <button
                  key={value || 'all'}
                  onClick={() => setFilter('category', value as Category | '')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    filters.category === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty filter */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Difficulty
            </p>
            <div className="flex flex-wrap gap-1.5">
              {difficulties.map(({ value, label }) => (
                <button
                  key={value || 'any'}
                  onClick={() => setFilter('difficulty', value as Difficulty | '')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    filters.difficulty === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {!hasQuery && !filters.category && !filters.difficulty && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <MagnifyingGlass weight="light" size={48} className="mb-3 opacity-30" />
            <p className="font-medium">Start typing to search</p>
            <p className="mt-1 text-sm">Search across topics, scripture, and tags</p>
          </div>
        )}

        {(hasQuery || filters.category || filters.difficulty) && (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? 'result' : 'results'}
              {hasQuery && <span> for &ldquo;{query}&rdquo;</span>}
            </p>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <p className="font-medium">No results found</p>
                <p className="mt-1 text-sm">Try different keywords or remove filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
