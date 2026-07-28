import { describe, it, expect } from 'vitest'
import { cn, formatDate, truncate, parseJsonResponse } from '@/lib/utils'

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'excluded', 'included')).toBe('base included')
  })

  it('resolves tailwind conflicts — last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})

describe('formatDate', () => {
  it('formats an ISO date string to readable form', () => {
    const result = formatDate('2024-01-15')
    expect(result).toMatch(/January/)
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/15/)
  })
})

describe('truncate', () => {
  it('returns string unchanged when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates and adds ellipsis when over limit', () => {
    const result = truncate('hello world', 5)
    expect(result).toHaveLength(6) // 5 chars + ellipsis char
    expect(result).toMatch(/…$/)
  })

  it('returns string unchanged when exactly at limit', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })
})

describe('parseJsonResponse', () => {
  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }

  it('returns the parsed body on a JSON success response', async () => {
    const res = jsonResponse({ avatar_url: 'https://example.com/a.png' })
    await expect(parseJsonResponse<{ avatar_url: string }>(res)).resolves.toEqual({
      avatar_url: 'https://example.com/a.png',
    })
  })

  it('throws the server-provided error message on a JSON error response', async () => {
    const res = jsonResponse({ error: 'Image must be under 4 MB' }, 400)
    await expect(parseJsonResponse(res)).rejects.toThrow('Image must be under 4 MB')
  })

  it('throws a specific message for a non-JSON 413 (platform body-size rejection)', async () => {
    const res = new Response('Request Entity Too Large', { status: 413 })
    await expect(parseJsonResponse(res)).rejects.toThrow('File is too large to upload.')
  })

  it('falls back to a generic message for any other non-JSON error response', async () => {
    const res = new Response('<html>Bad Gateway</html>', { status: 502 })
    await expect(parseJsonResponse(res, 'Upload failed')).rejects.toThrow('Upload failed (HTTP 502)')
  })
})
