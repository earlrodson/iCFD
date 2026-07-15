'use client'

import { useEffect, useState } from 'react'
import {
  BookOpen,
  Buildings,
  Flower,
  Scroll,
  Star,
  Crown,
  Drop,
  Heart,
  SortAscending,
} from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { TopicCard } from '@/components/topic/TopicCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Category, Difficulty, Topic } from '@/data/schema/topic.schema'

const categoryItems: { value: Category | 'all'; label: string; Icon: React.ElementType }[] = [
  { value: 'all', label: 'All Topics', Icon: BookOpen },
  { value: 'bible', label: 'Bible', Icon: BookOpen },
  { value: 'church-teaching', label: 'Church Teaching', Icon: Buildings },
  { value: 'mary', label: 'Mary', Icon: Flower },
  { value: 'tradition', label: 'Tradition', Icon: Scroll },
  { value: 'saints', label: 'Saints', Icon: Star },
  { value: 'papacy', label: 'Papacy', Icon: Crown },
  { value: 'sacraments', label: 'Sacraments', Icon: Drop },
  { value: 'salvation', label: 'Salvation', Icon: Heart },
]

const difficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced']

type SortOption = 'title' | 'difficulty' | 'recent'

function sortTopics(topics: Topic[], sort: SortOption): Topic[] {
  return [...topics].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    if (sort === 'recent') return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    if (sort === 'difficulty') {
      const order: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 }
      return order[a.difficulty] - order[b.difficulty]
    }
    return 0
  })
}

export default function HandbookPage() {
  const { availableTopics, loading, error, initialize } = useAppStore()
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | ''>('')
  const [sort, setSort] = useState<SortOption>('title')

  useEffect(() => {
    if (availableTopics.length === 0) initialize()
  }, [availableTopics.length, initialize])

  let filtered = selectedCategory === 'all'
    ? availableTopics
    : availableTopics.filter((t) => t.category === selectedCategory)

  if (selectedDifficulty) {
    filtered = filtered.filter((t) => t.difficulty === selectedDifficulty)
  }

  filtered = sortTopics(filtered, sort)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Handbook</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse all {availableTopics.length} apologetics topics
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-0">
          {/* Sidebar — desktop */}
          <aside className="hidden md:block w-52 shrink-0 px-4 pb-24">
            <nav className="space-y-1 sticky top-20">
              {categoryItems.map(({ value, label, Icon }) => {
                const active = selectedCategory === value
                const count =
                  value === 'all'
                    ? availableTopics.length
                    : availableTopics.filter((t) => t.category === value).length
                return (
                  <button
                    key={value}
                    onClick={() => setSelectedCategory(value)}
                    className={cn(
                      'w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-left transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon weight={active ? 'fill' : 'light'} size={16} />
                    <span className="flex-1">{label}</span>
                    <span className={cn('text-xs', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Mobile category tabs */}
          <div className="md:hidden px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categoryItems.map(({ value, label, Icon }) => {
                const active = selectedCategory === value
                return (
                  <button
                    key={value}
                    onClick={() => setSelectedCategory(value)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-muted-foreground',
                    )}
                  >
                    <Icon weight={active ? 'fill' : 'light'} size={14} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 px-4 pb-24 min-w-0">
            {/* Filters row */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              {/* Difficulty pills */}
              <div className="flex gap-1.5">
                {difficulties.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDifficulty(selectedDifficulty === d ? '' : d)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      selectedDifficulty === d
                        ? 'bg-foreground text-background'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Sort */}
              <div className="flex items-center gap-1.5">
                <SortAscending weight="light" size={14} className="text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="rounded-lg bg-card border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="title">Title A–Z</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="recent">Most Recent</option>
                </select>
              </div>
            </div>

            {/* Count */}
            {!loading && (
              <p className="mb-3 text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? 'topic' : 'topics'}
              </p>
            )}

            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground">No topics found for the selected filters.</p>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filtered.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
