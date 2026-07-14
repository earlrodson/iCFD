'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesState {
  favoriteIds: string[]
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],

      toggleFavorite: (id) => {
        const { favoriteIds } = get()
        if (favoriteIds.includes(id)) {
          set({ favoriteIds: favoriteIds.filter((f) => f !== id) })
        } else {
          set({ favoriteIds: [...favoriteIds, id] })
        }
      },

      isFavorite: (id) => get().favoriteIds.includes(id),
    }),
    {
      name: 'favorites-store',
    },
  ),
)
