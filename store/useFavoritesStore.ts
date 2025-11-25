import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { db } from '@/lib/db/indexeddb'
import type { Topic } from '@/data/schema/topic.schema'

export interface FavoritesState {
  // State
  favoriteIds: string[]
  loading: boolean
  error: string | null

  // Actions
  loadFavorites: () => Promise<void>
  toggleFavorite: (topicId: string) => Promise<boolean>
  isFavorite: (topicId: string) => boolean
  addToFavorites: (topicId: string) => Promise<void>
  removeFromFavorites: (topicId: string) => Promise<void>
  clearFavorites: () => Promise<void>
  exportFavorites: () => Promise<string>
  importFavorites: (jsonData: string) => Promise<void>
  getFavoriteTopics: (allTopics: Topic[]) => Topic[]
  getFavoritesCount: () => number
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      // Initial state
      favoriteIds: [],
      loading: false,
      error: null,

      // Actions
      loadFavorites: async () => {
        set({ loading: true, error: null })

        try {
          const favorites = await db.favorites.getAll()
          const favoriteIds = favorites.map(fav => fav.topicId)
          set({ favoriteIds, loading: false })
        } catch (error) {
          console.error('Failed to load favorites:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load favorites'
          })
        }
      },

      toggleFavorite: async (topicId: string) => {
        set({ loading: true, error: null })

        try {
          const isFavorited = await db.favorites.toggle(topicId)
          const currentFavorites = get().favoriteIds

          const newFavorites = isFavorited
            ? [...currentFavorites, topicId]
            : currentFavorites.filter(id => id !== topicId)

          set({ favoriteIds: newFavorites, loading: false })
          return isFavorited
        } catch (error) {
          console.error('Failed to toggle favorite:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to toggle favorite'
          })
          return false
        }
      },

      isFavorite: (topicId: string) => {
        return get().favoriteIds.includes(topicId)
      },

      addToFavorites: async (topicId: string) => {
        set({ loading: true, error: null })

        try {
          await db.favorites.add(topicId)
          const currentFavorites = get().favoriteIds
          set({
            favoriteIds: [...currentFavorites, topicId],
            loading: false
          })
        } catch (error) {
          console.error('Failed to add favorite:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to add favorite'
          })
        }
      },

      removeFromFavorites: async (topicId: string) => {
        set({ loading: true, error: null })

        try {
          await db.favorites.remove(topicId)
          const currentFavorites = get().favoriteIds
          set({
            favoriteIds: currentFavorites.filter(id => id !== topicId),
            loading: false
          })
        } catch (error) {
          console.error('Failed to remove favorite:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to remove favorite'
          })
        }
      },

      clearFavorites: async () => {
        set({ loading: true, error: null })

        try {
          await db.favorites.clear()
          set({ favoriteIds: [], loading: false })
        } catch (error) {
          console.error('Failed to clear favorites:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to clear favorites'
          })
        }
      },

      exportFavorites: async () => {
        try {
          const favorites = await db.favorites.getAll()
          const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            favorites: favorites.map(fav => ({
              topicId: fav.topicId,
              addedAt: new Date(fav.addedAt).toISOString()
            }))
          }
          return JSON.stringify(exportData, null, 2)
        } catch (error) {
          console.error('Failed to export favorites:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to export favorites'
          })
          throw error
        }
      },

      importFavorites: async (jsonData: string) => {
        set({ loading: true, error: null })

        try {
          const data = JSON.parse(jsonData)

          // Validate import data structure
          if (!data.favorites || !Array.isArray(data.favorites)) {
            throw new Error('Invalid favorites data format')
          }

          // Clear existing favorites
          await db.favorites.clear()

          // Import new favorites
          for (const fav of data.favorites) {
            if (fav.topicId && typeof fav.topicId === 'string') {
              await db.favorites.add(fav.topicId)
            }
          }

          // Reload favorites
          await get().loadFavorites()

        } catch (error) {
          console.error('Failed to import favorites:', error)
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to import favorites'
          })
        }
      },

      getFavoriteTopics: (allTopics: Topic[]) => {
        const favoriteIds = get().favoriteIds
        return allTopics.filter(topic => favoriteIds.includes(topic.id))
      },

      getFavoritesCount: () => {
        return get().favoriteIds.length
      }
    }),
    {
      name: 'catholic-defender-favorites-store',
      storage: createJSONStorage(() => {
        // Use IndexedDB for persistence
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          return {
            getItem: async (name) => {
              try {
                const result = await db.cache.get(name)
                return result?.data || null
              } catch {
                return null
              }
            },
            setItem: async (name, value) => {
              try {
                await db.cache.set(name, JSON.parse(value), 24 * 60 * 60) // 24 hours TTL
              } catch (error) {
                console.error('Failed to persist favorites state:', error)
              }
            },
            removeItem: async (name) => {
              try {
                await db.cache.remove(name)
              } catch (error) {
                console.error('Failed to remove persisted favorites state:', error)
              }
            }
          }
        }
        // Fallback to localStorage
        return localStorage
      }),
      partialize: (state) => ({
        // Only persist favorite IDs
        favoriteIds: state.favoriteIds
      }),
      version: 1
    }
  )
)

// Utility hooks
export const useFavoriteIds = () => useFavoritesStore((state) => state.favoriteIds)
export const useFavoritesCount = () => useFavoritesStore((state) => state.favoriteIds.length)
export const useFavoritesLoading = () => useFavoritesStore((state) => state.loading)
export const useFavoritesError = () => useFavoritesStore((state) => state.error)

// Combined hooks
export const useFavoriteActions = () => useFavoritesStore((state) => ({
  toggleFavorite: state.toggleFavorite,
  addToFavorites: state.addToFavorites,
  removeFromFavorites: state.removeFromFavorites,
  clearFavorites: state.clearFavorites,
  exportFavorites: state.exportFavorites,
  importFavorites: state.importFavorites
}))