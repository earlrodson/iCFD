import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { Topic } from '@/data/schema/topic.schema'

const makeTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: 'baptism-necessity',
  category: 'sacraments',
  title: 'The Necessity of Baptism',
  question: 'Is baptism necessary?',
  answer: 'Baptism is necessary for salvation.',
  tags: ['baptism'],
  difficulty: 'beginner',
  lang: 'en',
  scripture: [],
  lastUpdated: '2024-01-01',
  ...overrides,
})

const topics: Topic[] = [
  makeTopic({ id: 'baptism-necessity', category: 'sacraments', difficulty: 'beginner', title: 'Necessity of Baptism' }),
  makeTopic({ id: 'papacy-authority', category: 'papacy', difficulty: 'intermediate', title: 'Papal Authority' }),
  makeTopic({ id: 'mary-intercession', category: 'mary', difficulty: 'advanced', title: 'Mary as Intercessor', tags: ['mary', 'saints'] }),
]

beforeEach(async () => {
  const { useSearchStore } = await import('@/store/useSearchStore')
  act(() => useSearchStore.setState({ query: '', results: [], filters: { category: '', difficulty: '' } }))
})

describe('useSearchStore.getFilteredTopics', () => {
  it('returns all topics with no filters or query', async () => {
    const { useSearchStore } = await import('@/store/useSearchStore')
    const { result } = renderHook(() => useSearchStore())
    expect(result.current.getFilteredTopics(topics)).toHaveLength(3)
  })

  it('filters by category', async () => {
    const { useSearchStore } = await import('@/store/useSearchStore')
    const { result } = renderHook(() => useSearchStore())
    act(() => result.current.setFilter('category', 'sacraments'))
    const filtered = result.current.getFilteredTopics(topics)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('baptism-necessity')
  })

  it('filters by difficulty', async () => {
    const { useSearchStore } = await import('@/store/useSearchStore')
    const { result } = renderHook(() => useSearchStore())
    act(() => result.current.setFilter('difficulty', 'advanced'))
    const filtered = result.current.getFilteredTopics(topics)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('mary-intercession')
  })

  it('combines category and difficulty filters', async () => {
    const { useSearchStore } = await import('@/store/useSearchStore')
    const { result } = renderHook(() => useSearchStore())
    act(() => {
      result.current.setFilter('category', 'papacy')
      result.current.setFilter('difficulty', 'intermediate')
    })
    const filtered = result.current.getFilteredTopics(topics)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('papacy-authority')
  })

  it('returns empty when category+difficulty combination has no match', async () => {
    const { useSearchStore } = await import('@/store/useSearchStore')
    const { result } = renderHook(() => useSearchStore())
    act(() => {
      result.current.setFilter('category', 'sacraments')
      result.current.setFilter('difficulty', 'advanced')
    })
    expect(result.current.getFilteredTopics(topics)).toHaveLength(0)
  })

  it('clearFilters resets all state', async () => {
    const { useSearchStore } = await import('@/store/useSearchStore')
    const { result } = renderHook(() => useSearchStore())
    act(() => {
      result.current.setFilter('category', 'mary')
      result.current.clearFilters()
    })
    expect(result.current.filters.category).toBe('')
    expect(result.current.filters.difficulty).toBe('')
    expect(result.current.query).toBe('')
    expect(result.current.getFilteredTopics(topics)).toHaveLength(3)
  })

  it('narrows by search query results', async () => {
    const { useSearchStore } = await import('@/store/useSearchStore')
    const { result } = renderHook(() => useSearchStore())

    // Inject pre-computed result IDs directly (avoids patching the ES module singleton)
    act(() => {
      useSearchStore.setState({ query: 'papal', results: ['papacy-authority'] })
    })
    const filtered = result.current.getFilteredTopics(topics)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('papacy-authority')
  })
})
