'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

// ── Bible book catalogue ──────────────────────────────────────────────────────

interface BookMeta {
  name: string
  code: string
  testament: 'OT' | 'NT'
  chapters: number
}

const BOOKS: BookMeta[] = [
  { name: 'Genesis',         code: 'GEN', testament: 'OT', chapters: 50 },
  { name: 'Exodus',          code: 'EXO', testament: 'OT', chapters: 40 },
  { name: 'Leviticus',       code: 'LEV', testament: 'OT', chapters: 27 },
  { name: 'Numbers',         code: 'NUM', testament: 'OT', chapters: 36 },
  { name: 'Deuteronomy',     code: 'DEU', testament: 'OT', chapters: 34 },
  { name: 'Joshua',          code: 'JOS', testament: 'OT', chapters: 24 },
  { name: 'Judges',          code: 'JDG', testament: 'OT', chapters: 21 },
  { name: 'Ruth',            code: 'RUT', testament: 'OT', chapters: 4  },
  { name: '1 Samuel',        code: '1SA', testament: 'OT', chapters: 31 },
  { name: '2 Samuel',        code: '2SA', testament: 'OT', chapters: 24 },
  { name: '1 Kings',         code: '1KI', testament: 'OT', chapters: 22 },
  { name: '2 Kings',         code: '2KI', testament: 'OT', chapters: 25 },
  { name: '1 Chronicles',    code: '1CH', testament: 'OT', chapters: 29 },
  { name: '2 Chronicles',    code: '2CH', testament: 'OT', chapters: 36 },
  { name: 'Ezra',            code: 'EZR', testament: 'OT', chapters: 10 },
  { name: 'Nehemiah',        code: 'NEH', testament: 'OT', chapters: 13 },
  { name: 'Tobit',           code: 'TOB', testament: 'OT', chapters: 14 },
  { name: 'Judith',          code: 'JDT', testament: 'OT', chapters: 16 },
  { name: 'Esther',          code: 'EST', testament: 'OT', chapters: 16 },
  { name: '1 Maccabees',     code: '1MA', testament: 'OT', chapters: 16 },
  { name: '2 Maccabees',     code: '2MA', testament: 'OT', chapters: 15 },
  { name: 'Job',             code: 'JOB', testament: 'OT', chapters: 42 },
  { name: 'Psalms',          code: 'PSA', testament: 'OT', chapters: 150 },
  { name: 'Proverbs',        code: 'PRO', testament: 'OT', chapters: 31 },
  { name: 'Ecclesiastes',    code: 'ECC', testament: 'OT', chapters: 12 },
  { name: 'Song of Songs',   code: 'SNG', testament: 'OT', chapters: 8  },
  { name: 'Wisdom',          code: 'WIS', testament: 'OT', chapters: 19 },
  { name: 'Sirach',          code: 'SIR', testament: 'OT', chapters: 51 },
  { name: 'Isaiah',          code: 'ISA', testament: 'OT', chapters: 66 },
  { name: 'Jeremiah',        code: 'JER', testament: 'OT', chapters: 52 },
  { name: 'Lamentations',    code: 'LAM', testament: 'OT', chapters: 5  },
  { name: 'Baruch',          code: 'BAR', testament: 'OT', chapters: 6  },
  { name: 'Ezekiel',         code: 'EZK', testament: 'OT', chapters: 48 },
  { name: 'Daniel',          code: 'DAN', testament: 'OT', chapters: 14 },
  { name: 'Hosea',           code: 'HOS', testament: 'OT', chapters: 14 },
  { name: 'Joel',            code: 'JOL', testament: 'OT', chapters: 4  },
  { name: 'Amos',            code: 'AMO', testament: 'OT', chapters: 9  },
  { name: 'Obadiah',         code: 'OBA', testament: 'OT', chapters: 1  },
  { name: 'Jonah',           code: 'JON', testament: 'OT', chapters: 4  },
  { name: 'Micah',           code: 'MIC', testament: 'OT', chapters: 7  },
  { name: 'Nahum',           code: 'NAH', testament: 'OT', chapters: 3  },
  { name: 'Habakkuk',        code: 'HAB', testament: 'OT', chapters: 3  },
  { name: 'Zephaniah',       code: 'ZEP', testament: 'OT', chapters: 3  },
  { name: 'Haggai',          code: 'HAG', testament: 'OT', chapters: 2  },
  { name: 'Zechariah',       code: 'ZEC', testament: 'OT', chapters: 14 },
  { name: 'Malachi',         code: 'MAL', testament: 'OT', chapters: 4  },
  { name: 'Matthew',         code: 'MAT', testament: 'NT', chapters: 28 },
  { name: 'Mark',            code: 'MRK', testament: 'NT', chapters: 16 },
  { name: 'Luke',            code: 'LUK', testament: 'NT', chapters: 24 },
  { name: 'John',            code: 'JHN', testament: 'NT', chapters: 21 },
  { name: 'Acts',            code: 'ACT', testament: 'NT', chapters: 28 },
  { name: 'Romans',          code: 'ROM', testament: 'NT', chapters: 16 },
  { name: '1 Corinthians',   code: '1CO', testament: 'NT', chapters: 16 },
  { name: '2 Corinthians',   code: '2CO', testament: 'NT', chapters: 13 },
  { name: 'Galatians',       code: 'GAL', testament: 'NT', chapters: 6  },
  { name: 'Ephesians',       code: 'EPH', testament: 'NT', chapters: 6  },
  { name: 'Philippians',     code: 'PHP', testament: 'NT', chapters: 4  },
  { name: 'Colossians',      code: 'COL', testament: 'NT', chapters: 4  },
  { name: '1 Thessalonians', code: '1TH', testament: 'NT', chapters: 5  },
  { name: '2 Thessalonians', code: '2TH', testament: 'NT', chapters: 3  },
  { name: '1 Timothy',       code: '1TI', testament: 'NT', chapters: 6  },
  { name: '2 Timothy',       code: '2TI', testament: 'NT', chapters: 4  },
  { name: 'Titus',           code: 'TIT', testament: 'NT', chapters: 3  },
  { name: 'Philemon',        code: 'PHM', testament: 'NT', chapters: 1  },
  { name: 'Hebrews',         code: 'HEB', testament: 'NT', chapters: 13 },
  { name: 'James',           code: 'JAS', testament: 'NT', chapters: 5  },
  { name: '1 Peter',         code: '1PE', testament: 'NT', chapters: 5  },
  { name: '2 Peter',         code: '2PE', testament: 'NT', chapters: 3  },
  { name: '1 John',          code: '1JN', testament: 'NT', chapters: 5  },
  { name: '2 John',          code: '2JN', testament: 'NT', chapters: 1  },
  { name: '3 John',          code: '3JN', testament: 'NT', chapters: 1  },
  { name: 'Jude',            code: 'JUD', testament: 'NT', chapters: 1  },
  { name: 'Revelation',      code: 'REV', testament: 'NT', chapters: 22 },
]

