'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const NOTE_MAX_LENGTH = 1000

interface NotesState {
  notes: Record<string, string>
  setNote: (id: string, note: string) => void
  deleteNote: (id: string) => void
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: {},

      setNote: (id, note) =>
        set((s) => ({
          notes: { ...s.notes, [id]: note.slice(0, NOTE_MAX_LENGTH) },
        })),

      deleteNote: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.notes
          return { notes: rest }
        }),
    }),
    { name: 'notes-store' },
  ),
)
