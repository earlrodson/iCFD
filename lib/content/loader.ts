import type { Topic, HandbookContent } from '@/data/schema/topic.schema'
import { TopicSchema, HandbookContentSchema } from '@/data/schema/topic.schema'
import { z } from 'zod'

export interface ContentMetadata {
  version: string
  lastUpdated: string
  totalTopics: number
  categories: string[]
  topicsByCategory: Record<string, number>
  difficulty: Record<string, number>
  language: string
}

export class ContentLoader {
  private static instance: ContentLoader
  private contentCache = new Map<string, HandbookContent>()

  static getInstance(): ContentLoader {
    if (!ContentLoader.instance) {
      ContentLoader.instance = new ContentLoader()
    }
    return ContentLoader.instance
  }

  async loadContent(language: string): Promise<HandbookContent> {
    // Check cache first
    if (this.contentCache.has(language)) {
      return this.contentCache.get(language)!
    }

    try {
      // Load content from JSON file
      const response = await fetch(`/data/content/${language}/handbook.json`)

      if (!response.ok) {
        throw new Error(`Failed to load content for ${language}: ${response.statusText}`)
      }

      const data = await response.json()

      // Validate content schema
      const validatedData = HandbookContentSchema.parse(data)

      // Cache validated content
      this.contentCache.set(language, validatedData)

      return validatedData
    } catch (error) {
      console.error(`Failed to load content for ${language}:`, error)
      throw new Error(`Content not available for language: ${language}`)
    }
  }

  async loadMetadata(language: string): Promise<ContentMetadata> {
    try {
      const response = await fetch(`/data/content/${language}/metadata.json`)

      if (!response.ok) {
        throw new Error(`Failed to load metadata for ${language}: ${response.statusText}`)
      }

      const data = await response.json()
      return data as ContentMetadata
    } catch (error) {
      console.error(`Failed to load metadata for ${language}:`, error)

      // Return default metadata if file doesn't exist
      return {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        totalTopics: 0,
        categories: [],
        topicsByCategory: {},
        difficulty: { beginner: 0, intermediate: 0, advanced: 0 },
        language
      }
    }
  }

  async preloadContent(languages: string[] = ['en', 'tl']): Promise<void> {
    const promises = languages.map(lang => this.loadContent(lang))
    await Promise.allSettled(promises)
  }

  async validateContent(content: unknown): Promise<HandbookContent> {
    try {
      return HandbookContentSchema.parse(content)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Content validation errors:', error.errors)
        throw new Error(`Invalid content structure: ${error.message}`)
      }
      throw error
    }
  }

  async validateTopic(topic: unknown): Promise<Topic> {
    try {
      return TopicSchema.parse(topic)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Topic validation errors:', error.errors)
        throw new Error(`Invalid topic structure: ${error.message}`)
      }
      throw error
    }
  }

  clearCache(): void {
    this.contentCache.clear()
  }

  getAvailableLanguages(): string[] {
    return ['en', 'tl', 'ceb'] // Based on our content structure
  }

  async getTopicById(language: string, topicId: string): Promise<Topic | null> {
    const content = await this.loadContent(language)
    return content.topics.find(topic => topic.id === topicId) || null
  }

  async getTopicsByCategory(language: string, category: string): Promise<Topic[]> {
    const content = await this.loadContent(language)
    return content.topics.filter(topic => topic.category === category)
  }

  async getTopicsByDifficulty(language: string, difficulty: string): Promise<Topic[]> {
    const content = await this.loadContent(language)
    return content.topics.filter(topic => topic.difficulty === difficulty)
  }

  async getTopicsByTags(language: string, tags: string[]): Promise<Topic[]> {
    const content = await this.loadContent(language)
    return content.topics.filter(topic =>
      tags.some(tag => topic.tags.includes(tag))
    )
  }

  async searchTopics(language: string, query: string): Promise<Topic[]> {
    const content = await this.loadContent(language)
    const normalizedQuery = query.toLowerCase()

    return content.topics.filter(topic => {
      const answerText = typeof topic.answer === 'string'
        ? topic.answer
        : `${topic.answer.summary} ${topic.answer.full}`

      return (
        topic.title.toLowerCase().includes(normalizedQuery) ||
        topic.question.toLowerCase().includes(normalizedQuery) ||
        answerText.toLowerCase().includes(normalizedQuery) ||
        topic.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
      )
    })
  }

  async getRelatedTopics(language: string, topic: Topic): Promise<Topic[]> {
    if (!topic.relatedTopics || topic.relatedTopics.length === 0) {
      return []
    }

    const content = await this.loadContent(language)
    return content.topics.filter(t =>
      topic.relatedTopics!.includes(t.id)
    )
  }

  async getRandomTopic(language: string): Promise<Topic | null> {
    const content = await this.loadContent(language)
    if (content.topics.length === 0) return null

    const randomIndex = Math.floor(Math.random() * content.topics.length)
    return content.topics[randomIndex]
  }

  async getFeaturedTopics(language: string, count: number = 3): Promise<Topic[]> {
    const content = await this.loadContent(language)

    // For now, return a mix of topics from different categories
    const categories = ['sacraments', 'mary', 'papacy', 'salvation']
    const featuredTopics: Topic[] = []

    for (const category of categories) {
      const categoryTopics = content.topics.filter(t => t.category === category)
      if (categoryTopics.length > 0) {
        const randomTopic = categoryTopics[Math.floor(Math.random() * categoryTopics.length)]
        featuredTopics.push(randomTopic)
      }
    }

    return featuredTopics.slice(0, count)
  }

  // Content transformation utilities
  transformTopicForDisplay(topic: Topic): Topic {
    return {
      ...topic,
      scripture: topic.scripture?.map(ref => ({
        ...ref,
        text: ref.text.trim(),
        reference: ref.reference.trim()
      })),
      tags: topic.tags.map(tag => tag.toLowerCase())
    }
  }

  // Content export/import utilities
  async exportContent(language: string): Promise<HandbookContent> {
    return this.loadContent(language)
  }

  async importContent(language: string, content: HandbookContent): Promise<void> {
    const validatedContent = await this.validateContent(content)
    this.contentCache.set(language, validatedContent)
  }

  // Content versioning utilities
  async hasContentUpdate(language: string, currentVersion?: string): Promise<boolean> {
    try {
      const metadata = await this.loadMetadata(language)
      return !currentVersion || metadata.version !== currentVersion
    } catch {
      return false
    }
  }

  async getContentVersion(language: string): Promise<string | null> {
    try {
      const metadata = await this.loadMetadata(language)
      return metadata.version
    } catch {
      return null
    }
  }
}

// Export singleton instance
export const contentLoader = ContentLoader.getInstance()

// Export convenience functions
export const loadContent = (language: string) => contentLoader.loadContent(language)
export const loadMetadata = (language: string) => contentLoader.loadMetadata(language)
export const getTopicById = (language: string, topicId: string) =>
  contentLoader.getTopicById(language, topicId)
export const searchTopics = (language: string, query: string) =>
  contentLoader.searchTopics(language, query)