const OT_BOOKS = BOOKS.filter(b => b.testament === 'OT')
const NT_BOOKS = BOOKS.filter(b => b.testament === 'NT')

const TRANSLATIONS = [
  { value: 'NABRE',         label: 'NABRE' },
  { value: 'Douay-Rheims',  label: 'Douay-Rheims' },
]

// ── Fetching ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

interface Verse {
  reference: string
  verse_start: number
  text: string
  version: string
}

async function fetchChapter(book: string, chapter: number, version: string): Promise<Verse[]> {
  const params = new URLSearchParams({
    book: `eq.${book}`,
    chapter: `eq.${chapter}`,
    version: `eq.${version}`,
    order: 'verse_start.asc',
    select: 'reference,verse_start,text,version',
    limit: '200',
  })
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scripture_verses?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!res.ok) return []
  return res.json()
}

// ── Page ──────────────────────────────────────────────────────────────────────

type View = 'books' | 'chapters' | 'reading'

export default function BiblePage() {
  const [view, setView]             = useState<View>('books')
  const [testament, setTestament]   = useState<'OT' | 'NT'>('NT')
  const [selectedBook, setBook]     = useState<BookMeta | null>(null)
  const [selectedChapter, setChapter] = useState(1)
  const [version, setVersion]       = useState('NABRE')
  const [verses, setVerses]         = useState<Verse[]>([])
  const [loading, setLoading]       = useState(false)
  const [bookSearch, setBookSearch] = useState('')

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
    loadChapter(selectedBook, chapter, version)
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
          {selectedBook && view !== 'books' && (
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
          }}
          className="text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {TRANSLATIONS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Breadcrumb nav */}
      {view !== 'books' && (
        <div className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
          <button onClick={() => setView('books')} className="text-primary hover:underline">Books</button>
          {selectedBook && (
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
            placeholder="Search books…"
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
    </div>
  )
}
