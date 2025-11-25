import { z } from 'zod'
import { TopicSchema, HandbookContentSchema } from '../topic.schema'
import type { Topic, HandbookContent } from '../topic.schema'

describe('TopicSchema', () => {
  it('should validate a valid topic object', () => {
    const validTopic = createMockTopic()

    const result = TopicSchema.safeParse(validTopic)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(validTopic)
  })

  it('should reject invalid topic object', () => {
    const invalidTopic = {
      // Missing required fields
      title: 'Test Topic'
    }

    const result = TopicSchema.safeParse(invalidTopic)

    expect(result.success).toBe(false)
    expect(result.error?.issues).toBeDefined()
  })

  it('should validate required fields', () => {
    const topicWithMissingRequired = createMockTopic({
      id: undefined, // Missing required field
    })

    const result = TopicSchema.safeParse(topicWithMissingRequired)

    expect(result.success).toBe(false)
    expect(result.error?.issues.some(issue => issue.path.includes('id'))).toBe(true)
  })

  it('should validate category enum values', () => {
    const validCategories = [
      'sacraments', 'mary', 'papacy', 'salvation',
      'bible', 'saints', 'tradition', 'church-teaching'
    ]

    validCategories.forEach(category => {
      const topic = createMockTopic({ category })
      const result = TopicSchema.safeParse(topic)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid category values', () => {
    const invalidTopic = createMockTopic({
      category: 'invalid-category'
    })

    const result = TopicSchema.safeParse(invalidTopic)

    expect(result.success).toBe(false)
    expect(result.error?.issues.some(issue => issue.path.includes('category'))).toBe(true)
  })

  it('should validate difficulty enum values', () => {
    const validDifficulties = ['beginner', 'intermediate', 'advanced']

    validDifficulties.forEach(difficulty => {
      const topic = createMockTopic({ difficulty })
      const result = TopicSchema.safeParse(topic)
      expect(result.success).toBe(true)
    })
  })

  it('should validate language enum values', () => {
    const validLanguages = ['en', 'tl', 'ceb']

    validLanguages.forEach(lang => {
      const topic = createMockTopic({ lang: lang })
      const result = TopicSchema.safeParse(topic)
      expect(result.success).toBe(true)
    })
  })

  it('should validate scripture array structure', () => {
    const validScripture = [
      {
        reference: 'John 6:53-56',
        text: 'Jesus said to them...',
        version: 'NABRE'
      }
    ]

    const topic = createMockTopic({ scripture: validScripture })
    const result = TopicSchema.safeParse(topic)

    expect(result.success).toBe(true)
  })

  it('should accept optional fields', () => {
    const topicWithoutOptionals = createMockTopic({
      catechism: undefined,
      churchFathers: undefined,
      relatedTopics: undefined
    })

    const result = TopicSchema.safeParse(topicWithoutOptionals)

    expect(result.success).toBe(true)
    expect(result.data?.catechism).toBeUndefined()
    expect(result.data?.churchFathers).toBeUndefined()
    expect(result.data?.relatedTopics).toBeUndefined()
  })

  it('should validate catechism array when present', () => {
    const topic = createMockTopic({
      catechism: ['CCC 1374', 'CCC 1375']
    })

    const result = TopicSchema.safeParse(topic)

    expect(result.success).toBe(true)
    expect(result.data?.catechism).toEqual(['CCC 1374', 'CCC 1375'])
  })

  it('should validate church fathers array structure', () => {
    const validChurchFathers = [
      {
        author: 'St. Augustine',
        quote: 'Test quote',
        source: 'Test source'
      }
    ]

    const topic = createMockTopic({ churchFathers: validChurchFathers })
    const result = TopicSchema.safeParse(topic)

    expect(result.success).toBe(true)
  })

  it('should validate lastUpdated date format', () => {
    const validDate = '2025-01-15T00:00:00Z'
    const topic = createMockTopic({ lastUpdated: validDate })

    const result = TopicSchema.safeParse(topic)

    expect(result.success).toBe(true)
  })
})

describe('HandbookContentSchema', () => {
  it('should validate a valid handbook content object', () => {
    const validContent = createMockHandbookContent()

    const result = HandbookContentSchema.safeParse(validContent)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(validContent)
  })

  it('should reject handbook content without topics array', () => {
    const invalidContent = {
      metadata: {
        version: '1.0.0',
        lastUpdated: '2025-01-15T00:00:00Z',
        totalTopics: 0
      }
    }

    const result = HandbookContentSchema.safeParse(invalidContent)

    expect(result.success).toBe(false)
    expect(result.error?.issues.some(issue => issue.path.includes('topics'))).toBe(true)
  })

  it('should reject handbook content without metadata', () => {
    const invalidContent = {
      topics: [createMockTopic()]
    }

    const result = HandbookContentSchema.safeParse(invalidContent)

    expect(result.success).toBe(false)
    expect(result.error?.issues.some(issue => issue.path.includes('metadata'))).toBe(true)
  })

  it('should validate metadata structure', () => {
    const validMetadata = {
      version: '1.0.0',
      lastUpdated: '2025-01-15T00:00:00Z',
      totalTopics: 1
    }

    const content = createMockHandbookContent({ metadata: validMetadata })
    const result = HandbookContentSchema.safeParse(content)

    expect(result.success).toBe(true)
    expect(result.data?.metadata).toEqual(validMetadata)
  })

  it('should reject invalid metadata fields', () => {
    const invalidMetadata = {
      version: 123, // Should be string
      lastUpdated: '2025-01-15T00:00:00Z',
      totalTopics: '1' // Should be number
    }

    const content = createMockHandbookContent({ metadata: invalidMetadata })
    const result = HandbookContentSchema.safeParse(content)

    expect(result.success).toBe(false)
  })

  it('should validate multiple topics in topics array', () => {
    const multipleTopics = [
      createMockTopic({ id: 'topic-1' }),
      createMockTopic({ id: 'topic-2', category: 'mary' }),
      createMockTopic({ id: 'topic-3', category: 'papacy' })
    ]

    const content = createMockHandbookContent({
      topics: multipleTopics,
      metadata: { totalTopics: 3 }
    })

    const result = HandbookContentSchema.safeParse(content)

    expect(result.success).toBe(true)
    expect(result.data?.topics).toHaveLength(3)
  })
})

// Helper functions for creating test data
function createMockTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'test-topic-1',
    category: 'sacraments',
    title: 'Test Topic Title',
    question: 'Test question about sacraments?',
    answer: 'Test answer with detailed explanation',
    scripture: [
      {
        reference: 'John 6:53-56',
        text: 'Jesus said to them...',
        version: 'NABRE'
      }
    ],
    catechism: ['CCC 1374'],
    churchFathers: [
      {
        author: 'St. Augustine',
        quote: 'Test quote from Church Father',
        source: 'Test source'
      }
    ],
    tags: ['test', 'sacraments', 'eucharist'],
    difficulty: 'beginner',
    lang: 'en',
    relatedTopics: ['related-topic-1'],
    lastUpdated: '2025-01-15T00:00:00Z',
    ...overrides
  }
}

function createMockHandbookContent(overrides: Partial<HandbookContent> = {}): HandbookContent {
  return {
    topics: [createMockTopic()],
    metadata: {
      version: '1.0.0',
      lastUpdated: '2025-01-15T00:00:00Z',
      totalTopics: 1
    },
    ...overrides
  }
}