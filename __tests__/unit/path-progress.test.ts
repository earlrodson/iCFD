import { describe, it, expect } from 'vitest'
import { isTopicComplete } from '@/lib/content/pathProgress'

describe('isTopicComplete', () => {
  it('falls back to isRead for a topic with no quiz bank', () => {
    expect(isTopicComplete('sacred-images', false, new Set(), true)).toBe(true)
    expect(isTopicComplete('sacred-images', false, new Set(), false)).toBe(false)
  })

  it('ignores isRead for a quizzed topic — read alone is not complete', () => {
    expect(isTopicComplete('true-church', true, new Set(), true)).toBe(false)
  })

  it('is complete once any tier is passed for a quizzed topic', () => {
    const passed = new Set(['true-church:beginner'])
    expect(isTopicComplete('true-church', true, passed, false)).toBe(true)
  })

  it('is not complete when only a different topic/tier is passed', () => {
    const passed = new Set(['bible-tradition-authority:beginner'])
    expect(isTopicComplete('true-church', true, passed, false)).toBe(false)
  })

  it('recognizes intermediate and advanced passes, not just beginner', () => {
    expect(isTopicComplete('t', true, new Set(['t:intermediate']), false)).toBe(true)
    expect(isTopicComplete('t', true, new Set(['t:advanced']), false)).toBe(true)
  })
})
