import { create } from 'zustand'
import type { Path } from '@/data/schema/path.schema'

interface PathsState {
  paths: Path[]
  loading: boolean
  loadPaths: () => Promise<void>
  getPath: (slug: string) => Path | undefined
  getPathProgress: (slug: string, readTopicIds: string[]) => { completed: number; total: number; percent: number }
  getNextTopic: (slug: string, readTopicIds: string[]) => string | undefined
}

export const usePathsStore = create<PathsState>()((set, get) => ({
  paths: [],
  loading: false,

  loadPaths: async () => {
    if (get().paths.length > 0) return
    set({ loading: true })
    try {
      const res = await fetch('/data/paths.json')
      const data = await res.json()
      set({ paths: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  getPath: (slug) => get().paths.find(p => p.slug === slug),

  getPathProgress: (slug, readTopicIds) => {
    const path = get().paths.find(p => p.slug === slug)
    if (!path) return { completed: 0, total: 0, percent: 0 }
    const readSet = new Set(readTopicIds)
    const completed = path.topics.filter(id => readSet.has(id)).length
    const total = path.topics.length
    return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 }
  },

  getNextTopic: (slug, readTopicIds) => {
    const path = get().paths.find(p => p.slug === slug)
    if (!path) return undefined
    const readSet = new Set(readTopicIds)
    return path.topics.find(id => !readSet.has(id))
  },
}))
