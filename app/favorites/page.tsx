'use client'

import { useEffect, useState } from 'react'
import { Heart, SortAscending, Rows, GridFour, Export, Upload } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { TopicCard } from '@/components/topic/TopicCard'
import type { Topic, Category } from '@/data/schema/topic.schema'
import { cn } from '@/lib/utils'

type SortOption = 'title' | 'category' | 'difficulty' | 'added'

const CATEGORY_LABELS: Record<Category, string> = {
  bible: 'Bible',
  'church-teaching': 'Church Teaching',
  mary: 'Mary',
  tradition: 'Tradition',
  saints: 'Saints',
  papacy: 'Papacy',
  sacraments: 'Sacraments',
  salvation: 'Salvation',
}

function sortTopics(
  topics: Topic[],
  sort: SortOption,
  addedAt: Record<string, string>,
): Topic[] {
  return [...topics].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    if (sort === 'category') return a.category.localeCompare(b.category)
    if (sort === 'added') {
      const ta = addedAt[a.id] ?? ''
      const tb = addedAt[b.id] ?? ''
      return tb.localeCompare(ta) // newest first
    }
    const order = { beginner: 0, intermediate: 1, advanced: 2 }
    return order[a.difficulty] - order[b.difficulty]
  })
}

function groupByCategory(topics: Topic[]): [Category, Topic[]][] {
  const map = new Map<Category, Topic[]>()
  for (const t of topics) {
    const group = map.get(t.category) ?? []
    group.push(t)
    map.set(t.category, group)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

export default function FavoritesPage() {
  const { availableTopics, initialize } = useAppStore()
  const { favoriteIds, addedAt, exportFavorites, toggleFavorite } = useFavoritesStore()
  const [sort, setSort] = useState<SortOption>('added')
  const [grouped, setGrouped] = useState(false)

  useEffect(() => {
    if (availableTopics.length === 0) initialize()
  }, [availableTopics.length, initialize])

  const favorites = availableTopics.filter((t) => favoriteIds.includes(t.id))
  const sorted = sortTopics(favorites, sort, addedAt)
  const groups = groupByCategory(sorted)

  function handleExport() {
    const json = exportFavorites()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'icfd-favorites.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        const entries: { id: string }[] = Array.isArray(parsed) ? parsed : []
        let count = 0
        for (const { id } of entries) {
          if (typeof id === 'string' && !favoriteIds.includes(id)) {
            toggleFavorite(id)
            count++
          }
        }
        if (count === 0) alert('No new favorites found in file.')
        else alert(`Imported ${count} favorite${count === 1 ? '' : 's'}.`)
      } catch {
        alert('Invalid file format. Expected a JSON array of favorites.')
      }
    }
    reader.readAsText(file)
    e.target.value = '' // reset so same file can be re-imported
  }

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
            <div className="flex items-center gap-2">
              {/* Import */}
              <label
                className="cursor-pointer p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Import favorites from JSON"
                title="Import favorites"
              >
                <Upload weight="light" size={18} />
                <input type="file" accept=".json" className="sr-only" onChange={handleImport} />
              </label>

              {/* Export */}
              <button
                onClick={handleExport}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Export favorites as JSON"
                title="Export favorites"
              >
                <Export weight="light" size={18} />
              </button>

              {/* Group toggle */}
              <button
                onClick={() => setGrouped((g) => !g)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  grouped
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={grouped ? 'Show as flat list' : 'Group by category'}
                title={grouped ? 'Ungroup' : 'Group by category'}
              >
                {grouped ? (
                  <GridFour weight="fill" size={18} />
                ) : (
                  <Rows weight="light" size={18} />
                )}
              </button>

              {/* Sort select */}
              {!grouped && (
                <div className="flex items-center gap-1.5">
                  <SortAscending weight="light" size={14} className="text-muted-foreground" />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="rounded-lg bg-card border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="added">Date Added</option>
                    <option value="title">Title A–Z</option>
                    <option value="category">Category</option>
                    <option value="difficulty">Difficulty</option>
                  </select>
                </div>
              )}
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

        {/* Grouped view */}
        {grouped && groups.length > 0 && (
          <div className="space-y-8">
            {groups.map(([category, topics]) => (
              <div key={category}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABELS[category]}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {topics.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flat view */}
        {!grouped && sorted.length > 0 && (
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
