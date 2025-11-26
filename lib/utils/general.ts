import { formatDistanceToNow } from 'date-fns'

/**
 * Get the display label for a difficulty level
 */
export function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
  }
  return labels[difficulty] || difficulty
}

/**
 * Format a relative time string
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return 'Unknown time'
  }
}

/**
 * Truncate text to a specified number of lines
 */
export function truncateText(text: string, maxLines: number = 3): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) {
    return text
  }
  return lines.slice(0, maxLines).join('\n')
}

/**
 * Format scripture reference for display
 */
export function formatScriptureReference(reference: string, version?: string): string {
  if (version) {
    return `${reference} (${version})`
  }
  return reference
}

/**
 * Generate a slug from a title
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}