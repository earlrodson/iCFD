// Shared "1213-1220, 2258" style range parsing for CCC paragraphs, Canon Law
// canons, and magisterial document sections — mirrors the comma-separated
// multi-passage syntax already supported by lib/bible/reference.ts, but for
// plain numeric refs with no book name to match.

export interface NumericRange {
  start: number
  end: number
}

export function parseNumericRanges(input: string): NumericRange[] | null {
  const parts = input.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return null

  const ranges: NumericRange[] = []
  for (const part of parts) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/)
    if (!match) return null
    const start = parseInt(match[1], 10)
    const end = match[2] ? parseInt(match[2], 10) : start
    if (end < start) return null
    ranges.push({ start, end })
  }
  return ranges
}

export function formatNumericRanges(ranges: NumericRange[]): string {
  return ranges.map(r => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`)).join(', ')
}
