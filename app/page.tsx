'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SearchBar } from '@/components/search/SearchBar'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { TopicCard } from '@/components/handbook/TopicCard'
import { useAppStore, useAvailableTopics } from '@/store/useAppStore'
import { useFavoritesStore, useFavoritesCount } from '@/store/useFavoritesStore'
import { useProgressStore, useReadCount } from '@/store/useProgressStore'
import { useViewHistoryStore, useRecentViews } from '@/store/useViewHistoryStore'
import { usePathsStore } from '@/store/usePathsStore'
import { Shield, Moon, Sun, BookOpen, Heart, CheckCircle, Map, Download, Loader2, ChevronRight, Star } from 'lucide-react'
import { getCategoryName, getCategoryIcon, type Category } from '@/lib/utils/categories'
import type { Topic } from '@/data/schema/topic.schema'

const CATEGORIES = [
  'sacraments', 'mary', 'papacy', 'salvation',
  'bible', 'saints', 'tradition', 'church-teaching',
] as const

function getTodayTopic(topics: Topic[]): Topic | null {
  if (!topics.length) return null
  const dayIndex = Math.floor(Date.now() / 86400000)
  return topics[dayIndex % topics.length]
}

function getRecommended(topics: Topic[], readIds: string[], limit = 3): Topic[] {
  if (!readIds.length) return topics.filter(t => t.difficulty === 'beginner').slice(0, limit)
  const readSet = new Set(readIds)
  const readTopics = topics.filter(t => readSet.has(t.id))

  // Find most common difficulty among read topics
  const counts: Record<string, number> = {}
  for (const t of readTopics) counts[t.difficulty] = (counts[t.difficulty] ?? 0) + 1
  const [topDifficulty] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ['beginner']

  return topics
    .filter(t => !readSet.has(t.id) && t.difficulty === topDifficulty)
    .slice(0, limit)
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadDone, setDownloadDone] = useState(false)

  const { loading, error, initialize, settings, updateSettings } = useAppStore()
  const availableTopics = useAvailableTopics()
  const { loadFavorites } = useFavoritesStore()
  const { loadProgress, readTopicIds } = useProgressStore()
  const { loadPaths, paths } = usePathsStore()
  const pathsStore = usePathsStore()
  const recentViews = useRecentViews(3)
  const favCount = useFavoritesCount()
  const readCount = useReadCount()

  const isDark = settings.theme === 'dark'
  const toggleDark = () => updateSettings({ theme: isDark ? 'light' : 'dark' })

  useEffect(() => {
    initialize().then(() => {
      loadFavorites()
      loadProgress()
      loadPaths()
    }).catch(console.error)
    // Apply dark mode class
    document.documentElement.classList.toggle('dark', isDark)
  }, [initialize, loadFavorites, loadProgress, loadPaths, isDark])

  const handleOfflineDownload = useCallback(async () => {
    setDownloading(true)
    try {
      await Promise.all(
        ['en', 'tl', 'ceb'].map(lang =>
          fetch(`/data/content/${lang}/handbook.json`, { cache: 'reload' })
        )
      )
      await fetch('/data/paths.json', { cache: 'reload' })
      setDownloadDone(true)
      setTimeout(() => setDownloadDone(false), 3000)
    } catch {
      // silently fail
    } finally {
      setDownloading(false)
    }
  }, [])

  const topicMap = availableTopics.reduce<Record<string, Topic>>((acc, t) => { acc[t.id] = t; return acc }, {})
  const todayTopic = getTodayTopic(availableTopics)
  const recommended = getRecommended(availableTopics, readTopicIds)

  const recentTopics = recentViews
    .map(v => topicMap[v.topicId])
    .filter((t): t is Topic => t !== undefined)

  const filteredTopics = searchQuery
    ? availableTopics.filter(t => {
        const answerText = typeof t.answer === 'string' ? t.answer : `${t.answer.summary} ${t.answer.full}`
        const q = searchQuery.toLowerCase()
        return (
          t.title.toLowerCase().includes(q) ||
          t.question.toLowerCase().includes(q) ||
          answerText.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q))
        )
      })
    : []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-destructive font-medium">Failed to load content</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-primary leading-tight">Catholic Faith Defender</h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Defending the Faith offline</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:block">
                <SearchBar
                  placeholder="Search…"
                  className="w-48"
                  onSearch={(q) => setSearchQuery(q)}
                />
              </div>
              <LanguageSwitcher />
              <Button variant="ghost" size="icon" onClick={toggleDark} className="h-8 w-8">
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 space-y-7 max-w-5xl">

        {/* Search results overlay */}
        {searchQuery && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Results for &ldquo;{searchQuery}&rdquo;</h2>
              <span className="text-sm text-muted-foreground">{filteredTopics.length} found</span>
            </div>
            {filteredTopics.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No topics match your search.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTopics.slice(0, 9).map(t => (
                  <TopicCard key={t.id} topic={t} showCategory showDifficulty showExcerpt />
                ))}
              </div>
            )}
            {filteredTopics.length > 9 && (
              <div className="text-center mt-3">
                <Button variant="outline" asChild size="sm">
                  <Link href={`/search?q=${encodeURIComponent(searchQuery)}`}>
                    See all {filteredTopics.length} results
                  </Link>
                </Button>
              </div>
            )}
          </section>
        )}

        {!searchQuery && (
          <>
            {/* Real-time stats */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: BookOpen, label: 'Topics', value: availableTopics.length, color: 'text-primary', href: '/handbook' },
                { icon: Map, label: 'Paths', value: paths.length, color: 'text-purple-600', href: '/paths' },
                { icon: Heart, label: 'Saved', value: favCount, color: 'text-rose-500', href: '/favorites' },
                { icon: CheckCircle, label: 'Read', value: readCount, color: 'text-green-600', href: null },
              ].map(({ icon: Icon, label, value, color, href }) => {
                const content = (
                  <Card className={`${href ? 'hover:bg-accent/40 cursor-pointer transition-colors' : ''}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Icon className={`h-6 w-6 ${color} shrink-0`} />
                      <div>
                        <div className="text-xl font-bold leading-none">{value}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                      </div>
                    </CardContent>
                  </Card>
                )
                return href
                  ? <Link key={label} href={href}>{content}</Link>
                  : <div key={label}>{content}</div>
              })}
            </section>

            {/* Continue Reading */}
            {recentTopics.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3">Continue Reading</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {recentTopics.map(t => (
                    <TopicCard key={t.id} topic={t} showCategory showDifficulty />
                  ))}
                </div>
              </section>
            )}

            {/* Today's Topic */}
            {todayTopic && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-amber-500" />
                  <h2 className="font-semibold">Today&rsquo;s Topic</h2>
                </div>
                <Link
                  href={`/${encodeURIComponent(todayTopic.id)}`}
                  className="block border rounded-xl p-4 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryIcon(todayTopic.category as Category)} {getCategoryName(todayTopic.category)}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">{todayTopic.difficulty}</Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{todayTopic.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{todayTopic.question}</p>
                </Link>
              </section>
            )}

            {/* Recommended */}
            {recommended.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3">Recommended for You</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {recommended.map(t => (
                    <TopicCard key={t.id} topic={t} showCategory showDifficulty showExcerpt />
                  ))}
                </div>
              </section>
            )}

            {/* Learning Paths */}
            {paths.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold">Learning Paths</h2>
                  <Link href="/paths" className="text-xs text-primary hover:underline flex items-center gap-1">
                    View all <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {paths.map(path => {
                    const { completed, total, percent } = pathsStore.getPathProgress(path.slug, readTopicIds)
                    return (
                      <Link
                        key={path.slug}
                        href={`/paths/${path.slug}`}
                        className="block border rounded-xl p-4 hover:bg-accent/40 transition-colors"
                      >
                        <div className="text-2xl mb-2">{path.icon}</div>
                        <p className="font-medium text-sm mb-1">{path.title}</p>
                        <p className="text-xs text-muted-foreground mb-2">{total} topics</p>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{completed}/{total}</p>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Browse by category — compact scrollable strip */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Browse by Category</h2>
                <Link href="/handbook" className="text-xs text-primary hover:underline flex items-center gap-1">
                  All topics <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map(cat => {
                  const count = availableTopics.filter(t => t.category === cat).length
                  return (
                    <Link
                      key={cat}
                      href={`/handbook?category=${cat}`}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 border rounded-xl text-center hover:bg-accent/40 transition-colors min-w-[80px]"
                    >
                      <span className="text-xl">{getCategoryIcon(cat as Category)}</span>
                      <span className="text-xs font-medium leading-tight">{getCategoryName(cat)}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
                    </Link>
                  )
                })}
              </div>
            </section>

            {/* Offline download */}
            <section className="border rounded-xl p-4 bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Download for Offline</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cache all content so the app works without internet
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOfflineDownload}
                  disabled={downloading || downloadDone}
                >
                  {downloading ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Caching…</>
                  ) : downloadDone ? (
                    <><CheckCircle className="h-4 w-4 mr-1 text-green-600" />Cached!</>
                  ) : (
                    <><Download className="h-4 w-4 mr-1" />Download</>
                  )}
                </Button>
              </div>
            </section>

            {/* Font size setting */}
            <section className="border rounded-xl p-4">
              <p className="font-medium text-sm mb-3">Text Size</p>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ fontSize: size })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      settings.fontSize === size
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {size === 'small' ? 'A' : size === 'medium' ? 'A' : 'A'}
                    <span className="text-xs ml-1">({size})</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
