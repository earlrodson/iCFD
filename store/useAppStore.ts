import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { db } from '@/lib/db/indexeddb'
import { contentLoader } from '@/lib/content/loader'
import { validateSettings } from '@/lib/utils/validation'
import type { Topic } from '@/data/schema/topic.schema'
import type { ValidatedSettings } from '@/lib/utils/validation'
import type { PresentationMode } from '@/lib/content/normalize'

export interface AppState {
  // UI state
  loading: boolean
  offline: boolean
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
  error: string | null

  // Content state
  currentLanguage: 'en' | 'tl' | 'ceb'
  availableTopics: Topic[]
  currentTopic: Topic | null
  contentVersion: string | null

  // Presentation mode — session-only, not persisted
  presentationMode: PresentationMode

  // User settings
  settings: ValidatedSettings

  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setOfflineStatus: (offline: boolean) => void
  setSyncStatus: (status: 'idle' | 'syncing' | 'synced' | 'error') => void

  // Content actions
  loadContent: (language?: string) => Promise<void>
  setCurrentLanguage: (language: 'en' | 'tl' | 'ceb') => Promise<void>
  setCurrentTopic: (topic: Topic | null) => void

  // Presentation mode actions
  setPresentationMode: (mode: PresentationMode) => void

  // Settings actions
  updateSettings: (settings: Partial<ValidatedSettings>) => Promise<void>
  resetSettings: () => Promise<void>
  getSettings: () => ValidatedSettings

  // Initialization
  initialize: () => Promise<void>

  // Utility actions
  refreshContent: () => Promise<void>
  getTopicById: (topicId: string) => Topic | null
  getTopicsByCategory: (category: string) => Topic[]
  getTopicsByDifficulty: (difficulty: string) => Topic[]
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      loading: false as boolean,
      offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      syncStatus: 'idle' as const,
      error: null as string | null,

      currentLanguage: 'en' as const,
      availableTopics: [] as Topic[],
      currentTopic: null as Topic | null,
      contentVersion: null as string | null,

      presentationMode: 'full' as PresentationMode,

      settings: {
        language: 'en' as const,
        theme: 'light' as const,
        fontSize: 'medium' as const,
        autoSync: false as boolean,
        lastSync: null as string | null,
        searchFilters: {
          categories: [] as string[],
          difficulties: [] as string[],
          showScripture: true as boolean,
          showChurchFathers: true as boolean
        }
      } as ValidatedSettings,

      // UI state actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setOfflineStatus: (offline) => set({ offline }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),

