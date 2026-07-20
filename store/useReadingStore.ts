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
  dirtyIds: string[]

  markAsRead: (id: string) => void
  markAsUnread: (id: string) => void
  recordVisit: (id: string) => void
  isRead: (id: string) => boolean
  getRecentlyViewed: (limit?: number) => string[]
  mergeFromCloud: (cloud: Record<string, { isRead: boolean; readAt: string }>) => void
  markSynced: (ids: string[]) => void
}

export const useReadingStore = create<ReadingState>()(
  persist(
    (set, get) => ({
      readProgress: {},
      readingHistory: {},
      dirtyIds: [],

      markAsRead: (id) =>
        set((s) => ({
          readProgress: {
            ...s.readProgress,
            [id]: { isRead: true, readAt: new Date().toISOString() },
          },
          dirtyIds: s.dirtyIds.includes(id) ? s.dirtyIds : [...s.dirtyIds, id],
        })),

      markAsUnread: (id) =>
        set((s) => ({
          readProgress: {
            ...s.readProgress,
            [id]: { isRead: false, readAt: null },
          },
          dirtyIds: s.dirtyIds.includes(id) ? s.dirtyIds : [...s.dirtyIds, id],
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

      // Union merge: if cloud says read and local doesn't, mark as read
      mergeFromCloud: (cloud) =>
        set((s) => {
          const merged = { ...s.readProgress }
          for (const [id, prog] of Object.entries(cloud)) {
            if (!merged[id]?.isRead && prog.isRead) {
              merged[id] = prog
            }
          }
          return { readProgress: merged }
        }),

      markSynced: (ids) =>
        set((s) => ({ dirtyIds: s.dirtyIds.filter((id) => !ids.includes(id)) })),

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
