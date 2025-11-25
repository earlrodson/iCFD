import {
  highlightText,
  excerptText,
  debounce,
  throttle,
  copyToClipboard,
  downloadFile,
  isValidUrl,
  sanitizeUrl
} from '../utils'
import { createMockTopic } from '../../../jest.setup'

describe('Search Utilities', () => {
  describe('highlightText', () => {
    it('should return original text when query is empty', () => {
      const text = 'This is a test string'
      const result = highlightText(text, '')

      expect(result).toBe(text)
    })

    it('should highlight matching text', () => {
      const text = 'This is a test string'
      const query = 'test'
      const result = highlightText(text, query)

      expect(result).toBe('This is a <mark class="scripture-highlight">test</mark> string')
    })

    it('should be case insensitive', () => {
      const text = 'This is a Test string'
      const query = 'test'
      const result = highlightText(text, query)

      expect(result).toBe('This is a <mark class="scripture-highlight">Test</mark> string')
    })

    it('should highlight all occurrences', () => {
      const text = 'test test test'
      const query = 'test'
      const result = highlightText(text, query)

      expect(result).toBe('<mark class="scripture-highlight">test</mark> <mark class="scripture-highlight">test</mark> <mark class="scripture-highlight">test</mark>')
    })

    it('should handle special regex characters in query', () => {
      const text = 'This is a test. With dots.'
      const query = '.'
      const result = highlightText(text, query)

      expect(result).toBe('This is a test<mark class="scripture-highlight">.</mark> With dots<mark class="scripture-highlight">.</mark>')
    })

    it('should handle whitespace-only queries', () => {
      const text = 'This is a test string'
      const query = '   '
      const result = highlightText(text, query)

      expect(result).toBe(text)
    })

    it('should not match when query is not found', () => {
      const text = 'This is a test string'
      const query = 'notfound'
      const result = highlightText(text, query)

      expect(result).toBe(text)
    })
  })

  describe('excerptText', () => {
    it('should return original text when shorter than maxLength', () => {
      const text = 'Short text'
      const result = excerptText(text, 20)

      expect(result).toBe(text)
    })

    it('should truncate text and add ellipsis when longer than maxLength', () => {
      const text = 'This is a very long text that should be truncated'
      const result = excerptText(text, 20)

      expect(result).toBe('This is a very long...')
    })

    it('should use default maxLength when not specified', () => {
      const longText = 'a'.repeat(200)
      const result = excerptText(longText)

      expect(result.length).toBeLessThan(155) // 150 + '...'
      expect(result).toMatch(/\.\.\.$/)
    })

    it('should handle empty text', () => {
      const result = excerptText('', 20)

      expect(result).toBe('')
    })

    it('should handle maxLength less than text length', () => {
      const text = 'Short'
      const result = excerptText(text, 3)

      expect(result).toBe('Sho...')
    })

    it('should handle exact length match', () => {
      const text = 'Exactly 20 chars!'
      const result = excerptText(text, 20)

      expect(result).toBe(text)
    })

    it('should not add ellipsis when text is exactly maxLength', () => {
      const text = 'a'.repeat(10)
      const result = excerptText(text, 10)

      expect(result).toBe(text)
      expect(result).not.toMatch(/\.\.\.$/)
    })
  })
})

