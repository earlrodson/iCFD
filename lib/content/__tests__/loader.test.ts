import { contentLoader } from '../loader'
import { TopicSchema, HandbookContentSchema } from '@/data/schema/topic.schema'
import type { Topic, HandbookContent } from '@/data/schema/topic.schema'
import { createMockTopic, createMockHandbookContent, waitFor } from '../../../jest.setup'

// Mock fetch
global.fetch = jest.fn()

// Mock console methods
const originalConsoleError = console.error
const originalConsoleLog = console.log

describe('ContentLoader', () => {
  let loader: typeof contentLoader

  beforeEach(() => {
    loader = contentLoader
    jest.clearAllMocks()
    // Silence console errors during tests
    console.error = jest.fn()
    console.log = jest.fn()
  })

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError
    console.log = originalConsoleLog
  })

  describe('loadContent', () => {
    it('should load and validate content successfully', async () => {
      const mockContent = createMockHandbookContent()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })

      const result = await loader.loadContent('en')

      expect(result).toEqual(mockContent)
      expect(global.fetch).toHaveBeenCalledWith('/data/content/en/handbook.json')
    })

    it('should cache loaded content', async () => {
      const mockContent = createMockHandbookContent()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })

      // First call
      await loader.loadContent('en')

      // Second call should use cache (no additional fetch)
      await loader.loadContent('en')

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should throw error for invalid content', async () => {
      const invalidContent = {
        topics: [{ title: 'Invalid topic' }] // Missing required fields
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidContent)
      })

      await expect(loader.loadContent('en')).rejects.toThrow()
    })

    it('should throw error for network failure', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(loader.loadContent('en')).rejects.toThrow('Content not available for language: en')
    })

    it('should throw error for HTTP error status', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      })

      await expect(loader.loadContent('en')).rejects.toThrow('Content not available for language: en')
    })

    it('should handle different languages', async () => {
      const mockEnContent = createMockHandbookContent({
        topics: [createMockTopic({ lang: 'en' })]
      })
      const mockTlContent = createMockHandbookContent({
        topics: [createMockTopic({ lang: 'tl' })]
      })

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEnContent)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTlContent)
        })

      const enResult = await loader.loadContent('en')
      const tlResult = await loader.loadContent('tl')

      expect(enResult.topics[0].lang).toBe('en')
      expect(tlResult.topics[0].lang).toBe('tl')
    })
  })

  describe('loadMetadata', () => {
    it('should load metadata successfully', async () => {
      const mockMetadata = {
        version: '1.0.0',
        lastUpdated: '2025-01-15T00:00:00Z',
        totalTopics: 10,
        categories: ['sacraments', 'mary'],
        topicsByCategory: { sacraments: 5, mary: 5 },
        difficulty: { beginner: 3, intermediate: 4, advanced: 3 },
        language: 'en'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetadata)
      })

      const result = await loader.loadMetadata('en')

      expect(result).toEqual(mockMetadata)
      expect(global.fetch).toHaveBeenCalledWith('/data/content/en/metadata.json')
    })

    it('should return default metadata for missing file', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('File not found'))

      const result = await loader.loadMetadata('en')

      expect(result.language).toBe('en')
      expect(result.version).toBe('1.0.0')
      expect(result.totalTopics).toBe(0)
    })
  })

  describe('preloadContent', () => {
    it('should preload multiple languages', async () => {
      const mockEnContent = createMockHandbookContent()
      const mockTlContent = createMockHandbookContent()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEnContent)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTlContent)
        })

      await loader.preloadContent(['en', 'tl'])

      expect(global.fetch).toHaveBeenCalledWith('/data/content/en/handbook.json')
      expect(global.fetch).toHaveBeenCalledWith('/data/content/tl/handbook.json')
    })

    it('should handle partial failures gracefully', async () => {
      const mockEnContent = createMockHandbookContent()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEnContent)
        })
        .mockRejectedValueOnce(new Error('Tagalog content not found'))

      // Should not throw even if one language fails
      await expect(loader.preloadContent(['en', 'tl'])).resolves.toBeUndefined()
    })
  })

  describe('validateContent', () => {
    it('should validate handbook content structure', () => {
      const validContent = createMockHandbookContent()

      expect(() => loader.validateContent(validContent)).not.toThrow()
    })

    it('should throw ValidationError for invalid content', () => {
      const invalidContent = {
        topics: [{ title: 'Invalid topic' }] // Missing required fields
      }

      expect(() => loader.validateContent(invalidContent)).toThrow()
    })
  })

  describe('validateTopic', () => {
    it('should validate topic structure', () => {
      const validTopic = createMockTopic()

      expect(() => loader.validateTopic(validTopic)).not.toThrow()
    })

    it('should throw ValidationError for invalid topic', () => {
      const invalidTopic = {
        title: 'Invalid topic' // Missing required fields
      }

      expect(() => loader.validateTopic(invalidTopic)).toThrow()
    })
  })

  describe('getTopicById', () => {
    beforeEach(() => {
      const mockContent = createMockHandbookContent({
        topics: [
          createMockTopic({ id: 'topic-1' }),
          createMockTopic({ id: 'topic-2', title: 'Another Topic' })
        ]
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })
    })

    it('should return topic when found', async () => {
      await loader.loadContent('en') // Load content first

      const result = await loader.getTopicById('en', 'topic-1')

      expect(result?.id).toBe('topic-1')
      expect(result?.title).toBe('Test Topic Title')
    })

    it('should return null when topic not found', async () => {
      await loader.loadContent('en') // Load content first

      const result = await loader.getTopicById('en', 'non-existent')

      expect(result).toBeNull()
    })

    it('should load content if not cached', async () => {
      // Don't load content first, let getTopicById handle it
      const result = await loader.getTopicById('en', 'topic-1')

      expect(result?.id).toBe('topic-1')
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('getTopicsByCategory', () => {
    beforeEach(() => {
      const mockContent = createMockHandbookContent({
        topics: [
          createMockTopic({ id: 'topic-1', category: 'sacraments' }),
          createMockTopic({ id: 'topic-2', category: 'mary' }),
          createMockTopic({ id: 'topic-3', category: 'sacraments' })
        ]
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })
    })

    it('should filter topics by category', async () => {
      await loader.loadContent('en')

      const sacramentsTopics = await loader.getTopicsByCategory('en', 'sacraments')
      const maryTopics = await loader.getTopicsByCategory('en', 'mary')

      expect(sacramentsTopics).toHaveLength(2)
      expect(maryTopics).toHaveLength(1)
      expect(sacramentsTopics.every(topic => topic.category === 'sacraments')).toBe(true)
    })

    it('should return empty array for category with no topics', async () => {
      await loader.loadContent('en')

      const result = await loader.getTopicsByCategory('en', 'papacy' as any)

      expect(result).toHaveLength(0)
    })
  })

  describe('getTopicsByDifficulty', () => {
    beforeEach(() => {
      const mockContent = createMockHandbookContent({
        topics: [
          createMockTopic({ id: 'topic-1', difficulty: 'beginner' }),
          createMockTopic({ id: 'topic-2', difficulty: 'intermediate' }),
          createMockTopic({ id: 'topic-3', difficulty: 'beginner' })
        ]
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })
    })

    it('should filter topics by difficulty', async () => {
      await loader.loadContent('en')

      const beginnerTopics = await loader.getTopicsByDifficulty('en', 'beginner')
      const intermediateTopics = await loader.getTopicsByDifficulty('en', 'intermediate')

      expect(beginnerTopics).toHaveLength(2)
      expect(intermediateTopics).toHaveLength(1)
    })
  })

  describe('getTopicsByTags', () => {
    beforeEach(() => {
      const mockContent = createMockHandbookContent({
        topics: [
          createMockTopic({
            id: 'topic-1',
            tags: ['eucharist', 'sacraments']
          }),
          createMockTopic({
            id: 'topic-2',
            tags: ['mary', 'prayer']
          }),
          createMockTopic({
            id: 'topic-3',
            tags: ['eucharist', 'mass']
          })
        ]
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })
    })

    it('should filter topics by tags', async () => {
      await loader.loadContent('en')

      const eucharistTopics = await loader.getTopicsByTags('en', ['eucharist'])
      const prayerTopics = await loader.getTopicsByTags('en', ['prayer'])
      const multiTagTopics = await loader.getTopicsByTags('en', ['eucharist', 'mass'])

      expect(eucharistTopics).toHaveLength(2)
      expect(prayerTopics).toHaveLength(1)
      expect(multiTagTopics).toHaveLength(1)
    })
  })

  describe('searchTopics', () => {
    beforeEach(() => {
      const mockContent = createMockHandbookContent({
        topics: [
          createMockTopic({
            id: 'topic-1',
            title: 'Eucharist Explained',
            question: 'What is the Eucharist?',
            answer: 'The Eucharist is...',
            tags: ['eucharist', 'sacraments']
          }),
          createMockTopic({
            id: 'topic-2',
            title: 'Mary Mother of God',
            question: 'Why Mary is Mother of God?',
            answer: 'Mary is Mother of God because...',
            tags: ['mary', 'theotokos']
          })
        ]
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })
    })

    it('should search across title, question, answer, and tags', async () => {
      await loader.loadContent('en')

      const titleResults = await loader.searchTopics('en', 'eucharist')
      const questionResults = await loader.searchTopics('en', 'what is')
      const tagResults = await loader.searchTopics('en', 'sacraments')

      expect(titleResults).toHaveLength(1)
      expect(questionResults).toHaveLength(1)
      expect(tagResults).toHaveLength(1)
    })

    it('should be case insensitive', async () => {
      await loader.loadContent('en')

      const upperCaseResults = await loader.searchTopics('en', 'EUCHARIST')
      const lowerCaseResults = await loader.searchTopics('en', 'eucharist')

      expect(upperCaseResults).toHaveLength(1)
      expect(lowerCaseResults).toHaveLength(1)
    })

    it('should return empty array for no matches', async () => {
      await loader.loadContent('en')

      const results = await loader.searchTopics('en', 'nonexistent')

      expect(results).toHaveLength(0)
    })
  })

  describe('getRelatedTopics', () => {
    beforeEach(() => {
      const mockContent = createMockHandbookContent({
        topics: [
          createMockTopic({
            id: 'topic-1',
            relatedTopics: ['topic-2']
          }),
          createMockTopic({
            id: 'topic-2',
            relatedTopics: ['topic-1', 'topic-3']
          }),
          createMockTopic({
            id: 'topic-3',
            relatedTopics: []
          })
        ]
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })
    })

    it('should return related topics', async () => {
      await loader.loadContent('en')

      const topic1 = createMockTopic({ id: 'topic-1' })
      const relatedTopics = await loader.getRelatedTopics('en', topic1)

      expect(relatedTopics).toHaveLength(1)
      expect(relatedTopics[0].id).toBe('topic-2')
    })

    it('should return empty array for topics with no related topics', async () => {
      await loader.loadContent('en')

      const topic3 = createMockTopic({ id: 'topic-3' })
      const relatedTopics = await loader.getRelatedTopics('en', topic3)

      expect(relatedTopics).toHaveLength(0)
    })
  })

  describe('getRandomTopic', () => {
    beforeEach(() => {
      const mockContent = createMockHandbookContent({
        topics: [
          createMockTopic({ id: 'topic-1' }),
          createMockTopic({ id: 'topic-2' }),
          createMockTopic({ id: 'topic-3' })
        ]
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })
    })

    it('should return a random topic', async () => {
      await loader.loadContent('en')

      const randomTopic = await loader.getRandomTopic('en')

      expect(randomTopic).toBeDefined()
      expect(randomTopic?.id).toMatch(/^topic-\d+$/)
    })

    it('should return null for empty content', async () => {
      const emptyContent = createMockHandbookContent({ topics: [] })
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyContent)
      })

      await loader.loadContent('en')

      const result = await loader.getRandomTopic('en')

      expect(result).toBeNull()
    })
  })

  describe('getFeaturedTopics', () => {
    beforeEach(() => {
      const mockContent = createMockHandbookContent({
        topics: [
          createMockTopic({ id: 'topic-1', category: 'sacraments' }),
          createMockTopic({ id: 'topic-2', category: 'sacraments' }),
          createMockTopic({ id: 'topic-3', category: 'mary' }),
          createMockTopic({ id: 'topic-4', category: 'papacy' })
        ]
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })
    })

    it('should return featured topics for categories', async () => {
      await loader.loadContent('en')

      const featured = await loader.getFeaturedTopics('en', 2)

      expect(featured).toHaveLength(2)
      expect(featured.some(topic => topic.category === 'sacraments')).toBe(true)
      expect(featured.some(topic => topic.category === 'mary')).toBe(true)
    })

    it('should respect count limit', async () => {
      await loader.loadContent('en')

      const featured = await loader.getFeaturedTopics('en', 1)

      expect(featured.length).toBeLessThanOrEqual(1)
    })
  })

  describe('transformTopicForDisplay', () => {
    it('should sanitize and normalize topic data', () => {
      const unsanitizedTopic = createMockTopic({
        title: '<b>Test Title</b>',
        question: '<p>Test Question</p>',
        answer: '<div>Test Answer</div>',
        tags: ['<script>tag1</script>', 'Tag 2']
      })

      const transformed = loader.transformTopicForDisplay(unsanitizedTopic)

      expect(transformed.title).toBe('Test Title')
      expect(transformed.question).toBe('Test Question')
      expect(transformed.answer).toBe('Test Answer')
      expect(transformed.tags).toEqual(['tag1', 'tag 2'])
    })

    it('should preserve non-text fields', () => {
      const topic = createMockTopic()
      const transformed = loader.transformTopicForDisplay(topic)

      expect(transformed.id).toBe(topic.id)
      expect(transformed.category).toBe(topic.category)
      expect(transformed.difficulty).toBe(topic.difficulty)
      expect(transformed.lang).toBe(topic.lang)
    })

    it('should normalize scripture references', () => {
      const topic = createMockTopic({
        scripture: [
          {
            reference: '  John 6:53-56  ',
            text: ' Jesus said...  ',
            version: '  NABRE  '
          }
        ]
      })

      const transformed = loader.transformTopicForDisplay(topic)

      expect(transformed.scripture[0].reference).toBe('John 6:53-56')
      expect(transformed.scripture[0].text).toBe('Jesus said...')
      expect(transformed.scripture[0].version).toBe('NABRE')
    })
  })

  describe('export/import functionality', () => {
    it('should export content as JSON string', async () => {
      const mockContent = createMockHandbookContent()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })

      await loader.loadContent('en')
      const exported = await loader.exportContent('en')

      expect(typeof exported).toBe('string')
      const parsed = JSON.parse(exported)
      expect(parsed).toEqual(mockContent)
    })

    it('should import and validate content', async () => {
      const mockContent = createMockHandbookContent()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })

      await loader.loadContent('en')
      const exported = await loader.exportContent('en')

      // Clear cache
      loader.clearCache()

      await loader.importContent('en', exported)
      const reloaded = await loader.loadContent('en')

      expect(reloaded).toEqual(mockContent)
    })

    it('should throw error for invalid import data', async () => {
      const invalidContent = { topics: [{ title: 'Invalid' }] }

      expect(async () => {
        await loader.importContent('en', JSON.stringify(invalidContent))
      }).rejects.toThrow()
    })
  })

  describe('content versioning', () => {
    it('should detect content updates', async () => {
      const oldMetadata = {
        version: '1.0.0',
        lastUpdated: '2025-01-15T00:00:00Z',
        totalTopics: 10
      }

      const newMetadata = {
        version: '1.1.0',
        lastUpdated: '2025-01-16T00:00:00Z',
        totalTopics: 12
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...createMockHandbookContent(),
            metadata: newMetadata
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(oldMetadata)
        })

      const hasUpdate = await loader.hasContentUpdate('en')
      expect(hasUpdate).toBe(true)
    })

    it('should handle same version correctly', async () => {
      const metadata = {
        version: '1.0.0',
        lastUpdated: '2025-01-15T00:00:00Z',
        totalTopics: 10
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...createMockHandbookContent(),
            metadata
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(metadata)
        })

      const hasUpdate = await loader.hasContentUpdate('en')
      expect(hasUpdate).toBe(false)
    })
  })

  describe('clearCache', () => {
    it('should clear content cache', async () => {
      const mockContent = createMockHandbookContent()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContent)
      })

      // Load content to cache it
      await loader.loadContent('en')

      // Clear cache
      loader.clearCache()

      // Verify cache is cleared by checking fetch is called again
      await loader.loadContent('en')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('getAvailableLanguages', () => {
    it('should return available languages', () => {
      const languages = loader.getAvailableLanguages()

      expect(languages).toEqual(['en', 'tl', 'ceb'])
      expect(languages).toContain('en')
      expect(languages).toContain('tl')
      expect(languages).toContain('ceb')
    })
  })
})