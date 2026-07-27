'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLineDown, CheckCircle, Export, MagnifyingGlass, Warning } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { OT_BOOKS, NT_BOOKS, type BookMeta } from '@/lib/bible/books'
import { parseReference, type ParsedPassage, type ReferenceParseError } from '@/lib/bible/reference'

const TRANSLATIONS = [
  { value: 'NABRE',         label: 'NABRE' },
  { value: 'Douay-Rheims',  label: 'Douay-Rheims' },
]

// ── Fetching ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const BIBLE_CACHE  = 'icfd-bible-v1'

function chapterCacheKey(book: string, chapter: number, version: string) {
  return `${SUPABASE_URL}/rest/v1/scripture_verses?book=eq.${encodeURIComponent(book)}&chapter=eq.${chapter}&version=eq.${version}&order=verse_start.asc&select=reference%2Cverse_start%2Ctext%2Cversion&limit=200`
}

function savedLocalKey(book: string, chapter: number, version: string) {
  return `bible-saved:${book}:${chapter}:${version}`
}

interface Verse {
  reference: string
  verse_start: number
  text: string
  version: string
}

async function fetchChapter(book: string, chapter: number, version: string): Promise<Verse[]> {
  const url = chapterCacheKey(book, chapter, version)
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }

  // Try cache first (works offline too)
  if ('caches' in window) {
    try {
      const cache = await caches.open(BIBLE_CACHE)
      const cached = await cache.match(url)
      if (cached) return cached.json()
    } catch { /* cache unavailable */ }
  }

  const res = await fetch(url, { headers })
  if (!res.ok) return []

  // Store in cache for future offline use
  if ('caches' in window) {
    try {
      const cache = await caches.open(BIBLE_CACHE)
      await cache.put(url, res.clone())
    } catch { /* storage full or private mode */ }
  }

  return res.json()
}

async function saveChapterOffline(book: string, chapter: number, version: string): Promise<void> {
  const url = chapterCacheKey(book, chapter, version)
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  const res = await fetch(url, { headers })
  if (!res.ok) return
  if ('caches' in window) {
    const cache = await caches.open(BIBLE_CACHE)
    await cache.put(url, res)
  }
  localStorage.setItem(savedLocalKey(book, chapter, version), '1')
}

interface PassageResult {
  passage: ParsedPassage
  verses: Verse[]
}

