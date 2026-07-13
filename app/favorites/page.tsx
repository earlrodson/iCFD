'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TopicCard } from '@/components/handbook/TopicCard'
import { useAppStore, useAvailableTopics } from '@/store/useAppStore'
import { useFavoritesStore, useFavoriteActions } from '@/store/useFavoritesStore'
import { Heart, BookOpen, Download, Upload } from 'lucide-react'

export default function FavoritesPage() {
  const { initialize } = useAppStore()
  const availableTopics = useAvailableTopics()
  const { favoriteIds, loading, loadFavorites, getFavoriteTopics, exportFavorites, importFavorites } = useFavoritesStore()
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initialize().then(() => loadFavorites()).catch(console.error)
  }, [initialize, loadFavorites])

  const favoriteTopics = getFavoriteTopics(availableTopics)

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

  return (
    <div className="min-h-screen bg-background">
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
        ) : favoriteTopics.length === 0 ? (
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
            <p className="text-sm text-muted-foreground mb-4">
              {favoriteTopics.length} saved topic{favoriteTopics.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteTopics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  showCategory
                  showDifficulty
                  showExcerpt
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
