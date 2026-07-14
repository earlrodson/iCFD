'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { contentLoader } from '@/lib/content/loader'
import { searchEngine } from '@/lib/search/engine'
import type { Topic, Language } from '@/data/schema/topic.schema'

interface AppState {
  currentLanguage: Language
  availableTopics: Topic[]
  loading: boolean
  error: string | null

  setLanguage: (lang: Language) => void
  initialize: (lang?: Language) => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentLanguage: 'en',
      availableTopics: [],
      loading: false,
      error: null,

      setLanguage: (lang) => {
        set({ currentLanguage: lang })
        get().initialize(lang)
      },

      initialize: async (lang?: Language) => {
        const language = lang ?? get().currentLanguage
        set({ loading: true, error: null })
        try {
          const content = await contentLoader.loadContent(language)
          searchEngine.index(content.topics)
          set({ availableTopics: content.topics, loading: false })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to load content',
            loading: false,
          })
        }
      },
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ currentLanguage: state.currentLanguage }),
    },
  ),
)
