import MiniSearch from 'minisearch'
import type { Topic } from '@/data/schema/topic.schema'
import { db } from '@/lib/db/indexeddb'

export interface SearchOptions {
  fuzzy?: number
  prefix?: boolean
  boost?: {
    title?: number
    question?: number
    answer?: number
    tags?: number
  }
  filter?: (topic: Topic) => boolean
}

export interface SearchResult {
  id: string
  score: number
  terms: string[]
  matchData: Record<string, any>
  topic: Topic
}

export class SearchEngine {
  private searchIndexes = new Map<string, MiniSearch>()
  private topicsMap = new Map<string, Map<string, Topic>>()
  private defaultOptions: SearchOptions = {
    fuzzy: 0.2,
    prefix: true,
    boost: {
      title: 3,
      question: 1,
      answer: 1,
      tags: 2
    }
  }

  constructor() {
    // Initialize with default search configuration
  }

  async initialize(language: string, topics: Topic[]): Promise<void> {
    // Store topics for retrieval after search
    const topicMap = new Map<string, Topic>()
    topics.forEach(t => topicMap.set(t.id, t))
    this.topicsMap.set(language, topicMap)

    // Create MiniSearch instance for language
    const miniSearch = new MiniSearch({
      fields: ['title', 'question', 'answer', 'tags'],
      storeFields: ['id', 'title', 'category', 'difficulty', 'lang', 'tags'],
      searchOptions: {
        fuzzy: this.defaultOptions.fuzzy,
        prefix: this.defaultOptions.prefix,
        boost: this.defaultOptions.boost,
        combineWith: 'OR'
      },
      extractField: (document, fieldName) => {
        // Extract and normalize text for search
        const value = (document as any)[fieldName]
        if (Array.isArray(value)) {
          return value.join(' ').toLowerCase()
        }
        return (value || '').toString().toLowerCase()
      }
    })

    // Add topics to the search index
    if (topics.length > 0) {
      miniSearch.addAll(topics)
    }

    // Store of search index
    this.searchIndexes.set(language, miniSearch)

    // Save to IndexedDB for persistence
    await this.saveIndexToDB(language, miniSearch)
  }

  async loadFromDB(language: string): Promise<boolean> {
    try {
      const indexData = await db.searchIndex.get(language)

      if (!indexData || !indexData.index) {
        return false
      }

      const miniSearch = MiniSearch.loadJSON(indexData.index, {
        fields: ['title', 'question', 'answer', 'tags'],
        storeFields: ['id', 'title', 'category', 'difficulty', 'lang', 'tags'],
        searchOptions: {
          fuzzy: this.defaultOptions.fuzzy,
          prefix: this.defaultOptions.prefix,
          boost: this.defaultOptions.boost
        },
        extractField: (document, fieldName) => {
          // Extract and normalize text for search
          const value = (document as any)[fieldName]
          if (Array.isArray(value)) {
            return value.join(' ').toLowerCase()
          }
          return (value || '').toString().toLowerCase()
        }
      })
      this.searchIndexes.set(language, miniSearch)

      return true
    } catch (error) {
      console.error('Failed to load search index from DB:', error)
      return false
    }
  }

  search(
    query: string,
    language: string,
    options: SearchOptions = {}
  ): SearchResult[] {
    const miniSearch = this.searchIndexes.get(language)

    if (!miniSearch) {
      console.warn(`No search index found for language: ${language}`)
      return []
    }

    if (!query.trim()) {
      return []
    }

    try {
      // Merge default options with provided options
      const searchOptions = {
        ...this.defaultOptions,
        ...options,
        boost: {
          ...this.defaultOptions.boost,
          ...options.boost
        }
      }

      // Perform search
      const results = miniSearch.search(query, {
        fuzzy: searchOptions.fuzzy,
        prefix: searchOptions.prefix,
        boost: searchOptions.boost,
        filter: searchOptions.filter as any
      })

      // Convert to SearchResult format with full topic data
      const searchResults: SearchResult[] = results
        .map(result => {
          const topic = this.getTopicById(result.id, language)
          if (!topic) return null
          return {
            id: result.id,
            score: result.score,
            terms: result.terms,
            matchData: result.matchData,
            topic
          }
        })
        .filter((result): result is SearchResult => result !== null)

      return searchResults

    } catch (error) {
      console.error('Search failed:', error)
      return []
    }
  }

