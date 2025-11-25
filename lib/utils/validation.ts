import { z } from 'zod'
import type { Topic, HandbookContent } from '@/data/schema/topic.schema'

// Re-export schemas for external use
export { TopicSchema, HandbookContentSchema } from '@/data/schema/topic.schema'

// Extended validation schemas
export const SettingsSchema = z.object({
  language: z.enum(['en', 'tl', 'ceb']).default('en'),
  theme: z.enum(['light', 'dark', 'system']).default('light'),
  fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  autoSync: z.boolean().default(false),
  lastSync: z.string().nullable().default(null),
  searchFilters: z.object({
    categories: z.array(z.string()).default([]),
    difficulties: z.array(z.string()).default([]),
    showScripture: z.boolean().default(true),
    showChurchFathers: z.boolean().default(true)
  }).default({
    categories: [],
    difficulties: [],
    showScripture: true,
    showChurchFathers: true
  })
})

export const FavoriteSchema = z.object({
  topicId: z.string().min(1),
  addedAt: z.number().min(0),
  syncedToCloud: z.boolean().default(false)
})

export const SearchFilterSchema = z.object({
  query: z.string().optional(),
  category: z.enum(['sacraments', 'mary', 'papacy', 'salvation', 'bible', 'saints', 'tradition', 'church-teaching']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z.array(z.string()).optional(),
  language: z.enum(['en', 'tl', 'ceb']).default('en')
})

export const ScriptureReferenceSchema = z.object({
  reference: z.string().min(1),
  text: z.string().min(1),
  version: z.string().optional()
})

export const ChurchFatherQuoteSchema = z.object({
  author: z.string().min(1),
  quote: z.string().min(1),
  source: z.string().min(1)
})

// Custom validation functions
export const validateTopic = (data: unknown): Topic => {
  try {
    return TopicSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedError = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      throw new ValidationError('Invalid topic data', formattedError)
    }
    throw error
  }
}

export const validateHandbookContent = (data: unknown): HandbookContent => {
  try {
    return HandbookContentSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedError = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      throw new ValidationError('Invalid handbook content', formattedError)
    }
    throw error
  }
}

export const validateSettings = (data: unknown) => {
  try {
    return SettingsSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedError = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      throw new ValidationError('Invalid settings data', formattedError)
    }
    throw error
  }
}

export const validateSearchFilters = (data: unknown) => {
  try {
    return SearchFilterSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedError = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      throw new ValidationError('Invalid search filters', formattedError)
    }
    throw error
  }
}

// Type guards
export const isValidTopic = (data: unknown): data is Topic => {
  try {
    TopicSchema.parse(data)
    return true
  } catch {
    return false
  }
}

export const isValidHandbookContent = (data: unknown): data is HandbookContent => {
  try {
    HandbookContentSchema.parse(data)
    return true
  } catch {
    return false
  }
}

export const isValidLanguage = (lang: unknown): lang is 'en' | 'tl' | 'ceb' => {
  return ['en', 'tl', 'ceb'].includes(lang as string)
}

export const isValidCategory = (category: unknown): category is Topic['category'] => {
  return ['sacraments', 'mary', 'papacy', 'salvation', 'bible', 'saints', 'tradition', 'church-teaching'].includes(category as string)
}

export const isValidDifficulty = (difficulty: unknown): difficulty is Topic['difficulty'] => {
  return ['beginner', 'intermediate', 'advanced'].includes(difficulty as string)
}

// Validation error class
export class ValidationError extends Error {
  public readonly details: Array<{
    field: string
    message: string
    code: string
  }>

  constructor(message: string, details: Array<{ field: string; message: string; code: string }>) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }

  getFieldError(field: string): string | undefined {
    const error = this.details.find(err => err.field === field)
    return error?.message
  }

  getAllErrors(): Record<string, string> {
    return this.details.reduce((acc, err) => {
      acc[err.field] = err.message
      return acc
    }, {} as Record<string, string>)
  }
}

// Utility functions for validation
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '')
}

export const sanitizeTopic = (topic: Topic): Topic => {
  return {
    ...topic,
    title: sanitizeString(topic.title),
    question: sanitizeString(topic.question),
    answer: sanitizeString(topic.answer),
    tags: topic.tags.map(tag => sanitizeString(tag.toLowerCase())),
    scripture: topic.scripture.map(ref => ({
      ...ref,
      reference: sanitizeString(ref.reference),
      text: sanitizeString(ref.text)
    })),
    churchFathers: topic.churchFathers?.map(father => ({
      ...father,
      author: sanitizeString(father.author),
      quote: sanitizeString(father.quote),
      source: sanitizeString(father.source)
    }))
  }
}

export const validateScriptureReference = (reference: string): boolean => {
  // Basic validation for scripture references (e.g., "John 3:16", "1 Cor 13:4-7")
  const scripturePattern = /^[0-9]*\s*[A-Za-z]+\s*[0-9]+:[0-9-]+(?:\s*\(.*\))?$/
  return scripturePattern.test(reference.trim())
}

export const validateCatechismReference = (reference: string): boolean => {
  // Basic validation for CCC references (e.g., "CCC 1234", "CCC 1234-1236")
  const catechismPattern = /^CCC\s*\d+(?:-\d+)?$/
  return catechismPattern.test(reference.trim())
}

// Type utilities
export type ValidatedSettings = z.infer<typeof SettingsSchema>
export type ValidatedSearchFilters = z.infer<typeof SearchFilterSchema>
export type ValidatedFavorite = z.infer<typeof FavoriteSchema>