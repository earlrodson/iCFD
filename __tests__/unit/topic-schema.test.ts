import { describe, it, expect } from 'vitest'
import { TopicSchema, HandbookContentSchema } from '@/data/schema/topic.schema'

const validTopic = {
  id: 'baptism-necessity',
  category: 'sacraments',
  title: 'The Necessity of Baptism',
  question: 'Is baptism necessary?',
  answer: 'Yes.',
  tags: ['baptism'],
  difficulty: 'beginner',
  lang: 'en',
  scripture: [{ reference: 'John 3:5', text: 'Born of water and Spirit.' }],
  lastUpdated: '2024-01-01',
}

describe('TopicSchema', () => {
  it('parses a valid topic', () => {
    const result = TopicSchema.parse(validTopic)
    expect(result.id).toBe('baptism-necessity')
  })

  it('accepts optional fields missing', () => {
    const { catechism, churchFathers, relatedTopics, ...bare } = { ...validTopic, catechism: [], churchFathers: [], relatedTopics: [] }
    const result = TopicSchema.parse(bare)
    expect(result.catechism).toBeUndefined()
  })

  it('rejects unknown category', () => {
    expect(() => TopicSchema.parse({ ...validTopic, category: 'fake-category' })).toThrow()
  })

  it('rejects unknown difficulty', () => {
    expect(() => TopicSchema.parse({ ...validTopic, difficulty: 'expert' })).toThrow()
  })

  it('rejects unknown language', () => {
    expect(() => TopicSchema.parse({ ...validTopic, lang: 'fr' })).toThrow()
  })

  it('rejects missing required field', () => {
    const { title, ...noTitle } = validTopic
    expect(() => TopicSchema.parse(noTitle)).toThrow()
  })
})

describe('HandbookContentSchema', () => {
  it('parses a valid handbook with multiple topics', () => {
    const result = HandbookContentSchema.parse({ topics: [validTopic, { ...validTopic, id: 'papacy' }] })
    expect(result.topics).toHaveLength(2)
  })

  it('rejects handbook with invalid topic inside', () => {
    expect(() =>
      HandbookContentSchema.parse({ topics: [{ ...validTopic, category: 'invalid' }] })
    ).toThrow()
  })

  it('accepts empty topics array', () => {
    const result = HandbookContentSchema.parse({ topics: [] })
    expect(result.topics).toHaveLength(0)
  })
})
