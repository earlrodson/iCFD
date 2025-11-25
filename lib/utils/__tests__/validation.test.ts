import {
  validateTopic,
  validateHandbookContent,
  validateSettings,
  validateSearchFilters,
  isValidTopic,
  isValidHandbookContent,
  isValidLanguage,
  isValidCategory,
  isValidDifficulty,
  ValidationError,
  sanitizeString,
  sanitizeTopic,
  validateScriptureReference,
  validateCatechismReference
} from '../validation'
import { createMockTopic, createMockHandbookContent } from '../../../jest.setup'

describe('Content Validation Functions', () => {
  describe('validateTopic', () => {
    it('should return valid topic for correct input', () => {
      const validTopic = createMockTopic()

      const result = validateTopic(validTopic)

      expect(result).toEqual(validTopic)
    })

    it('should throw ValidationError for invalid topic', () => {
      const invalidTopic = {
        // Missing required fields
        title: 'Test Topic'
      }

      expect(() => validateTopic(invalidTopic)).toThrow(ValidationError)
    })

    it('should throw ValidationError with detailed errors', () => {
      const invalidTopic = {
        title: 'Test Topic',
        category: 'invalid-category'
      }

      try {
        validateTopic(invalidTopic)
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect(error.details).toBeDefined()
        expect(error.details.some(detail => detail.field === 'category')).toBe(true)
      }
    })
  })

  describe('validateHandbookContent', () => {
    it('should return valid content for correct input', () => {
      const validContent = createMockHandbookContent()

      const result = validateHandbookContent(validContent)

      expect(result).toEqual(validContent)
    })

    it('should throw ValidationError for invalid content', () => {
      const invalidContent = {
        topics: [createMockTopic()]
        // Missing metadata
      }

      expect(() => validateHandbookContent(invalidContent)).toThrow(ValidationError)
    })
  })

  describe('validateSettings', () => {
    it('should return valid settings for correct input', () => {
      const validSettings = {
        language: 'en',
        theme: 'light',
        fontSize: 'medium',
        autoSync: false,
        lastSync: null,
        searchFilters: {
          categories: [],
          difficulties: [],
          showScripture: true,
          showChurchFathers: true
        }
      }

      const result = validateSettings(validSettings)

      expect(result).toEqual(validSettings)
    })

    it('should use default values for missing fields', () => {
      const partialSettings = {
        language: 'tl'
        // Missing other fields
      }

      const result = validateSettings(partialSettings)

      expect(result.language).toBe('tl')
      expect(result.theme).toBe('light') // Default
      expect(result.fontSize).toBe('medium') // Default
    })
  })

  describe('validateSearchFilters', () => {
    it('should return valid filters for correct input', () => {
      const validFilters = {
        query: 'test',
        category: 'sacraments',
        difficulty: 'beginner',
        tags: ['eucharist'],
        language: 'en'
      }

      const result = validateSearchFilters(validFilters)

      expect(result).toEqual(validFilters)
    })

    it('should use default language when not provided', () => {
      const filtersWithoutLanguage = {
        query: 'test'
      }

      const result = validateSearchFilters(filtersWithoutLanguage)

      expect(result.language).toBe('en')
    })
  })
})

describe('Type Guard Functions', () => {
  describe('isValidTopic', () => {
    it('should return true for valid topic', () => {
      const validTopic = createMockTopic()

      expect(isValidTopic(validTopic)).toBe(true)
    })

    it('should return false for invalid topic', () => {
      const invalidTopic = {
        title: 'Test Topic'
        // Missing required fields
      }

      expect(isValidTopic(invalidTopic)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isValidTopic(null)).toBe(false)
      expect(isValidTopic(undefined)).toBe(false)
    })
  })

  describe('isValidHandbookContent', () => {
    it('should return true for valid content', () => {
      const validContent = createMockHandbookContent()

      expect(isValidHandbookContent(validContent)).toBe(true)
    })

    it('should return false for invalid content', () => {
      const invalidContent = {
        topics: [createMockTopic()]
        // Missing metadata
      }

      expect(isValidHandbookContent(invalidContent)).toBe(false)
    })
  })

  describe('isValidLanguage', () => {
    it('should return true for valid language codes', () => {
      expect(isValidLanguage('en')).toBe(true)
      expect(isValidLanguage('tl')).toBe(true)
      expect(isValidLanguage('ceb')).toBe(true)
    })

    it('should return false for invalid language codes', () => {
      expect(isValidLanguage('invalid')).toBe(false)
      expect(isValidLanguage('es')).toBe(false)
      expect(isValidLanguage('')).toBe(false)
    })
  })

  describe('isValidCategory', () => {
    it('should return true for valid categories', () => {
      const validCategories = [
        'sacraments', 'mary', 'papacy', 'salvation',
        'bible', 'saints', 'tradition', 'church-teaching'
      ]

      validCategories.forEach(category => {
        expect(isValidCategory(category)).toBe(true)
      })
    })

    it('should return false for invalid categories', () => {
      expect(isValidCategory('invalid')).toBe(false)
      expect(isValidCategory('')).toBe(false)
    })
  })

  describe('isValidDifficulty', () => {
    it('should return true for valid difficulty levels', () => {
      expect(isValidDifficulty('beginner')).toBe(true)
      expect(isValidDifficulty('intermediate')).toBe(true)
      expect(isValidDifficulty('advanced')).toBe(true)
    })

    it('should return false for invalid difficulty levels', () => {
      expect(isValidDifficulty('invalid')).toBe(false)
      expect(isValidDifficulty('')).toBe(false)
    })
  })
})

