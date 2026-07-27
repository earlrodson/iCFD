import { BOOKS_BY_NAME_LENGTH, type BookMeta } from './books'

export interface VerseRange {
  start: number
  end: number
}

export interface ParsedPassage {
  raw: string
  book: BookMeta
  chapter: number
  /** null means "whole chapter" (no verse restriction) */
  ranges: VerseRange[] | null
  label: string
}

export interface ReferenceParseError {
  raw: string
  message: string
}

export interface ParseReferenceResult {
  passages: ParsedPassage[]
  errors: ReferenceParseError[]
}

function matchBook(input: string): { book: BookMeta; rest: string } | null {
  const trimmed = input.trim()
  const lower = trimmed.toLowerCase()
  for (const book of BOOKS_BY_NAME_LENGTH) {
    const name = book.name.toLowerCase()
    if (lower.startsWith(name)) {
      const next = trimmed.charAt(book.name.length)
      if (next === '' || next === ' ' || next === ':') {
        return { book, rest: trimmed.slice(book.name.length).trim() }
      }
    }
    const code = book.code.toLowerCase()
    if (lower.startsWith(code)) {
      const next = trimmed.charAt(book.code.length)
      if (next === '' || next === ' ' || next === ':') {
        return { book, rest: trimmed.slice(book.code.length).trim() }
      }
    }
  }
  return null
}

function parseVerseSpec(spec: string): VerseRange[] | null {
  const ranges: VerseRange[] = []
  for (const part of spec.split(',')) {
    const token = part.trim()
    if (!token) continue
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/)
    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return null
      ranges.push({ start, end })
      continue
    }
    const singleMatch = token.match(/^(\d+)$/)
    if (singleMatch) {
      const n = Number(singleMatch[1])
      ranges.push({ start: n, end: n })
      continue
    }
    return null
  }
  return ranges.length > 0 ? ranges : null
}

function formatRanges(ranges: VerseRange[]): string {
  return ranges.map(r => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`)).join(', ')
}

function parseSegment(raw: string): ParsedPassage | ReferenceParseError {
  const matched = matchBook(raw)
  if (!matched) {
    return { raw, message: `Unrecognized book in "${raw.trim()}"` }
  }
  const { book, rest } = matched
  const withoutLeadingColon = rest.replace(/^:/, '').trim()
  if (!withoutLeadingColon) {
    return { raw, message: `Missing chapter in "${raw.trim()}"` }
  }

  const colonIndex = withoutLeadingColon.indexOf(':')
  const chapterPart = colonIndex === -1 ? withoutLeadingColon : withoutLeadingColon.slice(0, colonIndex)
  const versePart = colonIndex === -1 ? null : withoutLeadingColon.slice(colonIndex + 1)

  const chapter = Number(chapterPart.trim())
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return { raw, message: `Invalid chapter in "${raw.trim()}"` }
  }

  let ranges: VerseRange[] | null = null
  if (versePart !== null) {
    ranges = parseVerseSpec(versePart)
    if (ranges === null) {
      return { raw, message: `Invalid verse range in "${raw.trim()}"` }
    }
  }

  const label = ranges
    ? `${book.name} ${chapter}:${formatRanges(ranges)}`
    : `${book.name} ${chapter}`

  return { raw, book, chapter, ranges, label }
}

/**
 * Parses a multi-passage reference string such as
 * "John 1:1-14,16;Exodus 20:1-5;Exodus 30" into individual passages.
 * Semicolons separate distinct book/chapter passages; commas separate
 * verses/ranges within a passage. Both "Book Chapter:Verses" and
 * "Book:Chapter:Verses" separators are accepted.
 */
export function parseReference(input: string): ParseReferenceResult {
  const passages: ParsedPassage[] = []
  const errors: ReferenceParseError[] = []

  for (const segment of input.split(';')) {
    const trimmed = segment.trim()
    if (!trimmed) continue
    const result = parseSegment(trimmed)
    if ('message' in result) errors.push(result)
    else passages.push(result)
  }

  return { passages, errors }
}
