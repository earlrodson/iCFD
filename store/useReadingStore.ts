'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ReadProgress {
  isRead: boolean
  readAt: string | null
}

interface VisitRecord {
  visitedAt: string
  readCount: number
}

interface ReadingState {
  readProgress: Record<string, ReadProgress>
  readingHistory: Record<string, VisitRecord>

  markAsRead: (id: string) => void
  markAsUnread: (id: string) => void
  recordVisit: (id: string) => void
  isRead: (id: string) => boolean
  getRecentlyViewed: (limit?: number) => string[]
}

export const useReadingStore = create<ReadingState>()(
  persist(
    (set, get) => ({
      readProgress: {},
      readingHistory: {},

      markAsRead: (id) =>
        set((s) => ({
          readProgress: {
            ...s.readProgress,
            [id]: { isRead: true, readAt: new Date().toISOString() },
          },
        })),

      markAsUnread: (id) =>
        set((s) => ({
          readProgress: {
            ...s.readProgress,
            [id]: { isRead: false, readAt: null },
          },
        })),

      recordVisit: (id) =>
        set((s) => {
          const prev = s.readingHistory[id]
          return {
            readingHistory: {
              ...s.readingHistory,
              [id]: {
                visitedAt: new Date().toISOString(),
                readCount: (prev?.readCount ?? 0) + 1,
              },
            },
          }
        }),

      isRead: (id) => get().readProgress[id]?.isRead ?? false,

      getRecentlyViewed: (limit = 3) => {
        const history = get().readingHistory
        return Object.entries(history)
          .sort(([, a], [, b]) => b.visitedAt.localeCompare(a.visitedAt))
          .slice(0, limit)
          .map(([id]) => id)
      },
    }),
    { name: 'reading-store' },
  ),
)
