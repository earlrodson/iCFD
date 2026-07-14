'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TopicList } from '@/components/handbook/TopicCard'
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Navigation bar */}
      <div className="bg-background/80 backdrop-blur-xl sticky top-0 z-10 border-b border-border/60">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center justify-between h-12">
            <h1 className="text-[17px] font-semibold">Handbook</h1>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <select
                className="text-[13px] text-foreground bg-transparent border-0 outline-none font-medium"
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

      <div className="container mx-auto px-4 max-w-2xl py-4 space-y-4">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              }`}
            >
              {cat === 'all' ? 'All' : `${getCategoryIcon(cat as Category)} ${getCategoryName(cat as Category)}`}
            </button>
          ))}
        </div>

        {/* Difficulty chips */}
        <div className="flex gap-2">
          {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(selectedDifficulty === d ? null : d)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                selectedDifficulty === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              }`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Result count */}
        <p className="section-header">{filtered.length} topic{filtered.length !== 1 ? 's' : ''}</p>

        {/* Topic list */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center shadow-sm">
            <BookOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-[15px] font-medium mb-1">No topics found</p>
            <p className="text-[13px] text-muted-foreground mb-4">Try a different category or difficulty</p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => { setSelectedCategory('all'); setSelectedDifficulty(null) }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <TopicList topics={filtered} />
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
