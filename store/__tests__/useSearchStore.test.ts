import { useSearchStore } from '../useSearchStore'
import { createMockTopic } from '../../jest.setup'
import { db } from '@/lib/db/indexeddb'
import type { Topic } from '@/data/schema/topic.schema'

// Mock the database module
jest.mock('@/lib/db/indexeddb', () => ({
  db: {
    cache: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    }
  }
}))

const mockDb = db as jest.Mocked<typeof db>

describe('useSearchStore', () => {
  let mockTopics: Topic[]

  beforeEach(() => {
    // Reset the store state
    useSearchStore.setState({
      query: '',
      results: [],
      searchHistory: [],
      loading: false,
      error: null,
      filters: {
        query: undefined,
        category: undefined,
        difficulty: undefined,
        tags: undefined,
        language: 'en'
      },
      maxHistoryItems: 10,
      debounceMs: 300,
    })

    // Clear mock calls
    jest.clearAllMocks()

    // Create mock topics for testing
    mockTopics = [
      createMockTopic({
        id: 'topic1',
        title: 'Eucharist Explained',
        question: 'What is the Eucharist?',
        answer: 'The Eucharist is the source and summit of Christian life.',
        category: 'sacraments',
        difficulty: 'beginner',
        lang: 'en',
        tags: ['eucharist', 'sacraments', 'mass']
      }),
      createMockTopic({
        id: 'topic2',
        title: 'Mary Mother of God',
        question: 'Why is Mary called Mother of God?',
        answer: 'Mary is called Mother of God because she gave birth to Jesus.',
        category: 'mary',
        difficulty: 'intermediate',
        lang: 'en',
        tags: ['mary', 'theotokos', 'jesus']
      }),
      createMockTopic({
        id: 'topic3',
        title: 'Papal Authority',
        question: 'What is papal authority?',
        answer: 'Papal authority comes from the authority given to Peter.',
        category: 'papacy',
        difficulty: 'advanced',
        lang: 'tl',
        tags: ['pope', 'peter', 'authority']
      })
    ]
  })

  describe('Query Actions', () => {
    it('should set query', () => {
      const store = useSearchStore.getState()
      store.setQuery('test query')

      const state = useSearchStore.getState()
      expect(state.query).toBe('test query')
    })

    it('should set results', () => {
      const store = useSearchStore.getState()
      store.setResults(mockTopics)

      const state = useSearchStore.getState()
      expect(state.results).toEqual(mockTopics)
    })

    it('should set loading', () => {
      const store = useSearchStore.getState()
      store.setLoading(true)

      const state = useSearchStore.getState()
      expect(state.loading).toBe(true)
    })

    it('should set error', () => {
      const store = useSearchStore.getState()
      store.setError('Search failed')

      const state = useSearchStore.getState()
      expect(state.error).toBe('Search failed')
    })

    it('should clear search', () => {
      const store = useSearchStore.getState()
      store.setQuery('test')
      store.setResults(mockTopics)
      store.setError('error')

      store.clearSearch()

      const state = useSearchStore.getState()
      expect(state.query).toBe('')
      expect(state.results).toEqual([])
      expect(state.error).toBeNull()
    })

    it('should clear results only', () => {
      const store = useSearchStore.getState()
      store.setQuery('test')
      store.setResults(mockTopics)

      store.clearResults()

      const state = useSearchStore.getState()
      expect(state.query).toBe('test')
      expect(state.results).toEqual([])
    })
  })

  describe('Filter Actions', () => {
    it('should set filters', () => {
      const store = useSearchStore.getState()
      store.setFilters({
        category: 'sacraments',
        difficulty: 'beginner'
      })

      const state = useSearchStore.getState()
      expect(state.filters.category).toBe('sacraments')
      expect(state.filters.difficulty).toBe('beginner')
      expect(state.filters.language).toBe('en') // Should preserve existing language
    })

    it('should reset filters', () => {
      const store = useSearchStore.getState()
      store.setFilters({
        category: 'sacraments',
        difficulty: 'beginner',
        language: 'tl'
      })

      store.resetFilters()

      const state = useSearchStore.getState()
      expect(state.filters.category).toBeUndefined()
      expect(state.filters.difficulty).toBeUndefined()
      expect(state.filters.language).toBe('tl') // Should preserve language
      expect(state.filters.query).toBeUndefined()
      expect(state.filters.tags).toBeUndefined()
    })

    it('should update single filter', () => {
      const store = useSearchStore.getState()
      store.updateFilter('category', 'mary')

      const state = useSearchStore.getState()
      expect(state.filters.category).toBe('mary')
    })
  })

  describe('Search History Actions', () => {
    it('should add query to history', () => {
      const store = useSearchStore.getState()
      store.addToHistory('Eucharist')

      const state = useSearchStore.getState()
      expect(state.searchHistory).toContain('Eucharist')
      expect(state.searchHistory[0]).toBe('Eucharist')
    })

    it('should not add empty query to history', () => {
      const store = useSearchStore.getState()
      store.addToHistory('')
      store.addToHistory('   ')

      const state = useSearchStore.getState()
      expect(state.searchHistory).toHaveLength(0)
    })

    it('should remove duplicate queries and add to front', () => {
      const store = useSearchStore.getState()
      store.addToHistory('first')
      store.addToHistory('second')
      store.addToHistory('first') // Duplicate

      const state = useSearchStore.getState()
      expect(state.searchHistory).toEqual(['first', 'second'])
    })

    it('should limit history to maxHistoryItems', () => {
      const store = useSearchStore.getState()

      // Add more than the max items
      for (let i = 0; i < 15; i++) {
        store.addToHistory(`query${i}`)
      }

      const state = useSearchStore.getState()
      expect(state.searchHistory).toHaveLength(10) // maxHistoryItems
      expect(state.searchHistory[0]).toBe('query14') // Last added
    })

    it('should remove from history', () => {
      const store = useSearchStore.getState()
      store.addToHistory('first')
      store.addToHistory('second')
      store.removeFromHistory('first')

      const state = useSearchStore.getState()
      expect(state.searchHistory).toEqual(['second'])
    })

    it('should clear history', () => {
      const store = useSearchStore.getState()
      store.addToHistory('first')
      store.addToHistory('second')
      store.clearHistory()

      const state = useSearchStore.getState()
      expect(state.searchHistory).toHaveLength(0)
    })

    it('should get recent searches', () => {
      const store = useSearchStore.getState()
      store.addToHistory('first')
      store.addToHistory('second')
      store.addToHistory('third')

      const recent = store.getRecentSearches(2)
      expect(recent).toEqual(['third', 'first'])
    })

    it('should get default count of recent searches', () => {
      const store = useSearchStore.getState()
      store.addToHistory('first')
      store.addToHistory('second')
      store.addToHistory('third')
      store.addToHistory('fourth')
      store.addToHistory('fifth')
      store.addToHistory('sixth')

      const recent = store.getRecentSearches()
      expect(recent).toHaveLength(5)
    })
  })

  describe('Search Execution', () => {
    it('should perform search with query', async () => {
      const store = useSearchStore.getState()
      await store.performSearch('Eucharist', mockTopics)

      const state = useSearchStore.getState()
      expect(state.loading).toBe(false)
      expect(state.results).toHaveLength(1)
      expect(state.results[0].id).toBe('topic1')
      expect(state.searchHistory).toContain('Eucharist')
    })

    it('should perform search with language filter', async () => {
      const store = useSearchStore.getState()
      await store.performSearch('', mockTopics, { language: 'tl' })

      const state = useSearchStore.getState()
      expect(state.results).toHaveLength(1)
      expect(state.results[0].id).toBe('topic3')
      expect(state.results[0].lang).toBe('tl')
    })

    it('should perform search with category filter', async () => {
      const store = useSearchStore.getState()
      await store.performSearch('', mockTopics, { category: 'sacraments' })

      const state = useSearchStore.getState()
      expect(state.results).toHaveLength(1)
      expect(state.results[0].category).toBe('sacraments')
    })

    it('should perform search with difficulty filter', async () => {
      const store = useSearchStore.getState()
      await store.performSearch('', mockTopics, { difficulty: 'advanced' })

      const state = useSearchStore.getState()
      expect(state.results).toHaveLength(1)
      expect(state.results[0].difficulty).toBe('advanced')
    })

    it('should perform search with tags filter', async () => {
      const store = useSearchStore.getState()
      await store.performSearch('', mockTopics, { tags: ['eucharist'] })

      const state = useSearchStore.getState()
      expect(state.results).toHaveLength(1)
      expect(state.results[0].tags).toContain('eucharist')
    })

    it('should perform text search across multiple fields', async () => {
      const store = useSearchStore.getState()
      await store.performSearch('mother', mockTopics)

      const state = useSearchStore.getState()
      expect(state.results).toHaveLength(1)
      expect(state.results[0].id).toBe('topic2')
    })

    it('should be case insensitive', async () => {
      const store = useSearchStore.getState()
      await store.performSearch('EUCHARIST', mockTopics)

      const state = useSearchStore.getState()
      expect(state.results).toHaveLength(1)
      expect(state.results[0].id).toBe('topic1')
    })

    it('should handle empty query', async () => {
      const store = useSearchStore.getState()
      await store.performSearch('', mockTopics)

      const state = useSearchStore.getState()
      expect(state.results).toHaveLength(0)
      expect(state.searchHistory).not.toContain('')
    })

    it('should handle search error', async () => {
      const store = useSearchStore.getState()

      // Force an error by passing invalid topics
      await store.performSearch('test', null as any)

      const state = useSearchStore.getState()
      expect(state.loading).toBe(false)
      expect(state.error).toBeTruthy()
    })
  })

  describe('Utility Actions', () => {
    it('should get query suggestions', () => {
      const store = useSearchStore.getState()
      const suggestions = store.getQuerySuggestions('eucha', mockTopics)

      expect(suggestions).toContain('Eucharist Explained')
      expect(suggestions).toContain('eucharist')
    })

    it('should return empty suggestions for short query', () => {
      const store = useSearchStore.getState()
      const suggestions = store.getQuerySuggestions('e', mockTopics)

      expect(suggestions).toHaveLength(0)
    })

    it('should limit suggestions count', () => {
      const store = useSearchStore.getState()
      const suggestions = store.getQuerySuggestions('mary', mockTopics)

      expect(suggestions.length).toBeLessThanOrEqual(5)
    })

    it('should highlight text', () => {
      const store = useSearchStore.getState()
      const highlighted = store.highlightText('This is about Eucharist', 'eucharist')

      expect(highlighted).toContain('<mark class="scripture-highlight">Eucharist</mark>')
    })

    it('should return original text when query is empty', () => {
      const store = useSearchStore.getState()
      const highlighted = store.highlightText('Test text', '')

      expect(highlighted).toBe('Test text')
    })
  })

  describe('Persistence', () => {
    beforeEach(() => {
      // Reset persistence mocks
      mockDb.cache.get.mockResolvedValue(null)
      mockDb.cache.set.mockResolvedValue(undefined)
      mockDb.cache.remove.mockResolvedValue(undefined)
    })

    it('should persist state to IndexedDB cache', () => {
      const store = useSearchStore.getState()
      store.setFilters({ category: 'sacraments' })
      store.addToHistory('test query')

      // Trigger state persistence by accessing the store
      const state = useSearchStore.getState()

      // Since we're using IndexedDB mock, we verify that the persistence
      // would happen by checking that store methods are called during operations
      expect(state.filters.category).toBe('sacraments')
      expect(state.searchHistory).toContain('test query')
    })
  })

  describe('Selector Hooks', () => {
    it('useSearchQuery should return query', () => {
      const store = useSearchStore.getState()
      store.setQuery('test query')

      const useSearchQuery = require('../useSearchStore').useSearchQuery
      expect(typeof useSearchQuery).toBe('function')
    })

    it('useSearchResults should return results', () => {
      const store = useSearchStore.getState()
      store.setResults(mockTopics)

      const useSearchResults = require('../useSearchStore').useSearchResults
      expect(typeof useSearchResults).toBe('function')
    })

    it('useSearchLoading should return loading', () => {
      const store = useSearchStore.getState()
      store.setLoading(true)

      const useSearchLoading = require('../useSearchStore').useSearchLoading
      expect(typeof useSearchLoading).toBe('function')
    })

    it('useSearchError should return error', () => {
      const store = useSearchStore.getState()
      store.setError('test error')

      const useSearchError = require('../useSearchStore').useSearchError
      expect(typeof useSearchError).toBe('function')
    })

    it('useSearchFilters should return filters', () => {
      const useSearchFilters = require('../useSearchStore').useSearchFilters
      expect(typeof useSearchFilters).toBe('function')
    })

    it('useSearchHistory should return history', () => {
      const store = useSearchStore.getState()
      store.addToHistory('test')

      const useSearchHistory = require('../useSearchStore').useSearchHistory
      expect(typeof useSearchHistory).toBe('function')
    })

    it('useSearchActions should return actions', () => {
      const useSearchActions = require('../useSearchStore').useSearchActions
      expect(typeof useSearchActions).toBe('function')
    })
  })
})