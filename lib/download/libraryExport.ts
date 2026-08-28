import { cachedLibraryFetch } from '@/lib/libraryCache'
import { fetchParagraphs } from '@/lib/content/catechismFetch'

export type ExportProgress = (done: number, total: number) => void

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const API_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }

// ── Trigger a client-side file download ────────────────────────────────────────

export function triggerBlobDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function triggerTextDownload(filename: string, content: string): void {
  triggerBlobDownload(filename, new Blob([content], { type: 'text/plain' }))
}

// ── Church documents (encyclicals, councils, Vatican II documents) ───────────

interface DocMeta {
  title: string
  subtitle: string | null
  author: string | null
  year: number | null
  description: string | null
}

interface DocSection {
  section_num: number
  section_label: string | null
  text: string | null
  summary: string | null
}

const DOC_BATCH = 50

async function fetchDocMeta(slug: string): Promise<DocMeta | null> {
  const res = await cachedLibraryFetch(
    `${SUPABASE_URL}/rest/v1/church_document_meta?slug=eq.${encodeURIComponent(slug)}&limit=1`,
    API_HEADERS,
  )
  if (!res.ok) return null
  const rows: DocMeta[] = await res.json()
  return rows[0] ?? null
}

async function fetchDocSections(slug: string, from: number, to: number): Promise<DocSection[]> {
  const params = new URLSearchParams({
    slug: `eq.${slug}`,
    section_num: `gte.${from}`,
    and: `(section_num.lte.${to})`,
    order: 'section_num.asc',
    select: 'section_num,section_label,text,summary',
    limit: String(DOC_BATCH),
  })
  const res = await cachedLibraryFetch(`${SUPABASE_URL}/rest/v1/church_documents?${params}`, API_HEADERS)
  if (!res.ok) return []
  return res.json()
}

export async function exportChurchDocument(slug: string, onProgress?: ExportProgress): Promise<string> {
  const meta = await fetchDocMeta(slug)
  const sections: DocSection[] = []
  let from = 1
  for (;;) {
    const to = from + DOC_BATCH - 1
    const page = await fetchDocSections(slug, from, to)
    sections.push(...page)
    onProgress?.(sections.length, sections.length)
    if (page.length < DOC_BATCH) break
    from = to + 1
  }

  const lines: string[] = []
  lines.push((meta?.title ?? slug).toUpperCase())
  if (meta?.subtitle) lines.push(meta.subtitle)
  const bylineParts = [meta?.author?.replace(/-/g, ' '), meta?.year?.toString()].filter(Boolean)
  if (bylineParts.length > 0) lines.push(bylineParts.join(' · '))
  if (meta?.description) lines.push('', meta.description)
  lines.push('')
  for (const s of sections) {
    if (s.section_label) lines.push(s.section_label)
    lines.push(`§${s.section_num}`)
    lines.push(s.text ?? s.summary ?? '')
    lines.push('')
  }
  return lines.join('\n')
}

// ── Catechism ──────────────────────────────────────────────────────────────────

const CATECHISM_PARTS: { label: string; range: [number, number] }[] = [
  { label: 'Part One',   range: [1, 1065] },
  { label: 'Part Two',   range: [1066, 1690] },
  { label: 'Part Three', range: [1691, 2557] },
  { label: 'Part Four',  range: [2558, 2865] },
]

export async function exportCatechism(onProgress?: ExportProgress): Promise<string> {
  const lines: string[] = ['CATECHISM OF THE CATHOLIC CHURCH', 'Second Edition', '']
  let done = 0
  const total = CATECHISM_PARTS.length
  for (const part of CATECHISM_PARTS) {
    const [from, to] = part.range
    const paragraphs = await fetchParagraphs(from, to)
    lines.push(part.label, '')
    for (const p of paragraphs) {
      lines.push(`¶${p.paragraph}`, p.text ?? p.summary ?? '', '')
    }
    done++
    onProgress?.(done, total)
  }
  return lines.join('\n')
}

// ── GIRM ───────────────────────────────────────────────────────────────────────

interface GirmArticle {
  article: number
  text: string
  summary: string
}

const GIRM_CHAPTERS: { label: string; range: [number, number] }[] = [
  { label: 'Preamble',     range: [1, 15] },
  { label: 'Chapter I',    range: [16, 26] },
  { label: 'Chapter II',   range: [27, 90] },
  { label: 'Chapter III',  range: [91, 111] },
  { label: 'Chapter IV',   range: [112, 287] },
  { label: 'Chapter V',    range: [288, 318] },
  { label: 'Chapter VI',   range: [319, 351] },
  { label: 'Chapter VII',  range: [352, 367] },
  { label: 'Chapter VIII', range: [368, 385] },
  { label: 'Chapter IX',   range: [386, 399] },
]

