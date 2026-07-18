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
  { value: 'church-teaching', label: 'Teaching' },
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
  { value: 'intermediate', label: 'Inter.' },
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
  const hasFilter = !!(filters.category || filters.difficulty)

  return (
    <div className="flex flex-col bg-background" style={{ minHeight: '100dvh' }}>

      {/* ── Scrollable results area ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-44">
        <h1 className="text-2xl font-bold text-foreground mb-4">Search</h1>

        {/* Empty state */}
        {!hasQuery && !hasFilter && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <MagnifyingGlass weight="light" size={48} className="mb-3 opacity-30" />
            <p className="font-medium">Start typing to search</p>
            <p className="mt-1 text-sm">Search across topics, scripture, and tags</p>
          </div>
        )}

        {/* Results */}
        {(hasQuery || hasFilter) && (
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

      {/* ── Fixed bottom: filters + search bar ───────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+4.25rem)] md:pb-3">
        {/* Compact filter chips — single scrollable row */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mb-2">
          {categories.map(({ value, label }) => (
            <button
              key={value || 'all'}
              onClick={() => setFilter('category', value as Category | '')}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                filters.category === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
          <span className="shrink-0 text-border text-xs mx-0.5 select-none">·</span>
          {difficulties.map(({ value, label }) => (
            <button
              key={value || 'any'}
              onClick={() => setFilter('difficulty', value as Difficulty | '')}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                filters.difficulty === value
                  ? 'bg-primary/80 text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <SearchBar
          placeholder="Search topics, scripture, catechism…"
          autoFocus
        />
      </div>
    </div>
  )
}
