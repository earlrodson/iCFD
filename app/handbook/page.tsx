'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TopicCard } from '@/components/handbook/TopicCard'
import { useAppStore, useAvailableTopics, useCurrentLanguage } from '@/store/useAppStore'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { getCategoryName, getCategoryIcon, type Category } from '@/lib/utils/categories'
import { BookOpen, SlidersHorizontal } from 'lucide-react'
import type { Topic } from '@/data/schema/topic.schema'

const categories = [
  'all',
  'sacraments',
  'mary',
  'papacy',
  'salvation',
  'bible',
  'saints',
  'tradition',
  'church-teaching',
] as const

type SortOption = 'alphabetical' | 'newest' | 'difficulty-asc' | 'difficulty-desc'
type Difficulty = 'beginner' | 'intermediate' | 'advanced'

const difficultyOrder: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 }

function HandbookContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { initialize } = useAppStore()
  const { loadFavorites } = useFavoritesStore()
  const availableTopics = useAvailableTopics()
  const language = useCurrentLanguage()

  const [sort, setSort] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) ?? 'alphabetical'
  )
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') ?? 'all'
  )
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(
    (searchParams.get('difficulty') as Difficulty) ?? null
  )

  useEffect(() => {
    initialize().then(() => loadFavorites()).catch(console.error)
  }, [initialize, loadFavorites])

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedCategory !== 'all') params.set('category', selectedCategory)
    if (sort !== 'alphabetical') params.set('sort', sort)
    if (selectedDifficulty) params.set('difficulty', selectedDifficulty)
    router.replace(`/handbook?${params.toString()}`, { scroll: false })
  }, [selectedCategory, sort, selectedDifficulty, router])

  const filtered = availableTopics
    .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
    .filter(t => !selectedDifficulty || t.difficulty === selectedDifficulty)
    .sort((a, b) => {
      switch (sort) {
        case 'alphabetical': return a.title.localeCompare(b.title)
        case 'newest': return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        case 'difficulty-asc': return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
        case 'difficulty-desc': return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty]
        default: return 0
      }
    })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Handbook</h1>
              <Badge variant="secondary">{filtered.length} topics</Badge>
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <select
                className="text-sm border rounded px-2 py-1 bg-background"
                value={sort}
                onChange={e => setSort(e.target.value as SortOption)}
              >
                <option value="alphabetical">A → Z</option>
                <option value="newest">Newest</option>
                <option value="difficulty-asc">Easiest first</option>
                <option value="difficulty-desc">Hardest first</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <span>Handbook</span>
          {selectedCategory !== 'all' && (
            <>
              <span className="mx-2">/</span>
              <span className="capitalize">{getCategoryName(selectedCategory as Category)}</span>
            </>
          )}
        </nav>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat === 'all' ? 'All' : `${getCategoryIcon(cat as Category)} ${getCategoryName(cat as Category)}`}
            </button>
          ))}
        </div>

        {/* Difficulty filter chips */}
        <div className="flex gap-2 mb-6">
          {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(selectedDifficulty === d ? null : d)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedDifficulty === d
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
              }`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Topic grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No topics found</p>
            <p className="text-sm mb-4">Try a different category or difficulty level</p>
            <Button variant="outline" onClick={() => {
              setSelectedCategory('all')
              setSelectedDifficulty(null)
            }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(topic => (
              <TopicCard key={topic.id} topic={topic} showCategory showDifficulty showExcerpt />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HandbookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>}>
      <HandbookContent />
    </Suspense>
  )
}
