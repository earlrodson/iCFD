import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'jotai'
import { useSearchStore } from '@/store/useSearchStore'
import { createMockTopic } from '../jest.setup'
import type { Topic } from '@/data/schema/topic.schema'

// Mock component for testing search workflow
function TestSearchComponent() {
  const {
    query,
    results,
    loading,
    error,
    setQuery,
    performSearch,
    clearSearch,
    setFilters,
    addToHistory,
    getQuerySuggestions
  } = useSearchStore()

  const [localQuery, setLocalQuery] = React.useState('')

  const handleSearch = () => {
    setQuery(localQuery)
    // Mock topics for search
    const mockTopics = [
      createMockTopic({
        id: 'eucharist-1',
        title: 'Understanding the Eucharist',
        question: 'What is the Eucharist?',
        answer: 'The Eucharist is the source and summit of Christian life.',
        category: 'sacraments',
        tags: ['eucharist', 'mass', 'communion']
      }),
      createMockTopic({
        id: 'mary-1',
        title: 'Mary Mother of God',
        question: 'Why is Mary called Mother of God?',
        answer: 'Mary is called Mother of God because she gave birth to Jesus Christ.',
        category: 'mary',
        tags: ['mary', 'theotokos', 'jesus']
      }),
      createMockTopic({
        id: 'bible-1',
        title: 'Bible and Tradition',
        question: 'What is the relationship between Bible and Tradition?',
        answer: 'Sacred Tradition and Sacred Scripture form one sacred deposit of the word of God.',
        category: 'tradition',
        tags: ['bible', 'tradition', 'revelation']
      })
    ]

    performSearch(localQuery, mockTopics)
    addToHistory(localQuery)
  }

  const handleFilter = (category: string) => {
    setFilters({ category })
  }

  return (
    <div data-testid="search-component">
      <div data-testid="search-input">
        <input
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search topics..."
          data-testid="search-field"
        />
        <button onClick={handleSearch} data-testid="search-button">
          Search
        </button>
      </div>

      <div data-testid="search-filters">
        <button onClick={() => handleFilter('sacraments')} data-testid="filter-sacraments">
          Sacraments
        </button>
        <button onClick={() => handleFilter('mary')} data-testid="filter-mary">
          Mary
        </button>
        <button onClick={() => handleFilter('tradition')} data-testid="filter-tradition">
          Tradition
        </button>
        <button onClick={() => clearSearch()} data-testid="clear-search">
          Clear
        </button>
      </div>

      <div data-testid="search-status">
        {loading && <span data-testid="loading-indicator">Searching...</span>}
        {error && <span data-testid="error-message">{error}</span>}
      </div>

      <div data-testid="search-results">
        <div data-testid="query-display">{query}</div>
        <div data-testid="results-count">{results.length}</div>
        {results.map((topic: Topic) => (
          <div key={topic.id} data-testid={`topic-${topic.id}`}>
            <h3>{topic.title}</h3>
            <p>{topic.question}</p>
            <div data-testid={`category-${topic.id}`}>{topic.category}</div>
            <div data-testid={`tags-${topic.id}`}>
              {topic.tags.join(', ')}
            </div>
          </div>
        ))}
      </div>

      <div data-testid="search-suggestions">
        {localQuery.length > 1 && (
          <div data-testid="suggestions-list">
            {getQuerySuggestions(localQuery, [
              createMockTopic({ title: 'Eucharist', tags: ['sacrament'] }),
              createMockTopic({ title: 'Mary', tags: ['saints'] })
            ]).map((suggestion, index) => (
              <div key={index} data-testid={`suggestion-${index}`}>
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

describe('Search Workflow Integration Tests', () => {
  beforeEach(() => {
    // Reset the search store state before each test
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
      }
    })
  })

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <Provider>
        {component}
      </Provider>
    )
  }

  describe('Basic Search Functionality', () => {
    it('should perform search and display results', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')

      // Enter search query
      fireEvent.change(searchField, { target: { value: 'Eucharist' } })
      expect(searchField).toHaveValue('Eucharist')

      // Perform search
      fireEvent.click(searchButton)

      // Check that search was performed
      await waitFor(() => {
        expect(screen.getByTestId('query-display')).toHaveTextContent('Eucharist')
        expect(screen.getByTestId('results-count')).toHaveTextContent('1')
      })

      // Check that result is displayed
      expect(screen.getByTestId('topic-eucharist-1')).toBeInTheDocument()
      expect(screen.getByText('Understanding the Eucharist')).toBeInTheDocument()
      expect(screen.getByTestId('category-eucharist-1')).toHaveTextContent('sacraments')
    })

    it('should handle search with no results', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')

      // Enter query with no matching results
      fireEvent.change(searchField, { target: { value: 'nonexistent' } })
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByTestId('query-display')).toHaveTextContent('nonexistent')
        expect(screen.getByTestId('results-count')).toHaveTextContent('0')
      })
    })

    it('should clear search results', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')
      const clearButton = screen.getByTestId('clear-search')

      // Perform search first
      fireEvent.change(searchField, { target: { value: 'Eucharist' } })
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByTestId('results-count')).toHaveTextContent('1')
      })

      // Clear search
      fireEvent.click(clearButton)

      await waitFor(() => {
        expect(screen.getByTestId('query-display')).toHaveTextContent('')
        expect(screen.getByTestId('results-count')).toHaveTextContent('0')
      })
    })

    it('should handle empty search gracefully', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchButton = screen.getByTestId('search-button')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByTestId('results-count')).toHaveTextContent('0')
      })
    })
  })

  describe('Search Filtering', () => {
    it('should filter results by category', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')
      const filterSacraments = screen.getByTestId('filter-sacraments')

      // Perform general search
      fireEvent.change(searchField, { target: { value: '' } })
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByTestId('results-count')).toHaveTextContent('3')
      })

      // Apply category filter
      fireEvent.click(filterSacraments)

      await waitFor(() => {
        expect(screen.getByTestId('results-count')).toHaveTextContent('1')
        expect(screen.getByTestId('topic-eucharist-1')).toBeInTheDocument()
        expect(screen.getByTestId('topic-mary-1')).not.toBeInTheDocument()
        expect(screen.getByTestId('topic-bible-1')).not.toBeInTheDocument()
      })
    })

    it('should combine search query with category filter', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')
      const filterMary = screen.getByTestId('filter-mary')

      // Search and filter simultaneously
      fireEvent.change(searchField, { target: { value: 'Mother' } })
      fireEvent.click(searchButton)
      fireEvent.click(filterMary)

      await waitFor(() => {
        expect(screen.getByTestId('results-count')).toHaveTextContent('1')
        expect(screen.getByTestId('topic-mary-1')).toBeInTheDocument()
      })
    })
  })

  describe('Search Suggestions', () => {
    it('should show suggestions when typing', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')

      // Type to trigger suggestions
      fireEvent.change(searchField, { target: { value: 'Eucha' } })

      await waitFor(() => {
        expect(screen.getByTestId('suggestions-list')).toBeInTheDocument()
      })
    })

    it('should not show suggestions for short queries', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')

      // Type single character
      fireEvent.change(searchField, { target: { value: 'E' } })

      // Suggestions should not appear
      expect(screen.queryByTestId('suggestions-list')).not.toBeInTheDocument()
    })
  })

  describe('Search History', () => {
    it('should add searches to history', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')

      // Perform multiple searches
      fireEvent.change(searchField, { target: { value: 'Eucharist' } })
      fireEvent.click(searchButton)

      fireEvent.change(searchField, { target: { value: 'Mary' } })
      fireEvent.click(searchButton)

      fireEvent.change(searchField, { target: { value: 'Bible' } })
      fireEvent.click(searchButton)

      // Check that searches were added to history
      const state = useSearchStore.getState()
      expect(state.searchHistory).toContain('Eucharist')
      expect(state.searchHistory).toContain('Mary')
      expect(state.searchHistory).toContain('Bible')
      expect(state.searchHistory[0]).toBe('Bible') // Most recent first
    })

    it('should not add empty searches to history', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchButton = screen.getByTestId('search-button')
      fireEvent.click(searchButton)

      const state = useSearchStore.getState()
      expect(state.searchHistory).not.toContain('')
    })
  })

  describe('Search Performance', () => {
    it('should handle rapid search changes efficiently', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')

      // Rapid fire searches
      fireEvent.change(searchField, { target: { value: 'E' } })
      fireEvent.click(searchButton)

      fireEvent.change(searchField, { target: { value: 'Eu' } })
      fireEvent.click(searchButton)

      fireEvent.change(searchField, { target: { value: 'Euc' } })
      fireEvent.click(searchButton)

      fireEvent.change(searchField, { target: { value: 'Eucha' } })
      fireEvent.click(searchButton)

      fireEvent.change(searchField, { target: { value: 'Eucharist' } })
      fireEvent.click(searchButton)

      // Should handle without errors
      await waitFor(() => {
        expect(screen.getByTestId('query-display')).toHaveTextContent('Eucharist')
      })
    })

    it('should handle large result sets efficiently', async () => {
      // Mock many topics
      const manyTopics = Array.from({ length: 1000 }, (_, i) =>
        createMockTopic({
          id: `topic-${i}`,
          title: `Topic ${i}`,
          question: `Question for topic ${i}`,
          tags: [`tag${i % 10}`]
        })
      )

      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')

      // Search that returns many results
      fireEvent.change(searchField, { target: { value: 'Topic' } })
      searchButton.click()

      // Mock the performSearch to use many topics
      const state = useSearchStore.getState()
      await state.performSearch('Topic', manyTopics)

      expect(state.results).toHaveLength(1000)
    })
  })

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')

      // Force an error by providing invalid topics
      fireEvent.change(searchField, { target: { value: 'test' } })

      const state = useSearchStore.getState()
      await state.performSearch('test', null as any)

      await waitFor(() => {
        expect(state.error).toBeTruthy()
      })
    })

    it('should recover from search errors', async () => {
      renderWithProvider(<TestSearchComponent />)

      const state = useSearchStore.getState()

      // Set error state
      state.setError('Test error')
      expect(state.error).toBe('Test error')

      // Perform successful search to clear error
      await state.performSearch('Eucharist', [
        createMockTopic({ id: 'test', title: 'Test Topic' })
      ])

      expect(state.error).toBeNull()
    })
  })

  describe('Search State Persistence', () => {
    it('should maintain search state across operations', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')
      const filterSacraments = screen.getByTestId('filter-sacraments')

      // Perform search and set filters
      fireEvent.change(searchField, { target: { value: 'Eucharist' } })
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByTestId('results-count')).toHaveTextContent('1')
      })

      // Apply filter
      fireEvent.click(filterSacraments)

      // State should be maintained
      const state = useSearchStore.getState()
      expect(state.query).toBe('Eucharist')
      expect(state.filters.category).toBe('sacraments')
      expect(state.results).toHaveLength(1)
    })
  })

  describe('Search Real-time Updates', () => {
    it('should update results in real-time as query changes', async () => {
      renderWithProvider(<TestSearchComponent />)

      const searchField = screen.getByTestId('search-field')
      const searchButton = screen.getByTestId('search-button')

      // Initial search
      fireEvent.change(searchField, { target: { value: 'Eucharist' } })
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByTestId('results-count')).toHaveTextContent('1')
      })

      // Update search
      fireEvent.change(searchField, { target: { value: 'Mary' } })
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByTestId('results-count')).toHaveTextContent('1')
        expect(screen.getByTestId('topic-mary-1')).toBeInTheDocument()
      })
    })
  })
})