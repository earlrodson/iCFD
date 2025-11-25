import { dbManager, db } from '../indexeddb'
import type { Topic } from '@/data/schema/topic.schema'
import { createMockTopic } from '../../../jest.setup'
import { openDB, deleteDB } from 'idb'

// Mock the 'idb' module
jest.mock('idb', () => ({
  openDB: jest.fn(),
  deleteDB: jest.fn(),
}))

const mockOpenDB = openDB as jest.MockedFunction<typeof openDB>
const mockDeleteDB = deleteDB as jest.MockedFunction<typeof deleteDB>

describe('DatabaseManager', () => {
  let mockDB: any
  let mockTransaction: any
  let mockObjectStore: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock objects
    mockObjectStore = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllFromIndex: jest.fn(),
      add: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      createIndex: jest.fn(),
    }

    mockTransaction = {
      objectStore: jest.fn(() => mockObjectStore),
      done: Promise.resolve(),
    }

    mockDB = {
      close: jest.fn(),
      get: jest.fn(() => Promise.resolve()),
      getAll: jest.fn(() => Promise.resolve([])),
      getAllFromIndex: jest.fn(() => Promise.resolve([])),
      add: jest.fn(() => Promise.resolve()),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve()),
      transaction: jest.fn(() => mockTransaction),
      objectStoreNames: {
        contains: jest.fn(),
      },
    }

    // Mock openDB to return our mock database
    mockOpenDB.mockResolvedValue(mockDB)

    // Reset singleton instance
    (dbManager as any).db = null
  })

  afterEach(async () => {
    await dbManager.close()
  })

  describe('getDB', () => {
    it('should open database connection', async () => {
      const db = await dbManager.getDB()

      expect(mockOpenDB).toHaveBeenCalledWith(
        'catholic-defender',
        1,
        expect.any(Object)
      )
      expect(db).toBe(mockDB)
    })

    it('should reuse existing database connection', async () => {
      await dbManager.getDB()
      await dbManager.getDB()

      expect(mockOpenDB).toHaveBeenCalledTimes(1)
    })

    it('should set up database schema in upgrade callback', async () => {
      await dbManager.getDB()

      const upgradeCallback = mockOpenDB.mock.calls[0][2].upgrade
      const mockUpgradeDB = {
        objectStoreNames: {
          contains: jest.fn().mockReturnValue(false),
        },
        createObjectStore: jest.fn().mockReturnValue({
          createIndex: jest.fn(),
        }),
      }

      upgradeCallback(mockUpgradeDB, 0, 1)

      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledTimes(5)
      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('topics', { keyPath: 'id' })
      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('favorites', { keyPath: 'topicId' })
      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('settings', { keyPath: 'key' })
      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('searchIndex', { keyPath: 'lang' })
      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('cache', { keyPath: 'key' })
    })

    it('should not recreate stores if they already exist', async () => {
      await dbManager.getDB()

      const upgradeCallback = mockOpenDB.mock.calls[0][2].upgrade
      const mockUpgradeDB = {
        objectStoreNames: {
          contains: jest.fn().mockReturnValue(true),
        },
        createObjectStore: jest.fn(),
      }

      upgradeCallback(mockUpgradeDB, 1, 2)

      expect(mockUpgradeDB.createObjectStore).not.toHaveBeenCalled()
    })
  })

  describe('close', () => {
    it('should close database connection', async () => {
      await dbManager.getDB()
      await dbManager.close()

      expect(mockDB.close).toHaveBeenCalled()
      expect((dbManager as any).db).toBeNull()
    })

    it('should handle closing when no database is open', async () => {
      await dbManager.close()

      // Should not throw error
      expect(mockDB.close).not.toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('should clear all object stores', async () => {
      await dbManager.getDB()
      await dbManager.clear()

      expect(mockDB.clear).toHaveBeenCalledWith('topics')
      expect(mockDB.clear).toHaveBeenCalledWith('favorites')
      expect(mockDB.clear).toHaveBeenCalledWith('settings')
      expect(mockDB.clear).toHaveBeenCalledWith('searchIndex')
      expect(mockDB.clear).toHaveBeenCalledWith('cache')
    })
  })

  describe('reset', () => {
    it('should close, delete, and recreate database', async () => {
      await dbManager.getDB()
      await dbManager.reset()

      expect(mockDB.close).toHaveBeenCalled()
      expect(mockDeleteDB).toHaveBeenCalledWith('catholic-defender')
      expect(mockOpenDB).toHaveBeenCalledTimes(2)
    })

    it('should handle reset when window is not defined', async () => {
      const originalWindow = global.window
      delete (global as any).window

      await dbManager.getDB()
      await dbManager.reset()

      expect(mockDeleteDB).not.toHaveBeenCalled()

      global.window = originalWindow
    })
  })
})