// Fetches the widest verse_start range covering the passage, then filters
// client-side to the exact requested verses/ranges — avoids constructing a
// PostgREST `or=` filter for disjoint ranges like "1-14,16".
async function fetchPassage(passage: ParsedPassage, version: string): Promise<Verse[]> {
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  let url = `${SUPABASE_URL}/rest/v1/scripture_verses?book=eq.${encodeURIComponent(passage.book.name)}&chapter=eq.${passage.chapter}&version=eq.${version}&order=verse_start.asc&select=reference,verse_start,text,version&limit=200`

  if (passage.ranges) {
    const min = Math.min(...passage.ranges.map(r => r.start))
    const max = Math.max(...passage.ranges.map(r => r.end))
    url += `&verse_start=gte.${min}&verse_start=lte.${max}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) return []
  const data: Verse[] = await res.json()

  if (!passage.ranges) return data
  return data.filter(v => passage.ranges!.some(r => v.verse_start >= r.start && v.verse_start <= r.end))
}

const KEYWORD_LIMIT = 50

async function fetchKeywordMatches(keyword: string, version: string): Promise<{ results: Verse[]; truncated: boolean }> {
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  const pattern = encodeURIComponent(`*${keyword}*`)
  const url = `${SUPABASE_URL}/rest/v1/scripture_verses?text=ilike.${pattern}&version=eq.${version}&order=id.asc&select=reference,verse_start,text,version&limit=${KEYWORD_LIMIT + 1}`

  const res = await fetch(url, { headers })
  if (!res.ok) return { results: [], truncated: false }
  const data: Verse[] = await res.json()
  return { results: data.slice(0, KEYWORD_LIMIT), truncated: data.length > KEYWORD_LIMIT }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightMatches(text: string, keyword: string) {
  const trimmed = keyword.trim()
  if (!trimmed) return text
  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, 'gi'))
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-inherit rounded px-0.5">{part}</mark>
      : part
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type View = 'books' | 'chapters' | 'reading' | 'search'
type SearchMode = 'reference' | 'keyword'

export default function BiblePage() {
  return (
    <Suspense>
      <BiblePageInner />
    </Suspense>
  )
}

function BiblePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [view, setView]             = useState<View>('books')
  const [testament, setTestament]   = useState<'OT' | 'NT'>('NT')
  const [selectedBook, setBook]     = useState<BookMeta | null>(null)
  const [selectedChapter, setChapter] = useState(1)
  const [version, setVersion]       = useState('NABRE')
  const [verses, setVerses]         = useState<Verse[]>([])
  const [loading, setLoading]       = useState(false)
  const [bookSearch, setBookSearch] = useState('')
  const [saving, setSaving]         = useState(false)
  const [savedChapter, setSavedChapter] = useState(false)

  const [searchInput, setSearchInput]       = useState('')
  const [searchMode, setSearchMode]         = useState<SearchMode>('reference')
  const [searchErrors, setSearchErrors]     = useState<ReferenceParseError[]>([])
  const [searchResults, setSearchResults]   = useState<PassageResult[]>([])
  const [keywordResults, setKeywordResults] = useState<Verse[]>([])
  const [keywordTruncated, setKeywordTruncated] = useState(false)
  const [searchLoading, setSearchLoading]   = useState(false)
  const [copied, setCopied]                 = useState(false)

  // A query with a digit is treated as a reference attempt (e.g. "John 3:16");
  // pure text falls back to a keyword search over verse content.
  const runSearch = useCallback(async (raw: string, ver: string, syncUrl: boolean) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    setView('search')
    setSearchErrors([])
    setSearchResults([])
    setKeywordResults([])
    setKeywordTruncated(false)

    const looksLikeReference = /\d/.test(trimmed)
    const { passages, errors } = looksLikeReference ? parseReference(trimmed) : { passages: [], errors: [] }

    if (passages.length > 0) {
      setSearchMode('reference')
      setSearchErrors(errors)
      setSearchLoading(true)
      const results = await Promise.all(
        passages.map(async passage => ({ passage, verses: await fetchPassage(passage, ver) }))
      )
      setSearchResults(results)
      setSearchLoading(false)
    } else if (looksLikeReference) {
      // Digits present but nothing parsed — surface as a reference error
      // rather than silently keyword-searching a mistyped book name.
      setSearchMode('reference')
      setSearchErrors(errors)
    } else {
      setSearchMode('keyword')
      setSearchLoading(true)
      const { results, truncated } = await fetchKeywordMatches(trimmed, ver)
      setKeywordResults(results)
      setKeywordTruncated(truncated)
      setSearchLoading(false)
    }

    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('ref')
      params.delete('q')
      params.set(passages.length > 0 || looksLikeReference ? 'ref' : 'q', trimmed)
      params.set('version', ver)
      router.replace(`/bible?${params.toString()}`, { scroll: false })
    }
  }, [router, searchParams])

  // Auto-run a shared search link (?ref=... or ?q=...) on load.
  useEffect(() => {
    const ref = searchParams.get('ref')
    const q = searchParams.get('q')
    const query = ref ?? q
    if (!query) return
    const ver = searchParams.get('version') ?? version
    setSearchInput(query)
    if (TRANSLATIONS.some(t => t.value === ver)) setVersion(ver)
    runSearch(query, ver, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(searchInput, version, true)
  }

  const handleShareSearch = async () => {
    const url = window.location.href
    const title = searchMode === 'reference'
      ? searchResults.map(r => r.passage.label).join('; ') || 'Bible passage'
      : `"${searchInput.trim()}" — Bible search`
    if (navigator.share) {
      await navigator.share({ title, url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const loadChapter = useCallback(async (book: BookMeta, chapter: number, ver: string) => {
    setLoading(true)
    setVerses([])
    const data = await fetchChapter(book.name, chapter, ver)
    setVerses(data)
    setLoading(false)
  }, [])

  const openBook = (book: BookMeta) => {
    setBook(book)
    setChapter(1)
    setView('chapters')
  }

  const openChapter = (chapter: number) => {
    if (!selectedBook) return
    setChapter(chapter)
    setView('reading')
    setSavedChapter(!!localStorage.getItem(savedLocalKey(selectedBook.name, chapter, version)))
    loadChapter(selectedBook, chapter, version)
  }

  const handleSaveOffline = async () => {
    if (!selectedBook || saving) return
    setSaving(true)
    await saveChapterOffline(selectedBook.name, selectedChapter, version)
    setSavedChapter(true)
    setSaving(false)
  }

  const filteredBooks = (testament === 'OT' ? OT_BOOKS : NT_BOOKS).filter(b =>
    b.name.toLowerCase().includes(bookSearch.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header + translation picker */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bible</h1>
          {selectedBook && view !== 'books' && view !== 'search' && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedBook.name}{view === 'reading' ? ` · Chapter ${selectedChapter}` : ''}
            </p>
          )}
        </div>
        <select
          value={version}
          onChange={e => {
            setVersion(e.target.value)
            if (view === 'reading' && selectedBook) {
              loadChapter(selectedBook, selectedChapter, e.target.value)
            }
            if (view === 'search' && searchInput.trim()) {
              runSearch(searchInput, e.target.value, true)
            }
          }}
          className="text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {TRANSLATIONS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Reference search — supports "John 3:16-18", "John 1:1-14,16", and
          multi-passage "John 1:1-14,16;Exodus 20:1-5;Exodus 30" — plus a
          keyword fallback that searches verse text (e.g. "mercy"). */}
      <form onSubmit={handleSearchSubmit} className="mb-1">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search a reference (John 3:16-18) or a keyword (mercy)"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            <MagnifyingGlass weight="bold" size={16} />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground mb-4">
        Reference: <span className="font-mono">John 3:16-18</span> · Multi-passage: <span className="font-mono">John 1:1-14,16;Exodus 20:1-5</span> · Or search by keyword
      </p>

      {/* Breadcrumb nav */}
      {view !== 'books' && (
        <div className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
          <button onClick={() => setView('books')} className="text-primary hover:underline">Books</button>
          {view === 'search' && (
            <>
              <span className="text-muted-foreground">›</span>
              <span className="text-foreground font-medium">Search results</span>
            </>
          )}
          {selectedBook && view !== 'search' && (
            <>
              <span className="text-muted-foreground">›</span>
              <button
                onClick={() => setView('chapters')}
                className={cn('hover:underline', view === 'chapters' ? 'text-foreground font-medium' : 'text-primary')}
              >
                {selectedBook.name}
              </button>
            </>
          )}
          {view === 'reading' && (
            <>
              <span className="text-muted-foreground">›</span>
              <span className="text-foreground font-medium">Chapter {selectedChapter}</span>
            </>
          )}
        </div>
      )}

      {/* ── Book list ─────────────────────────────────────────────────────── */}
      {view === 'books' && (
        <>
          <div className="flex gap-2 mb-4">
            {(['OT', 'NT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTestament(t)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                  testament === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'OT' ? 'Old Testament' : 'New Testament'}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Filter book list…"
            value={bookSearch}
            onChange={e => setBookSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3"
          />
          <div className="grid grid-cols-2 gap-2">
            {filteredBooks.map(book => (
              <button
                key={book.code}
                onClick={() => openBook(book)}
                className="text-left px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground block">{book.name}</span>
                <span className="text-xs text-muted-foreground">{book.chapters} chapter{book.chapters !== 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Chapter grid ──────────────────────────────────────────────────── */}
      {view === 'chapters' && selectedBook && (
        <>
          <p className="text-sm text-muted-foreground mb-3">Select a chapter</p>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
              <button
                key={ch}
                onClick={() => openChapter(ch)}
                className="aspect-square flex items-center justify-center rounded-lg border border-border text-sm font-medium hover:border-primary hover:text-primary transition-colors"
              >
                {ch}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Reading view ──────────────────────────────────────────────────── */}
      {view === 'reading' && (
        <>
          {/* Save for offline */}
          <div className="flex justify-end mb-3">
            <button
              onClick={handleSaveOffline}
              disabled={saving || savedChapter}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                savedChapter
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 disabled:opacity-50'
              )}
            >
              {savedChapter
                ? <><CheckCircle weight="fill" size={14} /> Saved offline</>
                : saving
                  ? <><div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" /> Saving…</>
                  : <><ArrowLineDown weight="bold" size={14} /> Save chapter offline</>
              }
            </button>
          </div>

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}
          {!loading && verses.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No verses found for this chapter in {version}.
            </p>
          )}
          {!loading && verses.length > 0 && (
            <div className="space-y-3">
              {verses.map(v => (
                <div key={v.reference} className="flex gap-3">
                  <span className="text-xs font-mono text-primary/60 w-6 shrink-0 pt-0.5 text-right">
                    {v.verse_start}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed flex-1">{v.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Chapter navigation */}
          {!loading && selectedBook && (
            <div className="flex gap-3 mt-8">
              <button
                disabled={selectedChapter <= 1}
                onClick={() => openChapter(selectedChapter - 1)}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:border-primary/40 transition-colors"
              >
                ← Chapter {selectedChapter - 1}
              </button>
              <button
                disabled={selectedChapter >= selectedBook.chapters}
                onClick={() => openChapter(selectedChapter + 1)}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:border-primary/40 transition-colors"
              >
                Chapter {selectedChapter + 1} →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Search results ────────────────────────────────────────────────── */}
      {view === 'search' && (
        <>
          {searchErrors.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {searchErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-400">
                  <Warning weight="fill" size={16} className="shrink-0 mt-0.5" />
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          )}

          {searchLoading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!searchLoading && searchMode === 'reference' && searchResults.length === 0 && searchErrors.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Enter a reference like &quot;John 3:16-18&quot; or a keyword like &quot;mercy&quot; to search.
            </p>
          )}

          {!searchLoading && searchMode === 'keyword' && keywordResults.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No verses matched &quot;{searchInput.trim()}&quot; in {version}.
            </p>
          )}

          {!searchLoading && ((searchMode === 'reference' && searchResults.length > 0) || (searchMode === 'keyword' && keywordResults.length > 0)) && (
            <>
              <div className="flex justify-end mb-3">
                <button
                  onClick={handleShareSearch}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition-colors"
                >
                  {copied
                    ? <><CheckCircle weight="fill" size={14} className="text-green-500" /> Link copied</>
                    : <><Export weight="bold" size={14} /> Share</>
                  }
                </button>
              </div>

              {searchMode === 'reference' && (
                <div className="space-y-6">
                  {searchResults.map(({ passage, verses: passageVerses }) => (
                    <div key={passage.label}>
                      <h2 className="text-sm font-semibold text-foreground mb-2">{passage.label}</h2>
                      {passageVerses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No verses found for this passage in {version}.</p>
                      ) : (
                        <div className="space-y-3">
                          {passageVerses.map(v => (
                            <div key={v.reference} className="flex gap-3">
                              <span className="text-xs font-mono text-primary/60 w-6 shrink-0 pt-0.5 text-right">
                                {v.verse_start}
                              </span>
                              <p className="text-sm text-foreground leading-relaxed flex-1">{v.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {searchMode === 'keyword' && (
                <>
                  {keywordTruncated && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Showing the first {KEYWORD_LIMIT} matches — refine your search for more precise results.
                    </p>
                  )}
                  <div className="space-y-4">
                    {keywordResults.map(v => (
                      <div key={v.reference}>
                        <span className="text-xs font-mono text-primary/70">{v.reference}</span>
                        <p className="text-sm text-foreground leading-relaxed mt-0.5">
                          {highlightMatches(v.text, searchInput.trim())}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
