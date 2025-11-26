import MiniSearch from 'minisearch'
import type { Topic } from '@/data/schema/topic.schema'
import { db } from '@/lib/db/indexeddb'
import { contentLoader } from '@/lib/content/loader'
import { searchEngine } from './minisearch-engine'

export interface SearchIndexMetadata {
  version: string
  language: string
  totalTopics: number
  lastUpdated: string
  indexedAt: string
  fields: string[]
}

export class SearchIndexManager {
  private static instance: SearchIndexManager

  static getInstance(): SearchIndexManager {
    if (!SearchIndexManager.instance) {
      SearchIndexManager.instance = new SearchIndexManager()
    }
    return SearchIndexManager.instance
  }

  async buildAllIndexes(): Promise<void> {
    console.log('🔍 Building search indexes for all languages...')

    const languages = ['en', 'tl', 'ceb'] // English, Tagalog, and Cebuano

    for (const language of languages) {
      try {
        await this.buildIndexForLanguage(language)
        console.log(`✅ Built search index for ${language}`)
      } catch (error) {
        console.error(`❌ Failed to build index for ${language}:`, error)
      }
    }

    console.log('🎉 Search index building complete!')
  }

  async buildIndexForLanguage(language: string): Promise<void> {
    console.log(`Building search index for ${language}...`)

    // Load content for language
    const content = await contentLoader.loadContent(language)

    if (!content.topics || content.topics.length === 0) {
      throw new Error(`No content found for language: ${language}`)
    }

    // Initialize search engine with content
    await searchEngine.initialize(language, content.topics)

    // Save metadata
    const metadata: SearchIndexMetadata = {
      version: content.metadata.version,
      language,
      totalTopics: content.topics.length,
      lastUpdated: content.metadata.lastUpdated,
      indexedAt: new Date().toISOString(),
      fields: ['title', 'question', 'answer', 'tags']
    }

    await this.saveIndexMetadata(language, metadata)

    console.log(`Indexed ${content.topics.length} topics for ${language}`)
  }

  async rebuildIndexForLanguage(language: string): Promise<void> {
    console.log(`Rebuilding search index for ${language}...`)

    // Clear existing index
    searchEngine.clearIndex(language)

    // Build new index
    await this.buildIndexForLanguage(language)
  }

  async updateIndex(language: string, topics: Topic[]): Promise<void> {
    console.log(`Updating search index for ${language} with ${topics.length} topics...`)

    // Update or add each topic to the index
    for (const topic of topics) {
      await searchEngine.updateTopic(language, topic)
    }

    console.log(`Updated search index for ${language}`)
  }

  async addTopicsToIndex(language: string, topics: Topic[]): Promise<void> {
    console.log(`Adding ${topics.length} topics to search index for ${language}...`)

    for (const topic of topics) {
      await searchEngine.addTopic(language, topic)
    }

    console.log(`Added topics to search index for ${language}`)
  }

  async removeTopicsFromIndex(language: string, topicIds: string[]): Promise<void> {
    console.log(`Removing ${topicIds.length} topics from search index for ${language}...`)

    for (const topicId of topicIds) {
      await searchEngine.removeTopic(language, topicId)
    }

    console.log(`Removed topics from search index for ${language}`)
  }

  async loadIndexFromDB(language: string): Promise<boolean> {
    console.log(`Loading search index from database for ${language}...`)

    const success = await searchEngine.loadFromDB(language)

    if (success) {
      console.log(`✅ Loaded search index for ${language}`)
    } else {
      console.log(`❌ No search index found for ${language}`)
    }

    return success
  }

  async validateIndex(language: string): Promise<boolean> {
    try {
      const stats = searchEngine.getIndexStats(language)

      if (!stats) {
        return false
      }

      // Check if index has documents
      if (stats.documentCount === 0) {
        console.warn(`Search index for ${language} has no documents`)
        return false
      }

      // Test search functionality
      const results = searchEngine.search('test', language, { fuzzy: 0 })

      console.log(`✅ Search index for ${language} is valid (${stats.documentCount} documents)`)
      return true

    } catch (error) {
      console.error(`❌ Search index validation failed for ${language}:`, error)
      return false
    }
  }

