'use client'

import { create } from 'zustand'
import { searchEngine } from '@/lib/search/engine'
import type { Topic, Category, Difficulty } from '@/data/schema/topic.schema'

interface SearchFilters {
  category: Category | ''
  difficulty: Difficulty | ''
}

interface SearchState {
  query: string
  results: string[]
  filters: SearchFilters

  setQuery: (q: string) => void
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void
  clearFilters: () => void

  getFilteredTopics: (topics: Topic[]) => Topic[]
}

export const useSearchStore = create<SearchState>()((set, get) => ({
  query: '',
  results: [],
  filters: { category: '', difficulty: '' },

  setQuery: (q) => {
    const results = searchEngine.search(q).map((r) => r.id)
    set({ query: q, results })
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }))
  },

  clearFilters: () => {
    set({ filters: { category: '', difficulty: '' }, query: '', results: [] })
  },

  getFilteredTopics: (topics) => {
    const { query, results, filters } = get()

    let filtered = topics

    // Apply text search
    if (query.trim()) {
      const resultSet = new Set(results)
      filtered = filtered.filter((t) => resultSet.has(t.id))
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter((t) => t.category === filters.category)
    }

    // Apply difficulty filter
    if (filters.difficulty) {
      filtered = filtered.filter((t) => t.difficulty === filters.difficulty)
    }

    return filtered
  },
}))
