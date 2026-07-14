'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAppStore, useAvailableTopics, useCurrentLanguage } from '@/store/useAppStore'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useSearchStore } from '@/store/useSearchStore'
import { searchEngine } from '@/lib/search/minisearch-engine'
import { MagnifyingGlass, X, Clock, Sliders, BookOpen, Quotes, Scroll } from '@phosphor-icons/react'
import Link from 'next/link'
import { getCategoryColor, getCategoryName, type Category } from '@/lib/utils/categories'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Badge } from '@/components/ui/badge'
import type { Topic } from '@/data/schema/topic.schema'
import type { SearchResult } from '@/lib/search/minisearch-engine'

const CATEGORIES = ['sacraments', 'mary', 'papacy', 'salvation', 'bible', 'saints', 'tradition', 'church-teaching'] as const
type Difficulty = 'beginner' | 'intermediate' | 'advanced'
type Language = 'en' | 'tl' | 'ceb'

const LANG_LABELS: Record<Language, string> = { en: 'English', tl: 'Tagalog', ceb: 'Cebuano' }

function highlight(text: string, terms: string[]): string {
  if (!terms.length) return text
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">$1</mark>')
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { initialize } = useAppStore()
  const { loadFavorites } = useFavoritesStore()
  const defaultLanguage = useCurrentLanguage()
  const storeTopics = useAvailableTopics()
  const { searchHistory, clearHistory, removeFromHistory, addToHistory } = useSearchStore()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [searchLang, setSearchLang] = useState<Language>(defaultLanguage as Language)
  const [topics, setTopics] = useState<Topic[]>(storeTopics)
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([])
  const [hasScripture, setHasScripture] = useState(false)
  const [hasFathers, setHasFathers] = useState(false)
  const [hasCatechism, setHasCatechism] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [indexed, setIndexed] = useState(false)

  // Load topics for the selected search language
  useEffect(() => {
    if (searchLang === defaultLanguage) {
      setTopics(storeTopics)
    } else {
      fetch(`/data/content/${searchLang}/handbook.json`)
        .then(r => r.json())
        .then(data => setTopics(data.topics ?? []))
        .catch(() => setTopics([]))
    }
  }, [searchLang, defaultLanguage, storeTopics])

  // (Re)build search index when topics change
  useEffect(() => {
    if (!topics.length) return
    setIndexed(false)
    searchEngine.initialize(searchLang, topics).then(() => setIndexed(true))
  }, [topics, searchLang])

  useEffect(() => {
    initialize().then(() => loadFavorites()).catch(console.error)
    inputRef.current?.focus()
  }, [initialize, loadFavorites])

  // Debounced search
  useEffect(() => {
    if (!indexed) return
    const timer = setTimeout(() => {
      const q = query.trim()
      if (!q) { setResults([]); return }

      let raw = searchEngine.search(q, searchLang)

      // Post-filter
      if (selectedCategories.length) {
        raw = raw.filter(r => selectedCategories.includes(r.topic.category))
      }
      if (selectedDifficulties.length) {
        raw = raw.filter(r => selectedDifficulties.includes(r.topic.difficulty))
      }
      if (hasScripture) raw = raw.filter(r => r.topic.scripture?.length)
      if (hasFathers) raw = raw.filter(r => r.topic.churchFathers?.length)
      if (hasCatechism) raw = raw.filter(r => r.topic.catechism?.length)

      setResults(raw)
      setFocusedIndex(-1)
      addToHistory(q)

      const params = new URLSearchParams({ q })
      router.replace(`/search?${params.toString()}`, { scroll: false })
    }, 250)
    return () => clearTimeout(timer)
  }, [query, searchLang, selectedCategories, selectedDifficulties, hasScripture, hasFathers, hasCatechism, indexed, router, addToHistory])

  const clearAll = useCallback(() => {
    setQuery('')
    setResults([])
    setSelectedCategories([])
    setSelectedDifficulties([])
    setHasScripture(false)
    setHasFathers(false)
    setHasCatechism(false)
    router.replace('/search', { scroll: false })
    inputRef.current?.focus()
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      router.push(`/${encodeURIComponent(results[focusedIndex].topic.id)}`)
    }
  }

  const hasFilters = selectedCategories.length > 0 || selectedDifficulties.length > 0
    || hasScripture || hasFathers || hasCatechism
  const filterCount = selectedCategories.length + selectedDifficulties.length
    + (hasScripture ? 1 : 0) + (hasFathers ? 1 : 0) + (hasCatechism ? 1 : 0)

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Sticky search header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          {/* Language tabs */}
          <div className="flex gap-1 mb-3">
            {(['en', 'tl', 'ceb'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => setSearchLang(lang)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  searchLang === lang
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass weight="light" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search topics, scripture, tags…"
                className="pl-9 pr-9"
                aria-label="Search"
              />
              {query && (
                <button
                  onClick={clearAll}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X weight="light" className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(s => !s)}
            >
              <Sliders weight="light" className="h-4 w-4" />
              {filterCount > 0 && <span className="ml-1 text-xs">{filterCount}</span>}
            </Button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategories(prev =>
                        prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                      )}
                      className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedCategories.includes(cat)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <CategoryIcon category={cat} className="h-3.5 w-3.5 inline-block mr-1" />
                      {getCategoryName(cat as Category)}
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
                      onClick={() => setSelectedDifficulties(prev =>
                        prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                      )}
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

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Has content</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Scripture', icon: BookOpen, active: hasScripture, toggle: () => setHasScripture(v => !v) },
                    { label: 'Church Fathers', icon: Quotes, active: hasFathers, toggle: () => setHasFathers(v => !v) },
                    { label: 'Catechism', icon: Scroll, active: hasCatechism, toggle: () => setHasCatechism(v => !v) },
                  ].map(({ label, icon: Icon, active, toggle }) => (
                    <button
                      key={label}
                      onClick={toggle}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <Icon weight="light" className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedCategories([])
                  setSelectedDifficulties([])
                  setHasScripture(false)
                  setHasFathers(false)
                  setHasCatechism(false)
                }}>
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {!query.trim() ? (
          <div>
            {searchHistory.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock weight="light" className="h-4 w-4" /> Recent searches
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
                <MagnifyingGlass weight="light" className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Search apologetics topics</p>
                <p className="text-sm mt-1">Try &ldquo;baptism&rdquo;, &ldquo;Mary&rdquo;, or &ldquo;papal authority&rdquo;</p>
                <p className="text-xs mt-2 opacity-60">Use ↑↓ arrow keys to navigate results, Enter to open</p>
              </div>
            )}
          </div>
        ) : (
          <div ref={listRef}>
            <p className="text-sm text-muted-foreground mb-4">
              {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
              <strong>&ldquo;{query}&rdquo;</strong>
              {hasFilters && <span className="ml-1">· filtered</span>}
            </p>
            {results.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MagnifyingGlass weight="light" className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No results found</p>
                <p className="text-sm mt-1">Try different keywords or remove filters</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {results.map((result, idx) => {
                  const { topic, terms } = result
                  const excerpt = typeof topic.answer === 'string'
                    ? topic.answer.slice(0, 120)
                    : topic.answer.summary?.slice(0, 120) ?? ''
                  const isFocused = idx === focusedIndex
                  return (
                    <Link
                      key={topic.id}
                      href={`/${encodeURIComponent(topic.id)}`}
                      className={`block p-4 border rounded-lg transition-colors ${
                        isFocused
                          ? 'border-primary bg-accent'
                          : 'hover:bg-accent/50 hover:border-primary/40'
                      }`}
                      onMouseEnter={() => setFocusedIndex(idx)}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`${getCategoryColor(topic.category)} text-xs flex items-center gap-1`}>
                          <CategoryIcon category={topic.category} className="h-3 w-3" />
                          {getCategoryName(topic.category as Category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">{topic.difficulty}</span>
                      </div>
                      <h3
                        className="font-semibold text-sm mb-1"
                        dangerouslySetInnerHTML={{ __html: highlight(topic.title, terms) }}
                      />
                      <p
                        className="text-xs text-muted-foreground line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: highlight(excerpt + (excerpt.length >= 120 ? '…' : ''), terms) }}
                      />
                      {topic.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {topic.tags.slice(0, 4).map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground"
                              dangerouslySetInnerHTML={{ __html: highlight(`#${tag}`, terms) }}
                            />
                          ))}
                        </div>
                      )}
                    </Link>
                  )
                })}
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