describe('Database Operations', () => {
  let mockTopic: Topic

  beforeEach(() => {
    jest.clearAllMocks()
    mockTopic = createMockTopic()

    // Mock all the database methods we'll be testing
    const mockDB = {
      close: jest.fn(),
      get: jest.fn(() => Promise.resolve()),
      getAll: jest.fn(() => Promise.resolve([])),
      getAllFromIndex: jest.fn(() => Promise.resolve([])),
      add: jest.fn(() => Promise.resolve()),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve()),
      transaction: jest.fn(() => ({
        objectStore: jest.fn().mockReturnValue({
          add: jest.fn(() => Promise.resolve()),
          put: jest.fn(() => Promise.resolve()),
          delete: jest.fn(() => Promise.resolve()),
        }),
        done: Promise.resolve(),
      })),
    }

    mockOpenDB.mockResolvedValue(mockDB)
    (dbManager as any).db = null
  })

  describe('Topics Operations', () => {
    it('should get all topics', async () => {
      const mockTopics = [mockTopic]
      const db = await dbManager.getDB()
      db.getAll = jest.fn().mockResolvedValue(mockTopics)

      const result = await db.topics.getAll()

      expect(db.getAll).toHaveBeenCalledWith('topics')
      expect(result).toEqual(mockTopics)
    })

    it('should get topic by id', async () => {
      const db = await dbManager.getDB()
      db.get = jest.fn().mockResolvedValue(mockTopic)

      const result = await db.topics.get(mockTopic.id)

      expect(db.get).toHaveBeenCalledWith('topics', mockTopic.id)
      expect(result).toEqual(mockTopic)
    })

    it('should get topics by category', async () => {
      const mockTopics = [mockTopic]
      const db = await dbManager.getDB()
      db.getAllFromIndex = jest.fn().mockResolvedValue(mockTopics)

      const result = await db.topics.getByCategory('sacraments')

      expect(db.getAllFromIndex).toHaveBeenCalledWith('topics', 'by-category', 'sacraments')
      expect(result).toEqual(mockTopics)
    })

    it('should get topics by language', async () => {
      const mockTopics = [mockTopic]
      const db = await dbManager.getDB()
      db.getAllFromIndex = jest.fn().mockResolvedValue(mockTopics)

      const result = await db.topics.getByLanguage('en')

      expect(db.getAllFromIndex).toHaveBeenCalledWith('topics', 'by-lang', 'en')
      expect(result).toEqual(mockTopics)
    })

    it('should get topics by tags', async () => {
      const mockTopics = [
        mockTopic,
        { ...mockTopic, id: 'topic2', tags: ['different-tag'] }
      ]
      const db = await dbManager.getDB()
      db.getAll = jest.fn().mockResolvedValue(mockTopics)

      const result = await db.topics.getByTags(['test-tag'])

      expect(db.getAll).toHaveBeenCalledWith('topics')
      expect(result).toEqual([mockTopic])
    })

    it('should get topics by difficulty', async () => {
      const mockTopics = [mockTopic]
      const db = await dbManager.getDB()
      db.getAllFromIndex = jest.fn().mockResolvedValue(mockTopics)

      const result = await db.topics.getByDifficulty('beginner')

      expect(db.getAllFromIndex).toHaveBeenCalledWith('topics', 'by-difficulty', 'beginner')
      expect(result).toEqual(mockTopics)
    })

    it('should add a topic', async () => {
      const db = await dbManager.getDB()
      db.add = jest.fn().mockResolvedValue(mockTopic.id)

      const result = await db.topics.add(mockTopic)

      expect(db.add).toHaveBeenCalledWith('topics', mockTopic)
      expect(result).toBe(mockTopic.id)
    })

    it('should add multiple topics', async () => {
      const mockTopics = [mockTopic, { ...mockTopic, id: 'topic2' }]
      const db = await dbManager.getDB()
      const mockStore = {
        add: jest.fn().mockResolvedValue('test-id'),
      }
      const mockTx = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        done: Promise.resolve(),
      }
      db.transaction = jest.fn().mockReturnValue(mockTx)

      const result = await db.topics.addMany(mockTopics)

      expect(mockStore.add).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
    })

    it('should update a topic', async () => {
      const db = await dbManager.getDB()
      db.put = jest.fn().mockResolvedValue(mockTopic.id)

      const result = await db.topics.put(mockTopic)

      expect(db.put).toHaveBeenCalledWith('topics', mockTopic)
      expect(result).toBe(mockTopic.id)
    })

    it('should delete a topic', async () => {
      const db = await dbManager.getDB()
      db.delete = jest.fn().mockResolvedValue(undefined)

      await db.topics.delete(mockTopic.id)

      expect(db.delete).toHaveBeenCalledWith('topics', mockTopic.id)
    })

    it('should clear all topics', async () => {
      const db = await dbManager.getDB()
      db.clear = jest.fn().mockResolvedValue(undefined)

      await db.topics.clear()

      expect(db.clear).toHaveBeenCalledWith('topics')
    })
  })

  describe('Favorites Operations', () => {
    it('should get all favorites', async () => {
      const mockFavorites = [
        { topicId: mockTopic.id, addedAt: Date.now(), syncedToCloud: false }
      ]
      const db = await dbManager.getDB()
      db.getAll = jest.fn().mockResolvedValue(mockFavorites)

      const result = await db.favorites.getAll()

      expect(db.getAll).toHaveBeenCalledWith('favorites')
      expect(result).toEqual(mockFavorites)
    })

    it('should get favorite by topic id', async () => {
      const mockFavorite = { topicId: mockTopic.id, addedAt: Date.now(), syncedToCloud: false }
      const db = await dbManager.getDB()
      db.get = jest.fn().mockResolvedValue(mockFavorite)

      const result = await db.favorites.get(mockTopic.id)

      expect(db.get).toHaveBeenCalledWith('favorites', mockTopic.id)
      expect(result).toEqual(mockFavorite)
    })

    it('should add favorite', async () => {
      const db = await dbManager.getDB()
      db.put = jest.fn().mockResolvedValue(undefined)

      await db.favorites.add(mockTopic.id)

      expect(db.put).toHaveBeenCalledWith('favorites', {
        topicId: mockTopic.id,
        addedAt: expect.any(Number),
        syncedToCloud: false,
      })
    })

    it('should remove favorite', async () => {
      const db = await dbManager.getDB()
      db.delete = jest.fn().mockResolvedValue(undefined)

      await db.favorites.remove(mockTopic.id)

      expect(db.delete).toHaveBeenCalledWith('favorites', mockTopic.id)
    })

    it('should toggle favorite - adding when not exists', async () => {
      const db = await dbManager.getDB()
      db.get = jest.fn().mockResolvedValue(undefined)
      db.put = jest.fn().mockResolvedValue(undefined)

      const result = await db.favorites.toggle(mockTopic.id)

      expect(result).toBe(true)
      expect(db.put).toHaveBeenCalledWith('favorites', {
        topicId: mockTopic.id,
        addedAt: expect.any(Number),
        syncedToCloud: false,
      })
    })

    it('should toggle favorite - removing when exists', async () => {
      const mockFavorite = { topicId: mockTopic.id, addedAt: Date.now(), syncedToCloud: false }
      const db = await dbManager.getDB()
      db.get = jest.fn().mockResolvedValue(mockFavorite)
      db.delete = jest.fn().mockResolvedValue(undefined)

      const result = await db.favorites.toggle(mockTopic.id)

      expect(result).toBe(false)
      expect(db.delete).toHaveBeenCalledWith('favorites', mockTopic.id)
    })

    it('should check if topic is favorite', async () => {
      const mockFavorite = { topicId: mockTopic.id, addedAt: Date.now(), syncedToCloud: false }
      const db = await dbManager.getDB()
      db.get = jest.fn().mockResolvedValue(mockFavorite)

      const result = await db.favorites.isFavorite(mockTopic.id)

      expect(result).toBe(true)
    })
  })

  describe('Settings Operations', () => {
    it('should get setting by key', async () => {
      const mockSetting = { key: 'language', value: 'en' }
      const db = await dbManager.getDB()
      db.get = jest.fn().mockResolvedValue(mockSetting)

      const result = await db.settings.get('language')

      expect(db.get).toHaveBeenCalledWith('settings', 'language')
      expect(result).toEqual(mockSetting)
    })

    it('should set setting', async () => {
      const db = await dbManager.getDB()
      db.put = jest.fn().mockResolvedValue(undefined)

      await db.settings.set('language', 'en')

      expect(db.put).toHaveBeenCalledWith('settings', { key: 'language', value: 'en' })
    })

    it('should remove setting', async () => {
      const db = await dbManager.getDB()
      db.delete = jest.fn().mockResolvedValue(undefined)

      await db.settings.remove('language')

      expect(db.delete).toHaveBeenCalledWith('settings', 'language')
    })

    it('should get default settings', () => {
      const defaults = db.settings.getDefaults()

      expect(defaults).toEqual({
        language: 'en',
        theme: 'light',
        fontSize: 'medium',
        autoSync: false,
        lastSync: null,
        searchFilters: {
          categories: [],
          difficulties: [],
          showScripture: true,
          showChurchFathers: true,
        },
      })
    })
  })

  describe('Search Index Operations', () => {
    it('should get search index by language', async () => {
      const mockIndex = { lang: 'en', index: {}, version: '1.0.0', timestamp: Date.now() }
      const db = await dbManager.getDB()
      db.get = jest.fn().mockResolvedValue(mockIndex)

      const result = await db.searchIndex.get('en')

      expect(db.get).toHaveBeenCalledWith('searchIndex', 'en')
      expect(result).toEqual(mockIndex)
    })

    it('should set search index', async () => {
      const db = await dbManager.getDB()
      db.put = jest.fn().mockResolvedValue(undefined)

      await db.searchIndex.set('en', {}, '1.0.0')

      expect(db.put).toHaveBeenCalledWith('searchIndex', {
        lang: 'en',
        index: {},
        version: '1.0.0',
        timestamp: expect.any(Number),
      })
    })

    it('should remove search index', async () => {
      const db = await dbManager.getDB()
      db.delete = jest.fn().mockResolvedValue(undefined)

      await db.searchIndex.remove('en')

      expect(db.delete).toHaveBeenCalledWith('searchIndex', 'en')
    })
  })

  describe('Cache Operations', () => {
    it('should get cached item', async () => {
      const mockCached = { key: 'test', data: { value: 'test' }, timestamp: Date.now(), expiresAt: Date.now() + 10000 }
      const db = await dbManager.getDB()
      db.get = jest.fn().mockResolvedValue(mockCached)

      const result = await db.cache.get('test')

      expect(db.get).toHaveBeenCalledWith('cache', 'test')
      expect(result).toEqual({ value: 'test' })
    })

    it('should return null for expired cache', async () => {
      const mockExpired = { key: 'test', data: { value: 'test' }, timestamp: Date.now() - 10000, expiresAt: Date.now() - 5000 }
      const db = await dbManager.getDB()
      db.get = jest.fn().mockResolvedValue(mockExpired)
      db.delete = jest.fn().mockResolvedValue(undefined)

      const result = await db.cache.get('test')

      expect(db.delete).toHaveBeenCalledWith('cache', 'test')
      expect(result).toBeNull()
    })

    it('should set cached item', async () => {
      const db = await dbManager.getDB()
      db.put = jest.fn().mockResolvedValue(undefined)

      await db.cache.set('test', { value: 'test' }, 3600)

      expect(db.put).toHaveBeenCalledWith('cache', {
        key: 'test',
        data: { value: 'test' },
        timestamp: expect.any(Number),
        expiresAt: expect.any(Number),
      })
    })

    it('should remove cached item', async () => {
      const db = await dbManager.getDB()
      db.delete = jest.fn().mockResolvedValue(undefined)

      await db.cache.remove('test')

      expect(db.delete).toHaveBeenCalledWith('cache', 'test')
    })

    it('should clear expired cache items', async () => {
      const mockCache = [
        { key: 'valid', data: {}, timestamp: Date.now(), expiresAt: Date.now() + 10000 },
        { key: 'expired', data: {}, timestamp: Date.now() - 10000, expiresAt: Date.now() - 5000 },
      ]
      const db = await dbManager.getDB()
      db.getAll = jest.fn().mockResolvedValue(mockCache)
      const mockStore = {
        delete: jest.fn().mockResolvedValue(undefined),
      }
      const mockTx = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        done: Promise.resolve(),
      }
      db.transaction = jest.fn().mockReturnValue(mockTx)

      await db.cache.clearExpired()

      expect(mockStore.delete).toHaveBeenCalledWith('expired')
    })
  })
})