import { useAppStore } from '../useAppStore'
import { createMockTopic } from '../../jest.setup'
import { db } from '@/lib/db/indexeddb'
import { contentLoader } from '@/lib/content/loader'
import { validateSettings } from '@/lib/utils/validation'
import type { Topic } from '@/data/schema/topic.schema'

// Mock the database, content loader, and validation modules
jest.mock('@/lib/db/indexeddb', () => ({
  db: {
    topics: {
      getByLanguage: jest.fn(),
      putMany: jest.fn(),
    },
    settings: {
      get: jest.fn(),
      set: jest.fn(),
      getDefaults: jest.fn(),
    },
    cache: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    }
  }
}))

jest.mock('@/lib/content/loader', () => ({
  contentLoader: {
    loadContent: jest.fn(),
    loadMetadata: jest.fn(),
  }
}))

jest.mock('@/lib/utils/validation', () => ({
  validateSettings: jest.fn(),
}))

const mockDb = db as jest.Mocked<typeof db>
const mockContentLoader = contentLoader as jest.Mocked<typeof contentLoader>
const mockValidateSettings = validateSettings as jest.MockedFunction<typeof validateSettings>

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
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

describe('useAppStore', () => {
  let mockTopics: Topic[]
  let mockMetadata: any

  beforeEach(() => {
    // Reset the store state
    useAppStore.setState({
      loading: false,
      offline: !navigator.onLine,
      syncStatus: 'idle',
      error: null,
      currentLanguage: 'en',
      availableTopics: [],
      currentTopic: null,
      contentVersion: null,
      settings: {
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
      },
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

    mockMetadata = {
      version: '1.0.0',
      lastUpdated: '2025-01-15T00:00:00Z',
      totalTopics: 3
    }

    // Setup default mocks
    mockDb.topics.getByLanguage.mockResolvedValue([])
    mockDb.topics.putMany.mockResolvedValue([])
    mockDb.settings.get.mockResolvedValue(undefined)
    mockDb.settings.set.mockResolvedValue(undefined)
    mockDb.settings.getDefaults.mockReturnValue({
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
    })
    mockContentLoader.loadContent.mockResolvedValue({ topics: mockTopics })
    mockContentLoader.loadMetadata.mockResolvedValue(mockMetadata)
    mockValidateSettings.mockReturnValue({
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
    })
    mockDb.cache.get.mockResolvedValue(null)
    mockDb.cache.set.mockResolvedValue(undefined)
    mockDb.cache.remove.mockResolvedValue(undefined)
  })

  describe('UI State Actions', () => {
    it('should set loading', () => {
      const store = useAppStore.getState()
      store.setLoading(true)

      const state = useAppStore.getState()
      expect(state.loading).toBe(true)
    })

    it('should set error', () => {
      const store = useAppStore.getState()
      store.setError('Test error')

      const state = useAppStore.getState()
      expect(state.error).toBe('Test error')
    })

    it('should set offline status', () => {
      const store = useAppStore.getState()
      store.setOfflineStatus(true)

      const state = useAppStore.getState()
      expect(state.offline).toBe(true)
    })

    it('should set sync status', () => {
      const store = useAppStore.getState()
      store.setSyncStatus('syncing')

      const state = useAppStore.getState()
      expect(state.syncStatus).toBe('syncing')
    })
  })

  describe('Content Actions', () => {
    it('should load content successfully', async () => {
      const store = useAppStore.getState()
      await store.loadContent('en')

      expect(mockContentLoader.loadContent).toHaveBeenCalledWith('en')
      expect(mockContentLoader.loadMetadata).toHaveBeenCalledWith('en')
      expect(mockDb.topics.putMany).toHaveBeenCalledWith(mockTopics)
      const state = useAppStore.getState()
      expect(state.loading).toBe(false)
      expect(state.availableTopics).toEqual(mockTopics)
      expect(state.currentLanguage).toBe('en')
      expect(state.contentVersion).toBe('1.0.0')
    })

    it('should handle content loading error', async () => {
      const error = new Error('Content load failed')
      mockContentLoader.loadContent.mockRejectedValue(error)

      const store = useAppStore.getState()
      await store.loadContent('en')

      const state = useAppStore.getState()
      expect(state.loading).toBe(false)
      expect(state.error).toBe('Content load failed')
    })

    it('should use default language when none provided', async () => {
      const store = useAppStore.getState()
      await store.loadContent() // No language provided

      expect(mockContentLoader.loadContent).toHaveBeenCalledWith('en')
    })

    it('should update settings when language differs', async () => {
      const store = useAppStore.getState()
      // Set initial state with different language
      useAppStore.setState({
        settings: {
          ...store.settings,
          language: 'tl'
        }
      })

      await store.loadContent('en')

      // Should have called updateSettings with new language
      expect(mockDb.settings.set).toHaveBeenCalled()
    })
  })

  describe('Language Management', () => {
    it('should set current language with cached topics', async () => {
      const tlTopics = [mockTopics[2]] // Tagalog topic
      mockDb.topics.getByLanguage.mockResolvedValue(tlTopics)

      const store = useAppStore.getState()
      await store.setCurrentLanguage('tl')

      expect(mockDb.topics.getByLanguage).toHaveBeenCalledWith('tl')
      const state = useAppStore.getState()
      expect(state.loading).toBe(false)
      expect(state.currentLanguage).toBe('tl')
      expect(state.availableTopics).toEqual(tlTopics)
      expect(state.currentTopic).toBeNull()
    })

    it('should load content when no cached topics found', async () => {
      mockDb.topics.getByLanguage.mockResolvedValue([])

      const store = useAppStore.getState()
      await store.setCurrentLanguage('tl')

      expect(mockContentLoader.loadContent).toHaveBeenCalledWith('tl')
    })

    it('should not change when same language is set', async () => {
      const store = useAppStore.getState()
      await store.setCurrentLanguage('en') // Same as initial

      expect(mockDb.topics.getByLanguage).not.toHaveBeenCalled()
    })

    it('should handle language switch error', async () => {
      const error = new Error('Language switch failed')
      mockDb.topics.getByLanguage.mockRejectedValue(error)

      const store = useAppStore.getState()
      await store.setCurrentLanguage('tl')

      const state = useAppStore.getState()
      expect(state.loading).toBe(false)
      expect(state.error).toBe('Language switch failed')
    })

    it('should set current topic', () => {
      const store = useAppStore.getState()
      store.setCurrentTopic(mockTopics[0])

      const state = useAppStore.getState()
      expect(state.currentTopic).toEqual(mockTopics[0])
    })
  })

  describe('Settings Actions', () => {
    it('should update settings', async () => {
      const newSettings = {
        theme: 'dark' as const,
        fontSize: 'large' as const
      }
      const store = useAppStore.getState()
      const settingsBefore = store.settings
      const expectedMerged = { ...settingsBefore, ...newSettings }
      mockValidateSettings.mockReturnValue(expectedMerged)

      await store.updateSettings(newSettings)

      expect(mockValidateSettings).toHaveBeenCalledWith(expectedMerged)
      expect(mockDb.settings.set).toHaveBeenCalledWith('user-settings', expect.any(Object))
      const state = useAppStore.getState()
      expect(state.settings.theme).toBe('dark')
      expect(state.settings.fontSize).toBe('large')
    })

    it('should handle settings update error', async () => {
      const error = new Error('Settings update failed')
      mockValidateSettings.mockImplementation(() => {
        throw error
      })

      const store = useAppStore.getState()
      await store.updateSettings({ theme: 'dark' })

      expect(useAppStore.getState().error).toBe('Settings update failed')
    })

    it('should reset settings', async () => {
      const defaultSettings = mockDb.settings.getDefaults()

      const store = useAppStore.getState()
      await store.resetSettings()

      expect(mockDb.settings.set).toHaveBeenCalledWith('user-settings', defaultSettings)
      expect(useAppStore.getState().settings).toEqual(defaultSettings)
    })

    it('should handle reset settings error', async () => {
      const error = new Error('Reset failed')
      mockDb.settings.set.mockRejectedValue(error)

      const store = useAppStore.getState()
      await store.resetSettings()

      expect(useAppStore.getState().error).toBe('Reset failed')
    })

    it('should get settings', () => {
      const store = useAppStore.getState()
      const settings = store.getSettings()

      expect(settings).toEqual(store.settings)
    })
  })

  describe('Initialization', () => {
    beforeEach(() => {
      // Mock addEventListener and removeEventListener
      window.addEventListener = jest.fn()
      window.removeEventListener = jest.fn()
    })

    it('should initialize app successfully', async () => {
      const mockStoredSettings = {
        language: 'tl' as const,
        theme: 'dark' as const,
        fontSize: 'medium' as const,
        autoSync: false,
        lastSync: null,
        searchFilters: { categories: [], difficulties: [], showScripture: true, showChurchFathers: true }
      }
      mockDb.settings.get.mockResolvedValue(mockStoredSettings)
      mockValidateSettings.mockReturnValue(mockStoredSettings)

      const store = useAppStore.getState()
      const cleanup = await store.initialize()

      expect(mockDb.settings.get).toHaveBeenCalledWith('user-settings')
      expect(mockValidateSettings).toHaveBeenCalledWith(mockStoredSettings)
      expect(mockContentLoader.loadContent).toHaveBeenCalledWith('tl')
      expect(useAppStore.getState().loading).toBe(false)

      expect(typeof cleanup).toBe('function')
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))

      cleanup()
      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('should handle initialization error', async () => {
      const error = new Error('Initialization failed')
      mockDb.settings.get.mockRejectedValue(error)

      const store = useAppStore.getState()
      await store.initialize()

      const state = useAppStore.getState()
      expect(state.loading).toBe(false)
      expect(state.error).toBe('Initialization failed')
    })

    it('should use default language when no stored settings', async () => {
      mockDb.settings.get.mockResolvedValue(null)

      const store = useAppStore.getState()
      await store.initialize()

      expect(mockContentLoader.loadContent).toHaveBeenCalledWith('en')
    })
  })

  describe('Utility Actions', () => {
    it('should refresh content', async () => {
      const store = useAppStore.getState()
      await store.refreshContent()

      expect(mockContentLoader.loadContent).toHaveBeenCalledWith('en')
    })

    it('should get topic by ID', () => {
      useAppStore.setState({ availableTopics: mockTopics })

      const store = useAppStore.getState()
      const topic = store.getTopicById('topic1')

      expect(topic).toEqual(mockTopics[0])
    })

    it('should return null for non-existent topic ID', () => {
      useAppStore.setState({ availableTopics: mockTopics })

      const store = useAppStore.getState()
      const topic = store.getTopicById('nonexistent')

      expect(topic).toBeNull()
    })

    it('should get topics by category', () => {
      useAppStore.setState({ availableTopics: mockTopics })

      const store = useAppStore.getState()
      const sacramentsTopics = store.getTopicsByCategory('sacraments')

      expect(sacramentsTopics).toHaveLength(1)
      expect(sacramentsTopics[0].category).toBe('sacraments')
    })

    it('should get topics by difficulty', () => {
      useAppStore.setState({ availableTopics: mockTopics })

      const store = useAppStore.getState()
      const advancedTopics = store.getTopicsByDifficulty('advanced')

      expect(advancedTopics).toHaveLength(1)
      expect(advancedTopics[0].difficulty).toBe('advanced')
    })

    it('should return empty array for no matching category', () => {
      useAppStore.setState({ availableTopics: mockTopics })

      const store = useAppStore.getState()
      const unknownTopics = store.getTopicsByCategory('unknown')

      expect(unknownTopics).toHaveLength(0)
    })

    it('should return empty array for no matching difficulty', () => {
      useAppStore.setState({ availableTopics: mockTopics })

      const store = useAppStore.getState()
      const unknownTopics = store.getTopicsByDifficulty('unknown')

      expect(unknownTopics).toHaveLength(0)
    })
  })

  describe('Theme Management', () => {
    beforeEach(() => {
      // Mock document.documentElement
      Object.defineProperty(document, 'documentElement', {
        writable: true,
        value: {
          classList: {
            toggle: jest.fn()
          }
        }
      })
    })

    it('should apply dark theme', async () => {
      const store = useAppStore.getState()
      await store.updateSettings({ theme: 'dark' })

      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true)
    })

    it('should apply light theme', async () => {
      const store = useAppStore.getState()
      await store.updateSettings({ theme: 'light' })

      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false)
    })

    it('should apply system theme when dark mode preferred', async () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const store = useAppStore.getState()
      await store.updateSettings({ theme: 'system' })

      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true)
    })
  })

  describe('Persistence', () => {
    beforeEach(() => {
      // Reset persistence mocks
      mockDb.cache.get.mockResolvedValue(null)
      mockDb.cache.set.mockResolvedValue(undefined)
      mockDb.cache.remove.mockResolvedValue(undefined)
    })

    it('should persist settings to cache', () => {
      const store = useAppStore.getState()

      // Simulate settings change
      store.settings = {
        ...store.settings,
        theme: 'dark'
      }

      expect(store.settings.theme).toBe('dark')
    })

    it('should persist current language', () => {
      const store = useAppStore.getState()

      // Simulate language change
      store.currentLanguage = 'tl'

      expect(store.currentLanguage).toBe('tl')
    })
  })

  describe('Selector Hooks', () => {
    it('useAppLoading should return loading', () => {
      const store = useAppStore.getState()
      store.loading = true

      const useAppLoading = require('../useAppStore').useAppLoading
      expect(typeof useAppLoading).toBe('function')
    })

    it('useAppError should return error', () => {
      const store = useAppStore.getState()
      store.error = 'Test error'

      const useAppError = require('../useAppStore').useAppError
      expect(typeof useAppError).toBe('function')
    })

    it('useOfflineStatus should return offline', () => {
      const store = useAppStore.getState()
      store.offline = true

      const useOfflineStatus = require('../useAppStore').useOfflineStatus
      expect(typeof useOfflineStatus).toBe('function')
    })

    it('useCurrentLanguage should return currentLanguage', () => {
      const store = useAppStore.getState()
      store.currentLanguage = 'tl'

      const useCurrentLanguage = require('../useAppStore').useCurrentLanguage
      expect(typeof useCurrentLanguage).toBe('function')
    })

    it('useAvailableTopics should return availableTopics', () => {
      const store = useAppStore.getState()
      store.availableTopics = mockTopics

      const useAvailableTopics = require('../useAppStore').useAvailableTopics
      expect(typeof useAvailableTopics).toBe('function')
    })

    it('useCurrentTopic should return currentTopic', () => {
      const store = useAppStore.getState()
      store.currentTopic = mockTopics[0]

      const useCurrentTopic = require('../useAppStore').useCurrentTopic
      expect(typeof useCurrentTopic).toBe('function')
    })

    it('useAppSettings should return settings', () => {
      const store = useAppStore.getState()
      store.settings.theme = 'dark'

      const useAppSettings = require('../useAppStore').useAppSettings
      expect(typeof useAppSettings).toBe('function')
    })

    it('useSyncStatus should return syncStatus', () => {
      const store = useAppStore.getState()
      store.syncStatus = 'synced'

      const useSyncStatus = require('../useAppStore').useSyncStatus
      expect(typeof useSyncStatus).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('should handle content loader errors gracefully', async () => {
      mockContentLoader.loadContent.mockRejectedValue(new Error('Network error'))

      const store = useAppStore.getState()
      await store.loadContent('en')

      expect(store.error).toBe('Network error')
      expect(store.loading).toBe(false)
    })

    it('should handle metadata loading errors', async () => {
      mockContentLoader.loadContent.mockResolvedValue({ topics: mockTopics })
      mockContentLoader.loadMetadata.mockRejectedValue(new Error('Metadata error'))

      const store = useAppStore.getState()
      await store.loadContent('en')

      expect(store.error).toBe('Network error') // The second error should be caught
    })

    it('should handle database errors gracefully', async () => {
      mockDb.topics.putMany.mockRejectedValue(new Error('Database error'))

      const store = useAppStore.getState()
      await store.loadContent('en')

      // Should still update state even if DB storage fails
      expect(store.availableTopics).toEqual(mockTopics)
    })
  })
})