describe('Performance Utilities', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('debounce', () => {
    it('should delay function execution', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn()
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should cancel previous call when called again within delay', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn()
      jest.advanceTimersByTime(50)
      debouncedFn()
      jest.advanceTimersByTime(50)

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments correctly', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('arg1', 'arg2')
      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should preserve function context', () => {
      const obj = {
        value: 'test',
        method: jest.fn(function() {
          return this.value
        })
      }

      obj.method = debounce(obj.method, 100)
      obj.method()

      jest.advanceTimersByTime(100)

      expect(obj.method).toHaveBeenCalled()
    })
  })

  describe('throttle', () => {
    it('should call function immediately on first call', () => {
      const mockFn = jest.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn()
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should ignore calls within throttle period', () => {
      const mockFn = jest.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn()
      expect(mockFn).toHaveBeenCalledTimes(1)

      throttledFn()
      throttledFn()
      expect(mockFn).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should allow function call after throttle period', () => {
      const mockFn = jest.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn()
      jest.advanceTimersByTime(100)
      throttledFn()

      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('should pass arguments correctly', () => {
      const mockFn = jest.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn('arg1', 'arg2')

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })
})

describe('Clipboard and Download Utilities', () => {
  describe('copyToClipboard', () => {
    beforeEach(() => {
      // Mock navigator.clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
          readText: jest.fn().mockResolvedValue('test'),
        },
      })
    })

    it('should copy text using clipboard API when available', async () => {
      const text = 'Test text to copy'
      const result = await copyToClipboard(text)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text)
      expect(result).toBe(true)
    })

    it('should return false on clipboard API failure', async () => {
      const error = new Error('Clipboard API failed')
      navigator.clipboard.writeText = jest.fn().mockRejectedValue(error)

      const result = await copyToClipboard('test')

      expect(result).toBe(false)
    })

    it('should use fallback method when clipboard API is not available', async () => {
      delete (navigator as any).clipboard

      const mockTextArea = {
        value: '',
        style: { position: '', left: '', top: '' },
        focus: jest.fn(),
        select: jest.fn(),
      }

      const mockCreateElement = jest.spyOn(document, 'createElement')
        .mockReturnValue(mockTextArea as any)
      const mockAppendChild = jest.spyOn(document.body, 'appendChild')
      const mockRemoveChild = jest.spyOn(document.body, 'removeChild')
      const mockExecCommand = jest.spyOn(document, 'execCommand').mockReturnValue(true)

      const result = await copyToClipboard('test')

      expect(mockCreateElement).toHaveBeenCalledWith('textarea')
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockExecCommand).toHaveBeenCalledWith('copy')
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(result).toBe(true)

      mockCreateElement.mockRestore()
      mockAppendChild.mockRestore()
      mockRemoveChild.mockRestore()
      mockExecCommand.mockRestore()
    })

    it('should handle fallback method failure', async () => {
      delete (navigator as any).clipboard

      const mockTextArea = {
        value: '',
        style: { position: '', left: '', top: '' },
        focus: jest.fn(),
        select: jest.fn(),
      }

      const mockCreateElement = jest.spyOn(document, 'createElement')
        .mockReturnValue(mockTextArea as any)
      const mockAppendChild = jest.spyOn(document.body, 'appendChild')
      const mockRemoveChild = jest.spyOn(document.body, 'removeChild')
      const mockExecCommand = jest.spyOn(document, 'execCommand').mockReturnValue(false)

      const result = await copyToClipboard('test')

      expect(result).toBe(false)

      mockCreateElement.mockRestore()
      mockAppendChild.mockRestore()
      mockRemoveChild.mockRestore()
      mockExecCommand.mockRestore()
    })
  })

  describe('downloadFile', () => {
    beforeEach(() => {
      // Mock URL and blob functionality
      global.URL.createObjectURL = jest.fn(() => 'mock-url')
      global.URL.revokeObjectURL = jest.fn()
      global.Blob = jest.fn().mockImplementation((content, options) => ({
        content,
        options,
        size: content[0].length
      })) as any
    })

    it('should create and trigger file download', () => {
      const content = '{"test": "data"}'
      const filename = 'test.json'
      const contentType = 'application/json'

      const mockCreateElement = jest.spyOn(document, 'createElement')
      const mockElement = {
        href: '',
        download: '',
        click: jest.fn(),
      }
      mockCreateElement.mockReturnValue(mockElement as any)

      const mockAppendChild = jest.spyOn(document.body, 'appendChild')
      const mockRemoveChild = jest.spyOn(document.body, 'removeChild')

      downloadFile(content, filename, contentType)

      expect(global.Blob).toHaveBeenCalledWith([content], { type: contentType })
      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(mockElement.href).toBe('mock-url')
      expect(mockElement.download).toBe(filename)
      expect(mockAppendChild).toHaveBeenCalledWith(mockElement)
      expect(mockElement.click).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalledWith(mockElement)
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url')

      mockCreateElement.mockRestore()
      mockAppendChild.mockRestore()
      mockRemoveChild.mockRestore()
    })

    it('should use default content type when not specified', () => {
      const content = 'test content'
      const filename = 'test.txt'

      const mockCreateElement = jest.spyOn(document, 'createElement')
      const mockElement = {
        href: '',
        download: '',
        click: jest.fn(),
      }
      mockCreateElement.mockReturnValue(mockElement as any)

      const mockAppendChild = jest.spyOn(document.body, 'appendChild')
      const mockRemoveChild = jest.spyOn(document.body, 'removeChild')

      downloadFile(content, filename)

      expect(global.Blob).toHaveBeenCalledWith([content], { type: 'application/json' })

      mockCreateElement.mockRestore()
      mockAppendChild.mockRestore()
      mockRemoveChild.mockRestore()
    })
  })
})

describe('URL Utilities', () => {
  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://www.example.com/path',
        'https://example.com?query=value',
        'https://example.com#section',
        'https://example.com:8080/path',
        'https://user:pass@example.com',
        'https://subdomain.example.com',
        'https://example.com/path/to/file.ext',
      ]

      validUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true)
      })
    })

    it('should return false for invalid URLs', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'ftp://example.com',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'example.com', // Missing protocol
        'http//example.com', // Missing colon
        '://example.com', // Missing protocol
        'http://',
        'http://.',
      ]

      invalidUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(false)
      })
    })
  })

  describe('sanitizeUrl', () => {
    it('should return valid HTTP and HTTPS URLs unchanged', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com/path',
        'https://example.com?query=value',
      ]

      validUrls.forEach(url => {
        expect(sanitizeUrl(url)).toBe(url)
      })
    })

    it('should return hash for non-HTTP/HTTPS protocols', () => {
      const dangerousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")',
        'ftp://example.com',
        'file:///path/to/file',
      ]

      dangerousUrls.forEach(url => {
        expect(sanitizeUrl(url)).toBe('#')
      })
    })

    it('should return hash for malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'example.com',
        '',
        'javascript',
        'data:',
      ]

      malformedUrls.forEach(url => {
        expect(sanitizeUrl(url)).toBe('#')
      })
    })
  })
})