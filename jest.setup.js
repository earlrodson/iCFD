// Import jest-dom matchers
require('@testing-library/jest-dom')

// Mock IndexedDB
const indexedDB = require('fake-indexeddb')

Object.defineProperty(window, 'indexedDB', {
  value: indexedDB,
  writable: true
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock service worker registration
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: jest.fn(),
    ready: Promise.resolve({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      postMessage: jest.fn(),
      sync: {
        register: jest.fn(),
        getRegistration: jest.fn(),
        getRegistrations: jest.fn(),
      },
    }),
  },
})

// Mock fetch API
global.fetch = jest.fn()

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(),
})

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
})

// Custom mock for File and FileReader
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.chunks = chunks
    this.name = filename
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    this.type = options.type || ''
  }
}

global.FileReader = class FileReader {
  constructor() {
    this.result = null
    this.error = null
    this.readyState = 0
    this.onload = null
    this.onerror = null
  }

  readAsDataURL = jest.fn().mockImplementation(() => {
    this.readyState = 2
    this.result = 'data:image/png;base64,mock-data'
    this.onload?.(new Event('load'))
  })
}

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('mock-text')),
  },
})

// Suppress console warnings during tests
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

// Setup test environment variables
process.env.NODE_ENV = 'test'

// Global test utilities
global.createMockTopic = (overrides = {}) => ({
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
})

global.createMockHandbookContent = (overrides = {}) => ({
  topics: [global.createMockTopic()],
  metadata: {
    version: '1.0.0',
    lastUpdated: '2025-01-15T00:00:00Z',
    totalTopics: 1
  },
  ...overrides
})

// Module exports for TypeScript imports
module.exports = {
  createMockTopic: global.createMockTopic,
  createMockHandbookContent: global.createMockHandbookContent
}

// Test helpers
global.waitFor = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

global.flushPromises = () => new Promise(resolve => setImmediate(resolve))