async function fetchGirmArticles(from: number, to: number): Promise<GirmArticle[]> {
  const params = new URLSearchParams({
    article: `gte.${from}`,
    and: `(article.lte.${to})`,
    lang: 'eq.en',
    text: 'not.is.null',
    order: 'article.asc',
    select: 'article,text,summary',
    limit: '300',
  })
  const res = await cachedLibraryFetch(`${SUPABASE_URL}/rest/v1/girm_articles?${params}`, API_HEADERS)
  if (!res.ok) return []
  return res.json()
}

export async function exportGirm(onProgress?: ExportProgress): Promise<string> {
  const lines: string[] = ['GENERAL INSTRUCTION OF THE ROMAN MISSAL', '']
  let done = 0
  const total = GIRM_CHAPTERS.length
  for (const chapter of GIRM_CHAPTERS) {
    const [from, to] = chapter.range
    const articles = await fetchGirmArticles(from, to)
    lines.push(chapter.label, '')
    for (const a of articles) {
      lines.push(`Art. ${a.article}`, a.text ?? a.summary ?? '', '')
    }
    done++
    onProgress?.(done, total)
  }
  return lines.join('\n')
}

// ── Code of Canon Law ─────────────────────────────────────────────────────────

interface Canon {
  canon: number
  text: string
  summary: string
}

const CANON_BOOKS: { label: string; range: [number, number] }[] = [
  { label: 'Book I',   range: [1, 203] },
  { label: 'Book II',  range: [204, 746] },
  { label: 'Book III', range: [747, 833] },
  { label: 'Book IV',  range: [834, 1253] },
  { label: 'Book V',   range: [1254, 1310] },
  { label: 'Book VI',  range: [1311, 1399] },
  { label: 'Book VII', range: [1400, 1752] },
]

async function fetchCanons(from: number, to: number): Promise<Canon[]> {
  const params = new URLSearchParams({
    canon: `gte.${from}`,
    and: `(canon.lte.${to})`,
    lang: 'eq.en',
    text: 'not.is.null',
    order: 'canon.asc',
    select: 'canon,text,summary',
    limit: '600',
  })
  const res = await cachedLibraryFetch(`${SUPABASE_URL}/rest/v1/canons?${params}`, API_HEADERS)
  if (!res.ok) return []
  return res.json()
}

export async function exportCanon(onProgress?: ExportProgress): Promise<string> {
  const lines: string[] = ['CODE OF CANON LAW', '1983', '']
  let done = 0
  const total = CANON_BOOKS.length
  for (const book of CANON_BOOKS) {
    const [from, to] = book.range
    const canons = await fetchCanons(from, to)
    lines.push(book.label, '')
    for (const c of canons) {
      lines.push(`Can. ${c.canon}`, c.text ?? c.summary ?? '', '')
    }
    done++
    onProgress?.(done, total)
  }
  return lines.join('\n')
}

// ── Bible ──────────────────────────────────────────────────────────────────────

interface BookMeta {
  name: string
  code: string
  chapters: number
}

