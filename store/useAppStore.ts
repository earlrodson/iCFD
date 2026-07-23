'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { contentLoader } from '@/lib/content/loader'
import { searchEngine } from '@/lib/search/engine'
import type { Topic, Language } from '@/data/schema/topic.schema'

type FontSize = 'small' | 'medium' | 'large'

interface AppState {
  currentLanguage: Language
  availableTopics: Topic[]
  loading: boolean
  error: string | null
  fontSize: FontSize

  setLanguage: (lang: Language) => void
  setFontSize: (size: FontSize) => void
  initialize: (lang?: Language) => Promise<void>
}

export type { FontSize }

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentLanguage: 'en',
      availableTopics: [],
      loading: false,
      error: null,
      fontSize: 'medium',

      setLanguage: (lang) => {
        set({ currentLanguage: lang })
        // Mirrored into a cookie (not just localStorage) so the server can
        // render the topic page in the right language on first paint instead
        // of always shipping English and swapping after hydration.
        document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`
        get().initialize(lang)
      },

      setFontSize: (size) => set({ fontSize: size }),

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
      partialize: (state) => ({ currentLanguage: state.currentLanguage, fontSize: state.fontSize }),
    },
  ),
)
