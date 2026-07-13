import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const MAX_HISTORY = 10

interface ViewHistoryState {
  history: Array<{ topicId: string; viewedAt: number }>
  pushView: (topicId: string) => void
  getRecent: (limit?: number) => Array<{ topicId: string; viewedAt: number }>
  clearHistory: () => void
}

export const useViewHistoryStore = create<ViewHistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      pushView: (topicId) => {
        set(state => {
          const filtered = state.history.filter(h => h.topicId !== topicId)
          return {
            history: [{ topicId, viewedAt: Date.now() }, ...filtered].slice(0, MAX_HISTORY),
          }
        })
      },

      getRecent: (limit = 3) => get().history.slice(0, limit),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'iCFD-view-history',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export const useRecentViews = (limit = 3) =>
  useViewHistoryStore(state => state.history.slice(0, limit))
