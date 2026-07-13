import { create } from 'zustand'
import { db } from '@/lib/db/indexeddb'

interface NotesState {
  notes: Record<string, string>
  loading: boolean
  loadNotes: () => Promise<void>
  setNote: (topicId: string, text: string) => Promise<void>
  deleteNote: (topicId: string) => Promise<void>
  getNote: (topicId: string) => string
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: {},
  loading: false,

  loadNotes: async () => {
    set({ loading: true })
    try {
      const all = await db.notes.getAll()
      const notes: Record<string, string> = {}
      for (const n of all) notes[n.topicId] = n.text
      set({ notes, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  setNote: async (topicId, text) => {
    await db.notes.set(topicId, text)
    set(state => ({ notes: { ...state.notes, [topicId]: text } }))
  },

  deleteNote: async (topicId) => {
    await db.notes.delete(topicId)
    set(state => {
      const next = { ...state.notes }
      delete next[topicId]
      return { notes: next }
    })
  },

  getNote: (topicId) => get().notes[topicId] ?? '',
}))

export const useTopicNote = (topicId: string) =>
  useNotesStore(state => state.notes[topicId] ?? '')