describe('ValidationError Class', () => {
  it('should create error with details', () => {
    const details = [
      { field: 'id', message: 'Required', code: 'custom' },
      { field: 'title', message: 'Too short', code: 'custom' }
    ]

    const error = new ValidationError('Validation failed', details)

    expect(error.message).toBe('Validation failed')
    expect(error.details).toEqual(details)
  })

  it('should provide getFieldError method', () => {
    const details = [
      { field: 'id', message: 'Required', code: 'custom' },
      { field: 'title', message: 'Too short', code: 'custom' }
    ]

    const error = new ValidationError('Validation failed', details)

    expect(error.getFieldError('id')).toBe('Required')
    expect(error.getFieldError('title')).toBe('Too short')
    expect(error.getFieldError('nonexistent')).toBeUndefined()
  })

  it('should provide getAllErrors method', () => {
    const details = [
      { field: 'id', message: 'Required', code: 'custom' },
      { field: 'title', message: 'Too short', code: 'custom' }
    ]

    const error = new ValidationError('Validation failed', details)

    const allErrors = error.getAllErrors()
    expect(allErrors).toEqual({
      id: 'Required',
      title: 'Too short'
    })
  })
})

describe('Sanitization Functions', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  test string  ')).toBe('test string')
    })

    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")')
    })

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('')
    })

    it('should handle null/undefined', () => {
      expect(sanitizeString(null as any)).toBe('')
      expect(sanitizeString(undefined as any)).toBe('')
    })
  })

  describe('sanitizeTopic', () => {
    it('should sanitize all text fields', () => {
      const unsanitizedTopic = createMockTopic({
        title: '<b>Test Title</b>',
        question: '<p>Test Question</p>',
        answer: '<div>Test Answer</div>',
        tags: ['<script>tag1</script>', 'tag2']
      })

      const sanitized = sanitizeTopic(unsanitizedTopic)

      expect(sanitized.title).toBe('Test Title')
      expect(sanitized.question).toBe('Test Question')
      expect(sanitized.answer).toBe('Test Answer')
      expect(sanitized.tags).toEqual(['tag1', 'tag2'])
    })

    it('should preserve non-text fields', () => {
      const topic = createMockTopic({
        id: 'test-id',
        category: 'sacraments',
        difficulty: 'beginner',
        lang: 'en'
      })

      const sanitized = sanitizeTopic(topic)

      expect(sanitized.id).toBe('test-id')
      expect(sanitized.category).toBe('sacraments')
      expect(sanitized.difficulty).toBe('beginner')
      expect(sanitized.lang).toBe('en')
    })
  })
})

describe('Validation Utility Functions', () => {
  describe('validateScriptureReference', () => {
    it('should validate correct scripture references', () => {
      const validReferences = [
        'John 3:16',
        '1 Cor 13:4-7',
        'Matthew 28:19-20',
        'Luke 1:37',
        'Romans 8:28 (NABRE)'
      ]

      validReferences.forEach(ref => {
        expect(validateScriptureReference(ref)).toBe(true)
      })
    })

    it('should reject invalid scripture references', () => {
      const invalidReferences = [
        '',
        'Invalid',
        'John',
        '3:16',
        'John 3',
        'John:3:16'
      ]

      invalidReferences.forEach(ref => {
        expect(validateScriptureReference(ref)).toBe(false)
      })
    })
  })

  describe('validateCatechismReference', () => {
    it('should validate correct catechism references', () => {
      const validReferences = [
        'CCC 123',
        'CCC 123-125',
        'CCC 1234',
        'CCC 1234-1236'
      ]

      validReferences.forEach(ref => {
        expect(validateCatechismReference(ref)).toBe(true)
      })
    })

    it('should reject invalid catechism references', () => {
      const invalidReferences = [
        '',
        '123',
        'CCC',
        'CCC',
        'ABC 123',
        'CCC-123'
      ]

      invalidReferences.forEach(ref => {
        expect(validateCatechismReference(ref)).toBe(false)
      })
    })
  })
})