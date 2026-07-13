'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppStore, useAvailableTopics } from '@/store/useAppStore'
import { useFavoritesStore, useFavoriteActions } from '@/store/useFavoritesStore'
import { db } from '@/lib/db/indexeddb'
import { getCategoryColor, getCategoryIcon, getCategoryName, type Category } from '@/lib/utils/categories'
import { Heart, BookOpen, Download, Upload, Trash2, ArrowUpDown, LayoutList } from 'lucide-react'
import type { Topic } from '@/data/schema/topic.schema'

type SortOption = 'date-added' | 'alphabetical' | 'category' | 'difficulty'
type Difficulty = 'beginner' | 'intermediate' | 'advanced'

const difficultyOrder: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 }

const SORT_LABELS: Record<SortOption, string> = {
  'date-added': 'Date added',
  'alphabetical': 'A → Z',
  'category': 'Category',
  'difficulty': 'Difficulty',
}

export default function FavoritesPage() {
  const { initialize } = useAppStore()
  const availableTopics = useAvailableTopics()
  const { favoriteIds, loading, loadFavorites, exportFavorites, importFavorites } = useFavoritesStore()
  const { removeFromFavorites } = useFavoriteActions()
  const importRef = useRef<HTMLInputElement>(null)

  const [timestamps, setTimestamps] = useState<Record<string, number>>({})
  const [sort, setSort] = useState<SortOption>('date-added')
  const [groupByCategory, setGroupByCategory] = useState(false)

  useEffect(() => {
    initialize().then(async () => {
      await loadFavorites()
      const favRecords = await db.favorites.getAll()
      const ts: Record<string, number> = {}
      for (const r of favRecords) ts[r.topicId] = r.addedAt
      setTimestamps(ts)
    }).catch(console.error)
  }, [initialize, loadFavorites])

  // Refresh timestamps when favoriteIds change
  useEffect(() => {
    db.favorites.getAll().then(records => {
      const ts: Record<string, number> = {}
      for (const r of records) ts[r.topicId] = r.addedAt
      setTimestamps(ts)
    }).catch(() => {})
  }, [favoriteIds])

  const favoriteTopics = useMemo(() => {
    const topicMap = new Map(availableTopics.map(t => [t.id, t]))
    return favoriteIds
      .map(id => topicMap.get(id))
      .filter((t): t is Topic => t !== undefined)
  }, [availableTopics, favoriteIds])

  const sorted = useMemo(() => {
    return [...favoriteTopics].sort((a, b) => {
      switch (sort) {
        case 'date-added':
          return (timestamps[b.id] ?? 0) - (timestamps[a.id] ?? 0)
        case 'alphabetical':
          return a.title.localeCompare(b.title)
        case 'category':
          return a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
        case 'difficulty':
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
        default:
          return 0
      }
    })
  }, [favoriteTopics, sort, timestamps])

  const grouped = useMemo(() => {
    if (!groupByCategory) return null
    const map = new Map<string, Topic[]>()
    for (const topic of sorted) {
      const cat = topic.category
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(topic)
    }
    return map
  }, [sorted, groupByCategory])

  const handleExport = async () => {
    try {
      const json = await exportFavorites()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'iCFD-favorites.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // export failed silently
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      await importFavorites(text)
      await loadFavorites()
    } catch {
      // import failed silently
    }
    e.target.value = ''
  }

  const handleRemove = async (topicId: string) => {
    await removeFromFavorites(topicId)
  }

  const TopicRow = ({ topic }: { topic: Topic }) => (
    <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/30 transition-colors group">
      <Link href={`/${encodeURIComponent(topic.id)}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge className={`${getCategoryColor(topic.category)} text-xs`}>
            {getCategoryIcon(topic.category as Category)} {getCategoryName(topic.category as Category)}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">{topic.difficulty}</span>
          {timestamps[topic.id] && (
            <span className="text-xs text-muted-foreground">
              · {new Date(timestamps[topic.id]).toLocaleDateString()}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-sm mb-0.5 truncate">{topic.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{topic.question}</p>
      </Link>
      <button
        onClick={() => handleRemove(topic.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded shrink-0"
        title="Remove from favorites"
        aria-label={`Remove ${topic.title} from favorites`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Favorites</h1>
              <Badge variant="secondary">{favoriteIds.length}</Badge>
            </div>
            {favoriteIds.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport} title="Export favorites">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} title="Import favorites">
                  <Upload className="h-4 w-4" />
                </Button>
                <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <span>Favorites</span>
        </nav>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No favorites yet</p>
            <p className="text-sm mb-6">Save topics you want to revisit quickly</p>
            <Button asChild>
              <Link href="/handbook">
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Handbook
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Sort + group controls */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                {sorted.length} saved topic{sorted.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGroupByCategory(v => !v)}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    groupByCategory
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <LayoutList className="h-3 w-3" />
                  Group by category
                </button>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowUpDown className="h-3 w-3" />
                  <select
                    className="text-xs border rounded px-2 py-1 bg-background"
                    value={sort}
                    onChange={e => setSort(e.target.value as SortOption)}
                  >
                    {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Topic list */}
            {grouped ? (
              <div className="space-y-6">
                {Array.from(grouped.entries()).map(([category, catTopics]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="font-semibold text-sm">
                        {getCategoryIcon(category as Category)} {getCategoryName(category as Category)}
                      </h2>
                      <Badge variant="secondary" className="text-xs">{catTopics.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {catTopics.map(topic => <TopicRow key={topic.id} topic={topic} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {sorted.map(topic => <TopicRow key={topic.id} topic={topic} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
