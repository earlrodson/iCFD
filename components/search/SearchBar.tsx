'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useSearchStore } from '@/store/useSearchStore'
import { useSearchActions } from '@/store/useSearchStore'
import { contentLoader } from '@/lib/content/loader'
import { useAppStore } from '@/store/useAppStore'
import type { Topic } from '@/data/schema/topic.schema'

interface SearchBarProps {
  onSearch?: (query: string, results: Topic[]) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  showSuggestions?: boolean
  maxSuggestions?: number
}

export function SearchBar({
  onSearch,
  placeholder = "Search apologetics topics...",
  className,
  autoFocus = false,
  showSuggestions = true,
  maxSuggestions = 5
}: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestionsList, setShowSuggestionsList] = useState(false)
  const [allTopics, setAllTopics] = useState<Topic[]>([])

  const { query, results, loading } = useSearchStore()
  const { setQuery, performSearch, clearSearch } = useSearchActions()
  const { getQuerySuggestions } = useSearchActions()
  const { currentLanguage: language } = useAppStore()

  // Debounce the search query
  const debouncedQuery = useDebounce(localQuery, 300)

  // Load all topics for search functionality
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const content = await contentLoader.loadContent(language)
        setAllTopics(content.topics)
      } catch (error) {
        console.error('Failed to load topics for search:', error)
      }
    }
    loadTopics()
  }, [language])

  // Update global search state when local query changes
  useEffect(() => {
    setQuery(localQuery)
  }, [localQuery, setQuery])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch(debouncedQuery, allTopics, { language })
    } else {
      clearSearch()
      setSuggestions([])
      setShowSuggestionsList(false)
    }
  }, [debouncedQuery, performSearch, clearSearch, allTopics, language])

  // Update suggestions based on query
  useEffect(() => {
    if (showSuggestions && localQuery.length >= 2 && allTopics.length > 0) {
      const newSuggestions = getQuerySuggestions(localQuery, allTopics)
      setSuggestions(newSuggestions.slice(0, maxSuggestions))
      setShowSuggestionsList(newSuggestions.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestionsList(false)
    }
  }, [localQuery, showSuggestions, maxSuggestions, allTopics, getQuerySuggestions])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value)
  }

  const handleClear = () => {
    setLocalQuery('')
    clearSearch()
    setShowSuggestionsList(false)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setLocalQuery(suggestion)
    setShowSuggestionsList(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestionsList(false)
    } else if (e.key === 'Enter') {
      setShowSuggestionsList(false)
      if (onSearch) {
        onSearch(localQuery, results)
      }
    }
  }

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={localQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
          onFocus={() => setShowSuggestionsList(suggestions.length > 0)}
          data-testid="search-input"
          role="searchbox"
          aria-label="Search apologetics topics"
        />

        {(localQuery || loading) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
            disabled={loading}
            data-testid="search-clear-button"
            aria-label="Clear search"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestionsList && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-auto" data-testid="search-suggestions">
          <ul className="py-1" role="listbox">
            {suggestions.map((suggestion, index) => (
              <li key={index}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                  data-testid="suggestion-item"
                  role="option"
                >
                  <div className="flex items-center space-x-2">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-full left-0 right-0 mt-1 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Searching...</span>
          </div>
        </div>
      )}
    </div>
  )
}