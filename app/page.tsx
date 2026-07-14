'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/search/SearchBar'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { TopicCard, TopicList } from '@/components/handbook/TopicCard'
import { useAppStore, useAvailableTopics } from '@/store/useAppStore'
import { useFavoritesStore, useFavoritesCount } from '@/store/useFavoritesStore'
import { useProgressStore, useReadCount } from '@/store/useProgressStore'
import { useViewHistoryStore, useRecentViews } from '@/store/useViewHistoryStore'
import { usePathsStore } from '@/store/usePathsStore'
import { Shield, Moon, Sun, BookOpen, Heart, CheckCircle, Map, Download, Loader2, ChevronRight } from 'lucide-react'
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

function getRecommended(topics: Topic[], readIds: string[], limit = 4): Topic[] {
  if (!readIds.length) return topics.filter(t => t.difficulty === 'beginner').slice(0, limit)
  const readSet = new Set(readIds)
  const readTopics = topics.filter(t => readSet.has(t.id))
  const counts: Record<string, number> = {}
  for (const t of readTopics) counts[t.difficulty] = (counts[t.difficulty] ?? 0) + 1
  const [topDifficulty] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ['beginner']
  return topics.filter(t => !readSet.has(t.id) && t.difficulty === topDifficulty).slice(0, limit)
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
  const recentViews = useRecentViews(4)
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
    } catch { /* silently fail */ }
    finally { setDownloading(false) }
  }, [])

  const topicMap = availableTopics.reduce<Record<string, Topic>>((acc, t) => { acc[t.id] = t; return acc }, {})
  const todayTopic = getTodayTopic(availableTopics)
  const recommended = getRecommended(availableTopics, readTopicIds)
  const recentTopics = recentViews.map(v => topicMap[v.topicId]).filter((t): t is Topic => t !== undefined)

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
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="rounded-2xl bg-card p-6 text-center max-w-sm w-full shadow-sm space-y-3">
          <p className="text-destructive font-semibold">Failed to load content</p>
          <p className="text-[14px] text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="w-full rounded-xl">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Navigation bar */}
      <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-30 border-b border-border/60">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center gap-3 h-12">
            <Shield className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-[17px] font-semibold flex-1 text-foreground">iCFD</h1>
            <div className="flex items-center gap-1 shrink-0">
              <LanguageSwitcher />
              <button
                onClick={toggleDark}
                className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-2xl py-4 space-y-6">

        {/* Search */}
        <SearchBar
          placeholder="Search topics…"
          onSearch={setSearchQuery}
          className="w-full"
        />

        {/* Search results */}
        {searchQuery && (
          <section>
            <p className="section-header">{filteredTopics.length} result{filteredTopics.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;</p>
            {filteredTopics.length === 0 ? (
              <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
                <p className="text-[15px] text-muted-foreground">No topics match your search.</p>
              </div>
            ) : (
              <>
                <TopicList topics={filteredTopics.slice(0, 8)} />
                {filteredTopics.length > 8 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(searchQuery)}`}
                    className="flex items-center justify-center gap-1 mt-2 text-[14px] text-primary font-medium py-2"
                  >
                    See all {filteredTopics.length} results <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </>
            )}
          </section>
        )}

        {!searchQuery && (
          <>
            {/* Stats row */}
            <section className="grid grid-cols-4 gap-2">
              {[
                { label: 'Topics', value: availableTopics.length, icon: BookOpen, href: '/handbook' },
                { label: 'Paths', value: paths.length, icon: Map, href: '/paths' },
                { label: 'Saved', value: favCount, icon: Heart, href: '/favorites' },
                { label: 'Read', value: readCount, icon: CheckCircle, href: null },
              ].map(({ label, value, icon: Icon, href }) => {
                const inner = (
                  <div className="rounded-2xl bg-card shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] p-3 flex flex-col items-center gap-1 active:bg-muted transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-[20px] font-bold leading-none">{value}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                  </div>
                )
                return href
                  ? <Link key={label} href={href}>{inner}</Link>
                  : <div key={label}>{inner}</div>
              })}
            </section>

            {/* Today's topic — featured */}
            {todayTopic && (
              <section>
                <p className="section-header">Today&rsquo;s Topic</p>
                <TopicCard topic={todayTopic} />
              </section>
            )}

            {/* Continue reading */}
            {recentTopics.length > 0 && (
              <section>
                <p className="section-header">Continue Reading</p>
                <TopicList topics={recentTopics} />
              </section>
            )}

            {/* Recommended */}
            {recommended.length > 0 && (
              <section>
                <p className="section-header">Recommended</p>
                <TopicList topics={recommended} />
              </section>
            )}

            {/* Learning Paths */}
            {paths.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <p className="section-header mb-0">Learning Paths</p>
                  <Link href="/paths" className="text-[13px] text-primary font-medium">See all</Link>
                </div>
                <div className="rounded-2xl bg-card overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] divide-y divide-border">
                  {paths.map(path => {
                    const { completed, total, percent } = pathsStore.getPathProgress(path.slug, readTopicIds)
                    return (
                      <Link
                        key={path.slug}
                        href={`/paths/${path.slug}`}
                        className="flex items-center gap-3 px-4 py-3 active:bg-muted transition-colors"
                      >
                        <span className="text-2xl shrink-0">{path.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-foreground">{path.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground shrink-0">{completed}/{total}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Browse by category */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="section-header mb-0">Browse</p>
                <Link href="/handbook" className="text-[13px] text-primary font-medium">All topics</Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {CATEGORIES.map(cat => (
                  <Link
                    key={cat}
                    href={`/handbook?category=${cat}`}
                    className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl bg-card shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] min-w-[68px] text-center active:bg-muted transition-colors"
                  >
                    <span className="text-[22px] leading-none">{getCategoryIcon(cat as Category)}</span>
                    <span className="text-[10px] font-medium text-foreground leading-tight">{getCategoryName(cat)}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Settings row */}
            <section className="rounded-2xl bg-card overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] divide-y divide-border">
              {/* Offline download */}
              <div className="flex items-center justify-between px-4 py-3 gap-4">
                <div>
                  <p className="text-[15px] font-medium text-foreground">Offline Content</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Cache all content for offline use</p>
                </div>
                <button
                  onClick={handleOfflineDownload}
                  disabled={downloading || downloadDone}
                  className="flex items-center gap-1.5 text-[14px] text-primary font-medium disabled:opacity-50"
                >
                  {downloading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Caching</>
                  ) : downloadDone ? (
                    <><CheckCircle className="h-4 w-4 text-green-500" />Done</>
                  ) : (
                    <><Download className="h-4 w-4" />Download</>
                  )}
                </button>
              </div>

              {/* Text size */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[15px] font-medium text-foreground">Text Size</p>
                  <p className="text-[13px] text-muted-foreground capitalize">{settings.fontSize}</p>
                </div>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((size, i) => (
                    <button
                      key={size}
                      onClick={() => updateSettings({ fontSize: size })}
                      className={`flex-1 py-2 rounded-xl text-[${['14px', '16px', '18px'][i]}] font-semibold transition-colors ${
                        settings.fontSize === size
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="pb-2" />
          </>
        )}
      </main>
    </div>
  )
}
