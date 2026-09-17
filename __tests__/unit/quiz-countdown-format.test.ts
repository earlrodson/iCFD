import { describe, it, expect } from 'vitest'
import { formatCountdown } from '@/app/quiz/[topicId]/[tier]/QuizClient'

describe('formatCountdown', () => {
  it('formats whole minutes with :00 seconds', () => {
    expect(formatCountdown(900)).toBe('15:00')
  })

  it('pads single-digit seconds', () => {
    expect(formatCountdown(65)).toBe('1:05')
  })

  it('formats zero as 0:00', () => {
    expect(formatCountdown(0)).toBe('0:00')
  })

  it('formats sub-minute durations without a leading minute digit issue', () => {
    expect(formatCountdown(59)).toBe('0:59')
  })
})
