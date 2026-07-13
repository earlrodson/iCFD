import { create } from 'zustand'
import { db } from '@/lib/db/indexeddb'

interface ProgressState {
  readTopicIds: string[]
  readTimestamps: Record<string, number>
  loading: boolean
  loadProgress: () => Promise<void>
  markAsRead: (topicId: string) => Promise<void>
  markAsUnread: (topicId: string) => Promise<void>
  isRead: (topicId: string) => boolean
  getReadCount: () => number
}

export const useProgressStore = create<ProgressState>()((set, get) => ({
  readTopicIds: [],
  readTimestamps: {},
  loading: false,

  loadProgress: async () => {
    set({ loading: true })
    try {
      const all = await db.readProgress.getAll()
      const readTopicIds = all.map(r => r.topicId)
      const readTimestamps: Record<string, number> = {}
      for (const r of all) readTimestamps[r.topicId] = r.readAt
      set({ readTopicIds, readTimestamps, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  markAsRead: async (topicId) => {
    const now = Date.now()
    await db.readProgress.set(topicId, now)
    set(state => ({
      readTopicIds: state.readTopicIds.includes(topicId)
        ? state.readTopicIds
        : [...state.readTopicIds, topicId],
      readTimestamps: { ...state.readTimestamps, [topicId]: now },
    }))
  },

  markAsUnread: async (topicId) => {
    await db.readProgress.delete(topicId)
    set(state => {
      const next = { ...state.readTimestamps }
      delete next[topicId]
      return {
        readTopicIds: state.readTopicIds.filter(id => id !== topicId),
        readTimestamps: next,
      }
    })
  },

  isRead: (topicId) => get().readTopicIds.includes(topicId),
  getReadCount: () => get().readTopicIds.length,
}))

export const useIsRead = (topicId: string) =>
  useProgressStore(state => state.readTopicIds.includes(topicId))

export const useReadCount = () =>
  useProgressStore(state => state.readTopicIds.length)
