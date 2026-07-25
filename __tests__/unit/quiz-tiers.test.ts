import { describe, it, expect } from 'vitest'
import { previousTier, isQuizTier } from '@/lib/content/quizTiers'

describe('previousTier', () => {
  it('returns null for beginner — nothing gates the first tier', () => {
    expect(previousTier('beginner')).toBeNull()
  })

  it('returns beginner as the gate for intermediate', () => {
    expect(previousTier('intermediate')).toBe('beginner')
  })

  it('returns intermediate as the gate for advanced', () => {
    expect(previousTier('advanced')).toBe('intermediate')
  })
})

describe('isQuizTier', () => {
  it('accepts the three valid tiers', () => {
    expect(isQuizTier('beginner')).toBe(true)
    expect(isQuizTier('intermediate')).toBe(true)
    expect(isQuizTier('advanced')).toBe(true)
  })

  it('rejects invalid strings and non-strings', () => {
    expect(isQuizTier('expert')).toBe(false)
    expect(isQuizTier('')).toBe(false)
    expect(isQuizTier(null)).toBe(false)
    expect(isQuizTier(undefined)).toBe(false)
    expect(isQuizTier(1)).toBe(false)
  })
})
