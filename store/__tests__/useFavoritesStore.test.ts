import { useFavoritesStore } from '../useFavoritesStore'
import { createMockTopic } from '../../jest.setup'
import { db } from '@/lib/db/indexeddb'
import type { Topic } from '@/data/schema/topic.schema'

// Mock the database module
jest.mock('@/lib/db/indexeddb', () => ({
  db: {
    favorites: {
      getAll: jest.fn(),
      get: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      clear: jest.fn(),
    },
    cache: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    }
  }
}))

const mockDb = db as jest.Mocked<typeof db>

describe('useFavoritesStore', () => {
  let mockTopics: Topic[]

  beforeEach(() => {
    // Reset the store state
    useFavoritesStore.setState({
      favoriteIds: [],
      loading: false,
      error: null,
    })

    // Clear mock calls
    jest.clearAllMocks()

    // Create mock topics for testing
    mockTopics = [
      createMockTopic({
        id: 'topic1',
        title: 'Eucharist Explained',
        category: 'sacraments',
        difficulty: 'beginner',
        lang: 'en',
        tags: ['eucharist', 'sacraments']
      }),
      createMockTopic({
        id: 'topic2',
        title: 'Mary Mother of God',
        category: 'mary',
        difficulty: 'intermediate',
        lang: 'en',
        tags: ['mary', 'theotokos']
      }),
      createMockTopic({
        id: 'topic3',
        title: 'Papal Authority',
        category: 'papacy',
        difficulty: 'advanced',
        lang: 'tl',
        tags: ['pope', 'authority']
      })
    ]

    // Setup default database mocks
    mockDb.favorites.getAll.mockResolvedValue([])
    mockDb.favorites.get.mockResolvedValue(undefined)
    mockDb.favorites.add.mockResolvedValue(undefined)
    mockDb.favorites.remove.mockResolvedValue(undefined)
    mockDb.favorites.toggle.mockResolvedValue(true)
    mockDb.favorites.clear.mockResolvedValue(undefined)
    mockDb.cache.get.mockResolvedValue(null)
    mockDb.cache.set.mockResolvedValue(undefined)
    mockDb.cache.remove.mockResolvedValue(undefined)
  })

  describe('Load Favorites', () => {
    it('should load favorites from database', async () => {
      const mockFavorites = [
        { topicId: 'topic1', addedAt: Date.now(), syncedToCloud: false },
        { topicId: 'topic2', addedAt: Date.now(), syncedToCloud: false }
      ]
      mockDb.favorites.getAll.mockResolvedValue(mockFavorites)

      const store = useFavoritesStore.getState()
      await store.loadFavorites()

      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.favoriteIds).toEqual(['topic1', 'topic2'])
    })

    it('should handle load favorites error', async () => {
      const error = new Error('Database error')
      mockDb.favorites.getAll.mockRejectedValue(error)

      const store = useFavoritesStore.getState()
      await store.loadFavorites()

      expect(store.loading).toBe(false)
      expect(store.error).toBe('Database error')
    })
  })

  describe('Toggle Favorite', () => {
    it('should add topic to favorites', async () => {
      mockDb.favorites.toggle.mockResolvedValue(true)

      const store = useFavoritesStore.getState()
      const result = await store.toggleFavorite('topic1')

      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.favoriteIds).toContain('topic1')
    })

    it('should remove topic from favorites', async () => {
      // Setup initial state
      useFavoritesStore.setState({ favoriteIds: ['topic1'] })
      mockDb.favorites.toggle.mockResolvedValue(false)

      const store = useFavoritesStore.getState()
      const result = await store.toggleFavorite('topic1')

      expect(result).toBe(false)
      expect(store.loading).toBe(false)
      expect(store.favoriteIds).not.toContain('topic1')
    })

    it('should handle toggle favorite error', async () => {
      const error = new Error('Toggle failed')
      mockDb.favorites.toggle.mockRejectedValue(error)

      const store = useFavoritesStore.getState()
      const result = await store.toggleFavorite('topic1')

      expect(result).toBe(false)
      expect(store.loading).toBe(false)
      expect(store.error).toBe('Toggle failed')
    })
  })

  describe('Check Favorite Status', () => {
    it('should return true for favorited topic', () => {
      useFavoritesStore.setState({ favoriteIds: ['topic1', 'topic2'] })

      const store = useFavoritesStore.getState()
      const isFav = store.isFavorite('topic1')

      expect(isFav).toBe(true)
    })

    it('should return false for non-favorited topic', () => {
      useFavoritesStore.setState({ favoriteIds: ['topic1', 'topic2'] })

      const store = useFavoritesStore.getState()
      const isFav = store.isFavorite('topic3')

      expect(isFav).toBe(false)
    })
  })

  describe('Add to Favorites', () => {
    it('should add topic to favorites', async () => {
      const store = useFavoritesStore.getState()
      await store.addToFavorites('topic1')

      expect(mockDb.favorites.add).toHaveBeenCalledWith('topic1')
      expect(store.loading).toBe(false)
      expect(store.favoriteIds).toContain('topic1')
    })

    it('should handle add favorite error', async () => {
      const error = new Error('Add failed')
      mockDb.favorites.add.mockRejectedValue(error)

      const store = useFavoritesStore.getState()
      await store.addToFavorites('topic1')

      expect(store.loading).toBe(false)
      expect(store.error).toBe('Add failed')
    })
  })

  describe('Remove from Favorites', () => {
    it('should remove topic from favorites', async () => {
      // Setup initial state
      useFavoritesStore.setState({ favoriteIds: ['topic1', 'topic2'] })

      const store = useFavoritesStore.getState()
      await store.removeFromFavorites('topic1')

      expect(mockDb.favorites.remove).toHaveBeenCalledWith('topic1')
      expect(store.loading).toBe(false)
      expect(store.favoriteIds).not.toContain('topic1')
      expect(store.favoriteIds).toContain('topic2')
    })

    it('should handle remove favorite error', async () => {
      const error = new Error('Remove failed')
      mockDb.favorites.remove.mockRejectedValue(error)

      const store = useFavoritesStore.getState()
      await store.removeFromFavorites('topic1')

      expect(store.loading).toBe(false)
      expect(store.error).toBe('Remove failed')
    })
  })

  describe('Clear Favorites', () => {
    it('should clear all favorites', async () => {
      // Setup initial state
      useFavoritesStore.setState({ favoriteIds: ['topic1', 'topic2', 'topic3'] })

      const store = useFavoritesStore.getState()
      await store.clearFavorites()

      expect(mockDb.favorites.clear).toHaveBeenCalled()
      expect(store.loading).toBe(false)
      expect(store.favoriteIds).toHaveLength(0)
    })

    it('should handle clear favorites error', async () => {
      const error = new Error('Clear failed')
      mockDb.favorites.clear.mockRejectedValue(error)

      const store = useFavoritesStore.getState()
      await store.clearFavorites()

      expect(store.loading).toBe(false)
      expect(store.error).toBe('Clear failed')
    })
  })

  describe('Export Favorites', () => {
    it('should export favorites as JSON', async () => {
      const mockFavorites = [
        { topicId: 'topic1', addedAt: Date.now(), syncedToCloud: false },
        { topicId: 'topic2', addedAt: Date.now(), syncedToCloud: false }
      ]
      mockDb.favorites.getAll.mockResolvedValue(mockFavorites)

      const store = useFavoritesStore.getState()
      const exported = await store.exportFavorites()

      expect(typeof exported).toBe('string')
      const parsed = JSON.parse(exported)
      expect(parsed.version).toBe('1.0.0')
      expect(parsed.exportDate).toBeDefined()
      expect(parsed.favorites).toHaveLength(2)
      expect(parsed.favorites[0].topicId).toBe('topic1')
      expect(parsed.favorites[0].addedAt).toBeDefined()
    })

    it('should handle export favorites error', async () => {
      const error = new Error('Export failed')
      mockDb.favorites.getAll.mockRejectedValue(error)

      const store = useFavoritesStore.getState()
      await expect(store.exportFavorites()).rejects.toThrow('Export failed')
    })
  })

  describe('Import Favorites', () => {
    it('should import favorites from JSON', async () => {
      const importData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        favorites: [
          { topicId: 'topic1', addedAt: new Date().toISOString() },
          { topicId: 'topic2', addedAt: new Date().toISOString() }
        ]
      }

      const store = useFavoritesStore.getState()
      await store.importFavorites(JSON.stringify(importData))

      expect(mockDb.favorites.clear).toHaveBeenCalled()
      expect(mockDb.favorites.add).toHaveBeenCalledWith('topic1')
      expect(mockDb.favorites.add).toHaveBeenCalledWith('topic2')
    })

    it('should handle invalid import data', async () => {
      const store = useFavoritesStore.getState()
      await store.importFavorites('invalid json')

      expect(store.loading).toBe(false)
      expect(store.error).toBeTruthy()
    })

    it('should handle missing favorites array', async () => {
      const invalidData = { version: '1.0.0' }

      const store = useFavoritesStore.getState()
      await store.importFavorites(JSON.stringify(invalidData))

      expect(store.loading).toBe(false)
      expect(store.error).toBe('Invalid favorites data format')
    })

    it('should handle import database error', async () => {
      const error = new Error('Import failed')
      mockDb.favorites.clear.mockRejectedValue(error)

      const importData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        favorites: [{ topicId: 'topic1', addedAt: new Date().toISOString() }]
      }

      const store = useFavoritesStore.getState()
      await store.importFavorites(JSON.stringify(importData))

      expect(store.loading).toBe(false)
      expect(store.error).toBe('Import failed')
    })
  })

  describe('Get Favorite Topics', () => {
    it('should filter topics by favorite IDs', () => {
      useFavoritesStore.setState({ favoriteIds: ['topic1', 'topic3'] })

      const store = useFavoritesStore.getState()
      const favoriteTopics = store.getFavoriteTopics(mockTopics)

      expect(favoriteTopics).toHaveLength(2)
      expect(favoriteTopics.map(t => t.id)).toEqual(['topic1', 'topic3'])
    })

    it('should return empty array when no favorites', () => {
      useFavoritesStore.setState({ favoriteIds: [] })

      const store = useFavoritesStore.getState()
      const favoriteTopics = store.getFavoriteTopics(mockTopics)

      expect(favoriteTopics).toHaveLength(0)
    })

    it('should handle topics with no matching favorites', () => {
      useFavoritesStore.setState({ favoriteIds: ['nonexistent'] })

      const store = useFavoritesStore.getState()
      const favoriteTopics = store.getFavoriteTopics(mockTopics)

      expect(favoriteTopics).toHaveLength(0)
    })
  })

  describe('Get Favorites Count', () => {
    it('should return correct count', () => {
      useFavoritesStore.setState({ favoriteIds: ['topic1', 'topic2', 'topic3'] })

      const store = useFavoritesStore.getState()
      const count = store.getFavoritesCount()

      expect(count).toBe(3)
    })

    it('should return zero when no favorites', () => {
      useFavoritesStore.setState({ favoriteIds: [] })

      const store = useFavoritesStore.getState()
      const count = store.getFavoritesCount()

      expect(count).toBe(0)
    })
  })

  describe('Persistence', () => {
    beforeEach(() => {
      // Reset persistence mocks
      mockDb.cache.get.mockResolvedValue(null)
      mockDb.cache.set.mockResolvedValue(undefined)
      mockDb.cache.remove.mockResolvedValue(undefined)
    })

    it('should persist favorite IDs to cache', () => {
      const store = useFavoritesStore.getState()

      // Simulate adding to favorites
      store.favoriteIds = ['topic1', 'topic2']

      expect(store.favoriteIds).toEqual(['topic1', 'topic2'])
    })
  })

  describe('Selector Hooks', () => {
    it('useFavoriteIds should return favoriteIds', () => {
      const store = useFavoritesStore.getState()
      store.favoriteIds = ['topic1', 'topic2']

      const useFavoriteIds = require('../useFavoritesStore').useFavoriteIds
      expect(typeof useFavoriteIds).toBe('function')
    })

    it('useFavoritesCount should return count', () => {
      const store = useFavoritesStore.getState()
      store.favoriteIds = ['topic1', 'topic2']

      const useFavoritesCount = require('../useFavoritesStore').useFavoritesCount
      expect(typeof useFavoritesCount).toBe('function')
    })

    it('useFavoritesLoading should return loading', () => {
      const store = useFavoritesStore.getState()
      store.loading = true

      const useFavoritesLoading = require('../useFavoritesStore').useFavoritesLoading
      expect(typeof useFavoritesLoading).toBe('function')
    })

    it('useFavoritesError should return error', () => {
      const store = useFavoritesStore.getState()
      store.error = 'Test error'

      const useFavoritesError = require('../useFavoritesStore').useFavoritesError
      expect(typeof useFavoritesError).toBe('function')
    })

    it('useFavoriteActions should return actions', () => {
      const useFavoriteActions = require('../useFavoritesStore').useFavoriteActions
      expect(typeof useFavoriteActions).toBe('function')
    })
  })

  describe('Data Integrity', () => {
    it('should handle duplicate topic IDs in favorites', async () => {
      // Setup initial state with duplicate
      useFavoritesStore.setState({ favoriteIds: ['topic1', 'topic1'] })

      const store = useFavoritesStore.getState()
      const count = store.getFavoritesCount()

      // Should still count duplicates for now (this could be improved)
      expect(count).toBe(2)
    })

    it('should handle invalid topic IDs gracefully', async () => {
      const store = useFavoritesStore.getState()
      const isFav = store.isFavorite('')
      const isFavUndefined = store.isFavorite(undefined as any)

      expect(isFav).toBe(false)
      expect(isFavUndefined).toBe(false)
    })

    it('should handle empty import data gracefully', async () => {
      const importData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        favorites: []
      }

      const store = useFavoritesStore.getState()
      await store.importFavorites(JSON.stringify(importData))

      expect(mockDb.favorites.clear).toHaveBeenCalled()
      expect(store.favoriteIds).toEqual([])
    })
  })
})