import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

/**
 * Parses a fetch Response as JSON, but degrades gracefully when the response
 * isn't JSON at all — e.g. a platform-level 413 ("Request Entity Too Large")
 * returned as plain text before the request ever reaches our route handler.
 * Calling res.json() directly on those throws a confusing "Unexpected token"
 * SyntaxError instead of a message the user can act on.
 */
export async function parseJsonResponse<T>(res: Response, fallbackError = 'Request failed'): Promise<T> {
  if (!res.headers.get('content-type')?.includes('application/json')) {
    if (res.status === 413) throw new Error('File is too large to upload.')
    throw new Error(`${fallbackError} (HTTP ${res.status})`)
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? fallbackError)
  return data as T
}
