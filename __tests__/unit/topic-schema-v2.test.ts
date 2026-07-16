import { describe, it, expect } from 'vitest'
import {
  TopicSchema,
  ObjectionSchema,
} from '@/data/schema/topic.schema'

const baseTopic = {
  id: 'sacred-images',
  category: 'tradition',
  title: 'Sacred Images and Statues',
  question: "Why do Catholics use sacred images? Isn't it idolatry?",
  answer: 'Catholics do not worship statues.',
  tags: ['sacred-images', 'idolatry'],
  difficulty: 'intermediate',
  lang: 'en',
  scripture: [{ reference: 'Exodus 25:18', text: 'Make two cherubim of beaten gold.' }],
  lastUpdated: '2026-07-16',
}

// ── ObjectionSchema ────────────────────────────────────────────────────────────

describe('ObjectionSchema', () => {
  it('parses a valid objection pair', () => {
    const result = ObjectionSchema.parse({
      objection: 'Exodus 20 forbids all images.',
      response: 'God commanded sacred images in Exodus 25.',
    })
    expect(result.objection).toBe('Exodus 20 forbids all images.')
    expect(result.response).toBe('God commanded sacred images in Exodus 25.')
  })

  it('rejects missing objection', () => {
    expect(() => ObjectionSchema.parse({ response: 'some response' })).toThrow()
  })

  it('rejects missing response', () => {
    expect(() => ObjectionSchema.parse({ objection: 'some objection' })).toThrow()
  })
})

// ── TopicSchema — objections ───────────────────────────────────────────────────

describe('TopicSchema — objections field', () => {
  it('accepts topic without objections', () => {
    const result = TopicSchema.parse(baseTopic)
    expect(result.objections).toBeUndefined()
  })

  it('accepts topic with empty objections array', () => {
    const result = TopicSchema.parse({ ...baseTopic, objections: [] })
    expect(result.objections).toHaveLength(0)
  })

  it('parses topic with one objection', () => {
    const result = TopicSchema.parse({
      ...baseTopic,
      objections: [{ objection: 'Catholics pray to statues.', response: 'Catholics pray before statues.' }],
    })
    expect(result.objections).toHaveLength(1)
    expect(result.objections![0].objection).toBe('Catholics pray to statues.')
  })

  it('parses topic with multiple objections', () => {
    const objections = [
      { objection: 'Objection 1', response: 'Response 1' },
      { objection: 'Objection 2', response: 'Response 2' },
      { objection: 'Objection 3', response: 'Response 3' },
    ]
    const result = TopicSchema.parse({ ...baseTopic, objections })
    expect(result.objections).toHaveLength(3)
  })

  it('rejects objection with missing response', () => {
    expect(() =>
      TopicSchema.parse({ ...baseTopic, objections: [{ objection: 'O1' }] })
    ).toThrow()
  })
})

// ── TopicSchema — answerFull ───────────────────────────────────────────────────

describe('TopicSchema — answerFull field', () => {
  it('accepts topic without answerFull', () => {
    const result = TopicSchema.parse(baseTopic)
    expect(result.answerFull).toBeUndefined()
  })

  it('accepts topic with answerFull markdown string', () => {
    const md = '## The First Commandment\n\nGod forbids **idolatry**, not sacred art.'
    const result = TopicSchema.parse({ ...baseTopic, answerFull: md })
    expect(result.answerFull).toBe(md)
  })

  it('accepts topic with both answer and answerFull', () => {
    const result = TopicSchema.parse({
      ...baseTopic,
      answer: 'Short concise answer.',
      answerFull: '## Detailed\n\nFull comprehensive essay here.',
    })
    expect(result.answer).toBe('Short concise answer.')
    expect(result.answerFull).toContain('## Detailed')
  })

  it('accepts empty string as answerFull', () => {
    const result = TopicSchema.parse({ ...baseTopic, answerFull: '' })
    expect(result.answerFull).toBe('')
  })
})

// ── TopicSchema — combined new fields ─────────────────────────────────────────

describe('TopicSchema — combined new fields', () => {
  it('parses a fully-populated topic with all new fields', () => {
    const result = TopicSchema.parse({
      ...baseTopic,
      answerFull: '## Full essay\n\nComprehensive theological content.',
      objections: [
        { objection: 'Exodus 20 forbids images.', response: 'God also commanded images in Exodus 25.' },
        { objection: 'Catholics bow to statues.', response: 'Bowing depends on intention.' },
      ],
    })
    expect(result.answerFull).toContain('## Full essay')
    expect(result.objections).toHaveLength(2)
  })
})