// Kept in sync with app/bible/page.tsx's BOOKS catalogue.
const BIBLE_BOOKS: BookMeta[] = [
  { name: 'Genesis',         code: 'GEN', chapters: 50 },
  { name: 'Exodus',          code: 'EXO', chapters: 40 },
  { name: 'Leviticus',       code: 'LEV', chapters: 27 },
  { name: 'Numbers',         code: 'NUM', chapters: 36 },
  { name: 'Deuteronomy',     code: 'DEU', chapters: 34 },
  { name: 'Joshua',          code: 'JOS', chapters: 24 },
  { name: 'Judges',          code: 'JDG', chapters: 21 },
  { name: 'Ruth',            code: 'RUT', chapters: 4 },
  { name: '1 Samuel',        code: '1SA', chapters: 31 },
  { name: '2 Samuel',        code: '2SA', chapters: 24 },
  { name: '1 Kings',         code: '1KI', chapters: 22 },
  { name: '2 Kings',         code: '2KI', chapters: 25 },
  { name: '1 Chronicles',    code: '1CH', chapters: 29 },
  { name: '2 Chronicles',    code: '2CH', chapters: 36 },
  { name: 'Ezra',            code: 'EZR', chapters: 10 },
  { name: 'Nehemiah',        code: 'NEH', chapters: 13 },
  { name: 'Tobit',           code: 'TOB', chapters: 14 },
  { name: 'Judith',          code: 'JDT', chapters: 16 },
  { name: 'Esther',          code: 'EST', chapters: 16 },
  { name: '1 Maccabees',     code: '1MA', chapters: 16 },
  { name: '2 Maccabees',     code: '2MA', chapters: 15 },
  { name: 'Job',             code: 'JOB', chapters: 42 },
  { name: 'Psalms',          code: 'PSA', chapters: 150 },
  { name: 'Proverbs',        code: 'PRO', chapters: 31 },
  { name: 'Ecclesiastes',    code: 'ECC', chapters: 12 },
  { name: 'Song of Songs',   code: 'SNG', chapters: 8 },
  { name: 'Wisdom',          code: 'WIS', chapters: 19 },
  { name: 'Sirach',          code: 'SIR', chapters: 51 },
  { name: 'Isaiah',          code: 'ISA', chapters: 66 },
  { name: 'Jeremiah',        code: 'JER', chapters: 52 },
  { name: 'Lamentations',    code: 'LAM', chapters: 5 },
  { name: 'Baruch',          code: 'BAR', chapters: 6 },
  { name: 'Ezekiel',         code: 'EZK', chapters: 48 },
  { name: 'Daniel',          code: 'DAN', chapters: 14 },
  { name: 'Hosea',           code: 'HOS', chapters: 14 },
  { name: 'Joel',            code: 'JOL', chapters: 4 },
  { name: 'Amos',            code: 'AMO', chapters: 9 },
  { name: 'Obadiah',         code: 'OBA', chapters: 1 },
  { name: 'Jonah',           code: 'JON', chapters: 4 },
  { name: 'Micah',           code: 'MIC', chapters: 7 },
  { name: 'Nahum',           code: 'NAH', chapters: 3 },
  { name: 'Habakkuk',        code: 'HAB', chapters: 3 },
  { name: 'Zephaniah',       code: 'ZEP', chapters: 3 },
  { name: 'Haggai',          code: 'HAG', chapters: 2 },
  { name: 'Zechariah',       code: 'ZEC', chapters: 14 },
  { name: 'Malachi',         code: 'MAL', chapters: 4 },
  { name: 'Matthew',         code: 'MAT', chapters: 28 },
  { name: 'Mark',            code: 'MRK', chapters: 16 },
  { name: 'Luke',            code: 'LUK', chapters: 24 },
  { name: 'John',            code: 'JHN', chapters: 21 },
  { name: 'Acts',            code: 'ACT', chapters: 28 },
  { name: 'Romans',          code: 'ROM', chapters: 16 },
  { name: '1 Corinthians',   code: '1CO', chapters: 16 },
  { name: '2 Corinthians',   code: '2CO', chapters: 13 },
  { name: 'Galatians',       code: 'GAL', chapters: 6 },
  { name: 'Ephesians',       code: 'EPH', chapters: 6 },
  { name: 'Philippians',     code: 'PHP', chapters: 4 },
  { name: 'Colossians',      code: 'COL', chapters: 4 },
  { name: '1 Thessalonians', code: '1TH', chapters: 5 },
  { name: '2 Thessalonians', code: '2TH', chapters: 3 },
  { name: '1 Timothy',       code: '1TI', chapters: 6 },
  { name: '2 Timothy',       code: '2TI', chapters: 4 },
  { name: 'Titus',           code: 'TIT', chapters: 3 },
  { name: 'Philemon',        code: 'PHM', chapters: 1 },
  { name: 'Hebrews',         code: 'HEB', chapters: 13 },
  { name: 'James',           code: 'JAS', chapters: 5 },
  { name: '1 Peter',         code: '1PE', chapters: 5 },
  { name: '2 Peter',         code: '2PE', chapters: 3 },
  { name: '1 John',          code: '1JN', chapters: 5 },
  { name: '2 John',          code: '2JN', chapters: 1 },
  { name: '3 John',          code: '3JN', chapters: 1 },
  { name: 'Jude',            code: 'JUD', chapters: 1 },
  { name: 'Revelation',      code: 'REV', chapters: 22 },
]

interface Verse {
  verse_start: number
  text: string
}

const BIBLE_CACHE = 'icfd-bible-v1'

function bibleChapterUrl(book: string, chapter: number, version: string): string {
  return `${SUPABASE_URL}/rest/v1/scripture_verses?book=eq.${encodeURIComponent(book)}&chapter=eq.${chapter}&version=eq.${version}&order=verse_start.asc&select=reference%2Cverse_start%2Ctext%2Cversion&limit=200`
}

async function fetchBibleChapter(book: string, chapter: number, version: string): Promise<Verse[]> {
  const url = bibleChapterUrl(book, chapter, version)

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(BIBLE_CACHE)
      const cached = await cache.match(url)
      if (cached) return cached.json()
    } catch { /* cache unavailable */ }
  }

  const res = await fetch(url, { headers: API_HEADERS })
  if (!res.ok) return []

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(BIBLE_CACHE)
      await cache.put(url, res.clone())
    } catch { /* storage full or private mode */ }
  }

  return res.json()
}

export async function exportBible(version: string, onProgress?: ExportProgress): Promise<string> {
  const totalChapters = BIBLE_BOOKS.reduce((sum, b) => sum + b.chapters, 0)
  let done = 0
  const lines: string[] = [`HOLY BIBLE — ${version}`, '']
  for (const book of BIBLE_BOOKS) {
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      const verses = await fetchBibleChapter(book.code, chapter, version)
      lines.push(`${book.name} ${chapter}`)
      for (const v of verses) {
        lines.push(`${v.verse_start} ${v.text}`)
      }
      lines.push('')
      done++
      onProgress?.(done, totalChapters)
    }
  }
  return lines.join('\n')
}
