'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesState {
  favoriteIds: string[]
  addedAt: Record<string, string> // id → ISO timestamp
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
  exportFavorites: () => string
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      addedAt: {},

      toggleFavorite: (id) => {
        const { favoriteIds, addedAt } = get()
        if (favoriteIds.includes(id)) {
          const { [id]: _, ...rest } = addedAt
          set({ favoriteIds: favoriteIds.filter((f) => f !== id), addedAt: rest })
        } else {
          set({
            favoriteIds: [...favoriteIds, id],
            addedAt: { ...addedAt, [id]: new Date().toISOString() },
          })
        }
      },

      isFavorite: (id) => get().favoriteIds.includes(id),

      exportFavorites: () => {
        const { favoriteIds, addedAt } = get()
        const data = favoriteIds.map((id) => ({ id, addedAt: addedAt[id] ?? null }))
        return JSON.stringify(data, null, 2)
      },
    }),
    {
      name: 'favorites-store',
    },
  ),
)
