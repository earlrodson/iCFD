'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesState {
  favoriteIds: string[]
  addedAt: Record<string, string> // id → ISO timestamp
  dirtyIds: string[]              // IDs toggled since last sync
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
  exportFavorites: () => string
  mergeFromCloud: (cloud: { id: string; addedAt: string }[]) => void
  markSynced: (ids: string[]) => void
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      addedAt: {},
      dirtyIds: [],

      toggleFavorite: (id) => {
        const { favoriteIds, addedAt } = get()
        if (favoriteIds.includes(id)) {
          const { [id]: _, ...rest } = addedAt
          set({
            favoriteIds: favoriteIds.filter((f) => f !== id),
            addedAt: rest,
            dirtyIds: [...get().dirtyIds.filter((d) => d !== id), id],
          })
        } else {
          set({
            favoriteIds: [...favoriteIds, id],
            addedAt: { ...addedAt, [id]: new Date().toISOString() },
            dirtyIds: [...get().dirtyIds.filter((d) => d !== id), id],
          })
        }
      },

      isFavorite: (id) => get().favoriteIds.includes(id),

      exportFavorites: () => {
        const { favoriteIds, addedAt } = get()
        const data = favoriteIds.map((id) => ({ id, addedAt: addedAt[id] ?? null }))
        return JSON.stringify(data, null, 2)
      },

      // Union merge: add cloud favorites not already local; local always kept
      mergeFromCloud: (cloud) =>
        set((s) => {
          const newIds = cloud.map((f) => f.id).filter((id) => !s.favoriteIds.includes(id))
          if (!newIds.length) return s
          const newAddedAt = { ...s.addedAt }
          for (const { id, addedAt } of cloud) {
            if (!s.addedAt[id]) newAddedAt[id] = addedAt
          }
          return { favoriteIds: [...s.favoriteIds, ...newIds], addedAt: newAddedAt }
        }),

      markSynced: (ids) =>
        set((s) => ({ dirtyIds: s.dirtyIds.filter((id) => !ids.includes(id)) })),
    }),
    { name: 'favorites-store' },
  ),
)