  async validateAllIndexes(): Promise<Record<string, boolean>> {
    const languages = ['en', 'tl', 'ceb']
    const results: Record<string, boolean> = {}

    for (const language of languages) {
      results[language] = await this.validateIndex(language)
    }

    return results
  }

  async getIndexMetadata(language: string): Promise<SearchIndexMetadata | null> {
    try {
      const cached = await db.cache.get(`search-index-metadata-${language}`)

      if (cached) {
        return cached as SearchIndexMetadata
      }

      return null

    } catch (error) {
      console.error(`Failed to get index metadata for ${language}:`, error)
      return null
    }
  }

  private async saveIndexMetadata(language: string, metadata: SearchIndexMetadata): Promise<void> {
    try {
      await db.cache.set(`search-index-metadata-${language}`, metadata, 7 * 24 * 60 * 60) // 7 days TTL
    } catch (error) {
      console.error(`Failed to save index metadata for ${language}:`, error)
    }
  }

  async getIndexStats(): Promise<Record<string, { documentCount: number; termCount: number } | null>> {
    const languages = ['en', 'tl', 'ceb']
    const stats: Record<string, { documentCount: number; termCount: number } | null> = {}

    for (const language of languages) {
      stats[language] = searchEngine.getIndexStats(language)
    }

    return stats
  }

  async isIndexOutdated(language: string): Promise<boolean> {
    try {
      const indexMetadata = await this.getIndexMetadata(language)
      const contentMetadata = await contentLoader.loadMetadata(language)

      if (!indexMetadata || !contentMetadata) {
        return true
      }

      // Compare versions and timestamps
      return indexMetadata.version !== contentMetadata.version ||
             new Date(indexMetadata.lastUpdated) < new Date(contentMetadata.lastUpdated)

    } catch (error) {
      console.error(`Failed to check if index is outdated for ${language}:`, error)
      return true
    }
  }

  async getSearchSuggestions(
    query: string,
    language: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      return await searchEngine.suggest(query, language, limit)
    } catch (error) {
      console.error(`Failed to get search suggestions for ${language}:`, error)
      return []
    }
  }

  async performSearch(
    query: string,
    language: string,
    filters?: {
      category?: string
      difficulty?: string
      tags?: string[]
    }
  ): Promise<any[]> {
    try {
      const searchOptions: any = {}

      if (filters) {
        if (filters.category || filters.difficulty || filters.tags) {
          searchOptions.filter = (topic: Topic) => {
            if (filters.category && topic.category !== filters.category) {
              return false
            }
            if (filters.difficulty && topic.difficulty !== filters.difficulty) {
              return false
            }
            if (filters.tags && filters.tags.length > 0) {
              const hasMatchingTag = filters.tags.some(tag =>
                topic.tags.some(topicTag => topicTag.toLowerCase().includes(tag.toLowerCase()))
              )
              if (!hasMatchingTag) return false
            }
            return true
          }
        }
      }

      return searchEngine.search(query, language, searchOptions)

    } catch (error) {
      console.error(`Search failed for ${language}:`, error)
      return []
    }
  }

  async clearAllIndexes(): Promise<void> {
    console.log('Clearing all search indexes...')

    const languages = ['en', 'tl', 'ceb']

    for (const language of languages) {
      searchEngine.clearIndex(language)
      await db.cache.remove(`search-index-metadata-${language}`)
    }

    console.log('✅ Cleared all search indexes')
  }

  async getHealthStatus(): Promise<{
    availableLanguages: string[]
    totalDocuments: number
    isValid: boolean
    languages: Record<string, boolean>
  }> {
    const availableLanguages = searchEngine.getAvailableLanguages()
    const stats = await this.getIndexStats()
    const validation = await this.validateAllIndexes()

    const totalDocuments = Object.values(stats).reduce(
      (sum, stat) => sum + (stat?.documentCount || 0), 0
    )

    const isValid = Object.values(validation).every(valid => valid)

    return {
      availableLanguages,
      totalDocuments,
      isValid,
      languages: validation
    }
  }
}

// Export singleton instance
export const searchIndexManager = SearchIndexManager.getInstance()

// Export convenience functions
export const buildSearchIndexes = () => searchIndexManager.buildAllIndexes()
export const validateSearchIndexes = () => searchIndexManager.validateAllIndexes()
export const getSearchIndexHealth = () => searchIndexManager.getHealthStatus()