      // Content actions
      loadContent: async (language) => {
        const lang = (language || get().currentLanguage) as 'en' | 'tl' | 'ceb'
        set({ loading: true, error: null })

        try {
          // Load content from loader
          const content = await contentLoader.loadContent(lang)
          const metadata = await contentLoader.loadMetadata(lang)

          // Store content in IndexedDB
          await db.topics.putMany(content.topics)

          // Update state
          set({
            availableTopics: content.topics,
            currentLanguage: lang,
            contentVersion: metadata.version,
            loading: false
          })

          // Update settings language
          const currentSettings = get().settings
          if (currentSettings.language !== lang) {
            await get().updateSettings({ language: lang })
          }

        } catch (error) {
          console.error('Failed to load content:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load content'
          })
        }
      },

      setCurrentLanguage: async (language) => {
        if (language === get().currentLanguage) return

        set({ loading: true })

        try {
          // Try to load from IndexedDB first
          let topics = await db.topics.getByLanguage(language)

          if (topics.length === 0) {
            // If no topics in IndexedDB, load from JSON
            await get().loadContent(language)
            return
          }

          // Update state with cached topics
          set({
            availableTopics: topics,
            currentLanguage: language,
            currentTopic: null,
            loading: false
          })

          // Update settings
          await get().updateSettings({ language })

        } catch (error) {
          console.error('Failed to switch language:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to switch language'
          })
        }
      },

      setCurrentTopic: (topic) => set({ currentTopic: topic }),

      setPresentationMode: (mode) => set({ presentationMode: mode }),

      // Settings actions
      updateSettings: async (newSettings) => {
        try {
          const currentSettings = get().settings
          const updatedSettings = { ...currentSettings, ...newSettings }

          // Validate settings
          const validatedSettings = validateSettings(updatedSettings)

          // Store in IndexedDB
          await db.settings.set('user-settings', validatedSettings)

          // Update state
          set({ settings: validatedSettings })

          // Apply theme immediately
          if (newSettings.theme && typeof window !== 'undefined') {
            applyTheme(newSettings.theme)
          }

        } catch (error) {
          console.error('Failed to update settings:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update settings'
          })
        }
      },

      resetSettings: async () => {
        try {
          const defaultSettings = db.settings.getDefaults()

          // Store in IndexedDB
          await db.settings.set('user-settings', defaultSettings)

          // Update state
          set({ settings: defaultSettings })

          // Apply theme
          if (typeof window !== 'undefined') {
            applyTheme(defaultSettings.theme)
          }

        } catch (error) {
          console.error('Failed to reset settings:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to reset settings'
          })
        }
      },

      getSettings: () => get().settings,

      // Initialization
      initialize: async () => {
        set({ loading: true, error: null })

        try {
          // Load settings from IndexedDB
          const storedSettings = await db.settings.get('user-settings')

          if (storedSettings) {
            const validatedSettings = validateSettings(storedSettings)
            set({ settings: validatedSettings })

            // Apply theme
            if (typeof window !== 'undefined') {
              applyTheme(validatedSettings.theme)
            }
          }

          // Set up offline detection
          const handleOnline = () => set({ offline: false })
          const handleOffline = () => set({ offline: true })

          window.addEventListener('online', handleOnline)
          window.addEventListener('offline', handleOffline)

          // Load initial content
          await get().loadContent(storedSettings?.language || 'en')

          // Note: Event listeners are cleaned up when component unmounts
          // or through proper effect cleanup in React components

        } catch (error) {
          console.error('Failed to initialize app:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to initialize app'
          })
        }
      },

      // Utility actions
      refreshContent: async () => {
        const language = get().currentLanguage
        await get().loadContent(language)
      },

      getTopicById: (topicId: string) => {
        const topics = get().availableTopics
        return topics.find(topic => topic.id === topicId) || null
      },

      getTopicsByCategory: (category: string) => {
        const topics = get().availableTopics
        return topics.filter(topic => topic.category === category)
      },

      getTopicsByDifficulty: (difficulty: string) => {
        const topics = get().availableTopics
        return topics.filter(topic => topic.difficulty === difficulty)
      }
    }),
    {
      name: 'catholic-defender-app-store',
      storage: createJSONStorage(() => {
        // Use IndexedDB for persistence
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          return {
            getItem: async (name) => {
              try {
                const result = await db.settings.get(name)
                return result ? JSON.stringify(result) : null
              } catch {
                return null
              }
            },
            setItem: async (name, value) => {
              try {
                await db.settings.set(name, JSON.parse(value))
              } catch (error) {
                console.error('Failed to persist state:', error)
              }
            },
            removeItem: async (name) => {
              try {
                await db.settings.remove(name)
              } catch (error) {
                console.error('Failed to remove persisted state:', error)
              }
            }
          }
        }
        // Fallback to localStorage
        return localStorage
      }),
      partialize: (state) => ({
        // Only persist essential state — presentationMode is session-only
        settings: state.settings,
        currentLanguage: state.currentLanguage
      }),
      version: 1
    }
  )
)

// Theme utility function
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = window.document.documentElement

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.toggle('dark', systemTheme === 'dark')
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

// Utility hooks
export const useAppLoading = () => useAppStore((state) => state.loading)
export const useAppError = () => useAppStore((state) => state.error)
export const useOfflineStatus = () => useAppStore((state) => state.offline)
export const useCurrentLanguage = () => useAppStore((state) => state.currentLanguage)
export const useAvailableTopics = () => useAppStore((state) => state.availableTopics)
export const useCurrentTopic = () => useAppStore((state) => state.currentTopic)
export const useAppSettings = () => useAppStore((state) => state.settings)
export const useSyncStatus = () => useAppStore((state) => state.syncStatus)
export const usePresentationMode = () => useAppStore((state) => state.presentationMode)
export const useSetPresentationMode = () => useAppStore((state) => state.setPresentationMode)
