'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const NOTE_MAX_LENGTH = 1000

interface NotesState {
  notes: Record<string, string>
  dirtyIds: string[]                        // topic IDs changed since last sync
  setNote: (id: string, note: string) => void
  deleteNote: (id: string) => void
  mergeFromCloud: (cloud: Record<string, string>) => void
  markSynced: (ids: string[]) => void
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: {},
      dirtyIds: [],

      setNote: (id, note) =>
        set((s) => ({
          notes: { ...s.notes, [id]: note.slice(0, NOTE_MAX_LENGTH) },
          dirtyIds: s.dirtyIds.includes(id) ? s.dirtyIds : [...s.dirtyIds, id],
        })),

      deleteNote: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.notes
          return {
            notes: rest,
            dirtyIds: s.dirtyIds.includes(id) ? s.dirtyIds : [...s.dirtyIds, id],
          }
        }),

      // Cloud fills in notes the local doesn't have; dirty local always wins
      mergeFromCloud: (cloud) =>
        set((s) => {
          const merged = { ...cloud }
          // Local notes (especially dirty ones) override cloud
          for (const [id, text] of Object.entries(s.notes)) {
            merged[id] = text
          }
          return { notes: merged }
        }),

      markSynced: (ids) =>
        set((s) => ({
          dirtyIds: s.dirtyIds.filter((id) => !ids.includes(id)),
        })),

      // Keep backward compat: expose getter for sync.ts
      getDirtyNotes: () => {
        const { notes, dirtyIds } = get()
        return Object.fromEntries(
          dirtyIds.filter((id) => id in notes).map((id) => [id, notes[id]])
        )
      },
    }),
    { name: 'notes-store' },
  ),
)
