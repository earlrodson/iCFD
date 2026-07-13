'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TopicCard } from '@/components/handbook/TopicCard'
import { useAppStore, useAvailableTopics } from '@/store/useAppStore'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useSearchStore } from '@/store/useSearchStore'
import { Search, X, Clock, SlidersHorizontal } from 'lucide-react'
import type { Topic } from '@/data/schema/topic.schema'

const categories = ['sacraments', 'mary', 'papacy', 'salvation', 'bible', 'saints', 'tradition', 'church-teaching'] as const
type Difficulty = 'beginner' | 'intermediate' | 'advanced'

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const { initialize } = useAppStore()
  const { loadFavorites } = useFavoritesStore()
  const availableTopics = useAvailableTopics()
  const { searchHistory, clearHistory, removeFromHistory, performSearch, results } = useSearchStore()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    initialize().then(() => loadFavorites()).catch(console.error)
    // Auto-focus search input
    inputRef.current?.focus()
  }, [initialize, loadFavorites])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        const filters = {
          category: selectedCategories.length === 1 ? selectedCategories[0] as Topic['category'] : undefined,
          difficulty: selectedDifficulties.length === 1 ? selectedDifficulties[0] : undefined,
        }
        performSearch(query, availableTopics, filters)
        const params = new URLSearchParams()
        params.set('q', query)
        if (selectedCategories.length) params.set('category', selectedCategories.join(','))
        if (selectedDifficulties.length) params.set('difficulty', selectedDifficulties.join(','))
        router.replace(`/search?${params.toString()}`, { scroll: false })
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query, selectedCategories, selectedDifficulties, availableTopics, performSearch, router])

  const toggleCategory = (cat: string) =>
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])

  const toggleDifficulty = (d: Difficulty) =>
    setSelectedDifficulties(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const clearAll = () => {
    setQuery('')
    setSelectedCategories([])
    setSelectedDifficulties([])
    router.replace('/search', { scroll: false })
    inputRef.current?.focus()
  }

  const hasFilters = selectedCategories.length > 0 || selectedDifficulties.length > 0

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky search header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search topics, scripture, tags…"
                className="pl-9 pr-9"
              />
              {query && (
                <button
                  onClick={clearAll}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(s => !s)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {hasFilters && <span className="ml-1 text-xs">{selectedCategories.length + selectedDifficulties.length}</span>}
            </Button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedCategories.includes(cat)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {cat.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Difficulty</p>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => toggleDifficulty(d)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedDifficulties.includes(d)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => { setSelectedCategories([]); setSelectedDifficulties([]) }}>
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* No query — show history */}
        {!query.trim() ? (
          <div>
            {searchHistory.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Recent searches
                  </p>
                  <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map(q => (
                    <button
                      key={q}
                      onClick={() => setQuery(q)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-muted/80 group"
                    >
                      {q}
                      <X
                        className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => { e.stopPropagation(); removeFromHistory(q) }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Search apologetics topics</p>
                <p className="text-sm mt-1">Try &ldquo;baptism&rdquo;, &ldquo;Mary&rdquo;, or &ldquo;papal authority&rdquo;</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {results.length} result{results.length !== 1 ? 's' : ''} for <strong>&ldquo;{query}&rdquo;</strong>
            </p>
            {results.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No results found</p>
                <p className="text-sm mt-1">Try different keywords or broaden your filters</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map(topic => (
                  <TopicCard key={topic.id} topic={topic} showCategory showDifficulty showExcerpt />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>}>
      <SearchContent />
    </Suspense>
  )
}
