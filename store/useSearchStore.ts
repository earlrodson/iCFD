import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { db } from '@/lib/db/indexeddb'
import type { Topic } from '@/data/schema/topic.schema'
import type { ValidatedSearchFilters } from '@/lib/utils/validation'

export interface SearchState {
  // Search state
  query: string
  results: Topic[]
  searchHistory: string[]
  loading: boolean
  error: string | null

  // Filters
  filters: ValidatedSearchFilters

  // Search configuration
  maxHistoryItems: number
  debounceMs: number

  // Actions
  setQuery: (query: string) => void
  setResults: (results: Topic[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearSearch: () => void
  clearResults: () => void

  // Filter actions
  setFilters: (filters: Partial<ValidatedSearchFilters>) => void
  resetFilters: () => void
  updateFilter: (key: keyof ValidatedSearchFilters, value: any) => void

  // History actions
  addToHistory: (query: string) => void
  removeFromHistory: (query: string) => void
  clearHistory: () => void
  getRecentSearches: (count?: number) => string[]

  // Search execution
  performSearch: (
    query: string,
    topics: Topic[],
    filters?: Partial<ValidatedSearchFilters>
  ) => Promise<void>

  // Utility actions
  getQuerySuggestions: (query: string, topics: Topic[]) => string[]
  highlightText: (text: string, query: string) => string
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // Initial state
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

      // Query actions
      setQuery: (query) => set({ query }),

      setResults: (results) => set({ results }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearSearch: () => set({
        query: '',
        results: [],
        error: null
      }),

      clearResults: () => set({ results: [] }),

      // Filter actions
      setFilters: (newFilters) => {
        const currentFilters = get().filters
        set({ filters: { ...currentFilters, ...newFilters } })
      },

      resetFilters: () => {
        const language = get().filters.language
        set({
          filters: {
            query: undefined,
            category: undefined,
            difficulty: undefined,
            tags: undefined,
            language
          }
        })
      },

      updateFilter: (key, value) => {
        const currentFilters = get().filters
        set({ filters: { ...currentFilters, [key]: value } })
      },

      // History actions
      addToHistory: (query) => {
        if (!query.trim()) return

        const currentHistory = get().searchHistory
        const maxItems = get().maxHistoryItems

        // Remove query if it already exists
        const filteredHistory = currentHistory.filter(item => item !== query)

        // Add query to the beginning
        const newHistory = [query, ...filteredHistory].slice(0, maxItems)

        set({ searchHistory: newHistory })
      },

      removeFromHistory: (query) => {
        const currentHistory = get().searchHistory
        const newHistory = currentHistory.filter(item => item !== query)
        set({ searchHistory: newHistory })
      },

      clearHistory: () => set({ searchHistory: [] }),

      getRecentSearches: (count = 5) => {
        return get().searchHistory.slice(0, count)
      },

      // Search execution
      performSearch: async (
        query,
        topics,
        filters
      ) => {
        set({ loading: true, error: null })

        try {
          const searchQuery = query.trim().toLowerCase()

          if (!searchQuery) {
            set({ results: [], loading: false })
            return
          }

          // Apply filters
          let filteredTopics = topics

          // Language filter
          if (filters?.language) {
            filteredTopics = filteredTopics.filter(topic => topic.lang === filters.language)
          }

          // Category filter
          if (filters?.category) {
            filteredTopics = filteredTopics.filter(topic => topic.category === filters.category)
          }

          // Difficulty filter
          if (filters?.difficulty) {
            filteredTopics = filteredTopics.filter(topic => topic.difficulty === filters.difficulty)
          }

          // Tags filter
          if (filters?.tags && filters.tags.length > 0) {
            filteredTopics = filteredTopics.filter(topic =>
              filters.tags!.some(tag => topic.tags.includes(tag.toLowerCase()))
            )
          }

          // Text search
          const searchResults = filteredTopics.filter(topic => {
            const title = topic.title.toLowerCase()
            const question = topic.question.toLowerCase()
            const answerRaw = typeof topic.answer === 'string'
              ? topic.answer
              : `${topic.answer.summary} ${topic.answer.full}`
            const answer = answerRaw.toLowerCase()
            const tags = topic.tags.join(' ').toLowerCase()

            return (
              title.includes(searchQuery) ||
              question.includes(searchQuery) ||
              answer.includes(searchQuery) ||
              tags.includes(searchQuery)
            )
          })

          // Add to search history
          get().addToHistory(query)

          set({ results: searchResults, loading: false })

        } catch (error) {
          console.error('Search failed:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Search failed'
          })
        }
      },

      // Utility actions
      getQuerySuggestions: (query, topics) => {
        const searchQuery = query.toLowerCase().trim()

        if (searchQuery.length < 2) return []

        const suggestions = new Set<string>()

        // Get suggestions from titles
        topics.forEach(topic => {
          const title = topic.title.toLowerCase()
          const question = topic.question.toLowerCase()
          const tags = topic.tags.map(tag => tag.toLowerCase())

          // Title suggestions
          if (title.includes(searchQuery)) {
            suggestions.add(topic.title)
          }

          // Question suggestions
          if (question.includes(searchQuery) && question.length > 50) {
            const words = question.split(' ')
            const suggestionWords = words.filter(word =>
              word.toLowerCase().includes(searchQuery) && word.length > 3
            )
            suggestionWords.forEach(word => suggestions.add(word))
          }

          // Tag suggestions
          tags.forEach(tag => {
            if (tag.includes(searchQuery)) {
              suggestions.add(tag)
            }
          })
        })

        return Array.from(suggestions).slice(0, 5)
      },

      highlightText: (text, query) => {
        if (!query.trim()) return text

        const searchQuery = query.trim()
        const regex = new RegExp(`(${searchQuery})`, 'gi')

        return text.replace(regex, '<mark class="scripture-highlight">$1</mark>')
      }
    }),
    {
      name: 'catholic-defender-search-store',
      storage: createJSONStorage(() => {
        // Use IndexedDB for persistence
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          return {
            getItem: async (name) => {
              try {
                const result = await db.cache.get(name)
                return result?.data || null
              } catch {
                return null
              }
            },
            setItem: async (name, value) => {
              try {
                await db.cache.set(name, JSON.parse(value), 24 * 60 * 60) // 24 hours TTL
              } catch (error) {
                console.error('Failed to persist search state:', error)
              }
            },
            removeItem: async (name) => {
              try {
                await db.cache.remove(name)
              } catch (error) {
                console.error('Failed to remove persisted search state:', error)
              }
            }
          }
        }
        // Fallback to localStorage
        return localStorage
      }),
      partialize: (state) => ({
        // Only persist search history and filters
        searchHistory: state.searchHistory,
        filters: state.filters
      }),
      version: 1
    }
  )
)

// Utility hooks
export const useSearchQuery = () => useSearchStore((state) => state.query)
export const useSearchResults = () => useSearchStore((state) => state.results)
export const useSearchLoading = () => useSearchStore((state) => state.loading)
export const useSearchError = () => useSearchStore((state) => state.error)
export const useSearchFilters = () => useSearchStore((state) => state.filters)
export const useSearchHistory = () => useSearchStore((state) => state.searchHistory)

// Combined hooks
export const useSearchActions = () => useSearchStore((state) => ({
  setQuery: state.setQuery,
  performSearch: state.performSearch,
  clearSearch: state.clearSearch,
  setFilters: state.setFilters,
  resetFilters: state.resetFilters,
  addToHistory: state.addToHistory,
  clearHistory: state.clearHistory,
  getQuerySuggestions: state.getQuerySuggestions,
  highlightText: state.highlightText
}))