  async suggest(
    query: string,
    language: string,
    limit: number = 5
  ): Promise<string[]> {
    const miniSearch = this.searchIndexes.get(language)

    if (!miniSearch || query.length < 2) {
      return []
    }

    try {
      // Auto-suggest functionality
      const suggestions = miniSearch.autoSuggest(query, {
        prefix: true,
        fuzzy: 0.1
      })

      return suggestions.slice(0, limit).map(suggestion => suggestion.suggestion)

    } catch (error) {
      console.error('Auto-suggest failed:', error)
      return []
    }
  }

  async addTopic(language: string, topic: Topic): Promise<void> {
    const miniSearch = this.searchIndexes.get(language)

    if (miniSearch) {
      miniSearch.add(topic)
      await this.saveIndexToDB(language, miniSearch)
    }
  }

  async removeTopic(language: string, topicId: string): Promise<void> {
    const miniSearch = this.searchIndexes.get(language)

    if (miniSearch) {
      miniSearch.discard(topicId)
      await this.saveIndexToDB(language, miniSearch)
    }
  }

  async updateTopic(language: string, topic: Topic): Promise<void> {
    const miniSearch = this.searchIndexes.get(language)

    if (miniSearch) {
      // Remove and re-add to update the index
      miniSearch.discard(topic.id)
      miniSearch.add(topic)
      await this.saveIndexToDB(language, miniSearch)
    }
  }

  async reindex(language: string, topics: Topic[]): Promise<void> {
    // Update topic map
    const topicMap = new Map<string, Topic>()
    topics.forEach(t => topicMap.set(t.id, t))
    this.topicsMap.set(language, topicMap)

    // Completely rebuild of index for language
    const miniSearch = new MiniSearch({
      fields: ['title', 'question', 'answer', 'tags'],
      storeFields: ['id', 'title', 'category', 'difficulty', 'lang', 'tags'],
      searchOptions: {
        fuzzy: this.defaultOptions.fuzzy,
        prefix: this.defaultOptions.prefix,
        boost: this.defaultOptions.boost
      },
      extractField: (document, fieldName) => {
        const value = (document as any)[fieldName]
        if (Array.isArray(value)) {
          return value.join(' ').toLowerCase()
        }
        return (value || '').toString().toLowerCase()
      }
    })

    if (topics.length > 0) {
      miniSearch.addAll(topics)
    }

    this.searchIndexes.set(language, miniSearch)
    await this.saveIndexToDB(language, miniSearch)
  }

  private async saveIndexToDB(language: string, miniSearch: MiniSearch): Promise<void> {
    try {
      const indexData = {
        index: miniSearch.toJSON(),
        version: '1.0.0',
        timestamp: Date.now()
      }

      await db.searchIndex.set(language, indexData.index, indexData.version)
    } catch (error) {
      console.error('Failed to save search index to DB:', error)
    }
  }

  private getTopicById(topicId: string, language: string): Topic | null {
    return this.topicsMap.get(language)?.get(topicId) ?? null
  }

  getIndexStats(language: string): { documentCount: number; termCount: number } | null {
    const miniSearch = this.searchIndexes.get(language)

    if (!miniSearch) {
      return null
    }

    return {
      documentCount: miniSearch.documentCount,
      termCount: Object.keys((miniSearch as any).termFrequency || {}).length
    }
  }

  getAvailableLanguages(): string[] {
    return Array.from(this.searchIndexes.keys())
  }

  isLanguageSupported(language: string): boolean {
    return this.searchIndexes.has(language)
  }

  clearIndex(language: string): void {
    this.searchIndexes.delete(language)
  }

  clearAllIndexes(): void {
    this.searchIndexes.clear()
  }
}

// Export singleton instance
export const searchEngine = new SearchEngine()

// Export utility functions
export const createSearchEngine = (): SearchEngine => new SearchEngine()
export const getSearchEngine = (): SearchEngine => searchEngine
