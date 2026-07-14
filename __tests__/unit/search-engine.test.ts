import { describe, it, expect, beforeEach } from 'vitest'
import { SearchEngine } from '@/lib/search/engine'
import type { Topic } from '@/data/schema/topic.schema'

const makeTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: 'baptism-necessity',
  category: 'sacraments',
  title: 'The Necessity of Baptism',
  question: 'Is baptism really necessary for salvation?',
  answer: 'Yes, baptism is necessary for salvation according to Scripture and Tradition.',
  tags: ['baptism', 'sacraments', 'salvation'],
  difficulty: 'beginner',
  lang: 'en',
  scripture: [],
  lastUpdated: '2024-01-01',
  ...overrides,
})

describe('SearchEngine', () => {
  let engine: SearchEngine

  beforeEach(() => {
    engine = new SearchEngine()
  })

  it('returns empty results when not indexed', () => {
    expect(engine.search('baptism')).toEqual([])
  })

  it('returns empty results for empty query after indexing', () => {
    engine.index([makeTopic()])
    expect(engine.search('')).toEqual([])
    expect(engine.search('   ')).toEqual([])
  })

  it('finds topic by title keyword', () => {
    engine.index([makeTopic()])
    const results = engine.search('Baptism')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('baptism-necessity')
  })

  it('finds topic by tag', () => {
    engine.index([makeTopic()])
    const results = engine.search('sacraments')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('baptism-necessity')
  })

  it('ranks title matches higher than answer matches', () => {
    const titleMatch = makeTopic({ id: 'topic-a', title: 'Papal Infallibility', answer: 'General info.' })
    const answerMatch = makeTopic({ id: 'topic-b', title: 'Some Other Topic', answer: 'Papal authority is key.' })
    engine.index([answerMatch, titleMatch])
    const results = engine.search('papal')
    expect(results[0].id).toBe('topic-a')
  })

  it('handles fuzzy matching for typos', () => {
    engine.index([makeTopic()])
    const results = engine.search('bptism')
    expect(results.length).toBeGreaterThan(0)
  })

  it('re-indexes cleanly without duplicates', () => {
    engine.index([makeTopic()])
    engine.index([makeTopic()])
    const results = engine.search('baptism')
    expect(results).toHaveLength(1)
  })

  it('returns score on each result', () => {
    engine.index([makeTopic()])
    const results = engine.search('baptism')
    expect(results[0].score).toBeGreaterThan(0)
  })

  it('isIndexed reflects state', () => {
    expect(engine.isIndexed()).toBe(false)
    engine.index([makeTopic()])
    expect(engine.isIndexed()).toBe(true)
  })
})
