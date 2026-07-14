import { describe, it, expect } from 'vitest'
import { cn, formatDate, truncate } from '@/lib/utils'

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
