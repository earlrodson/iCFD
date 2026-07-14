import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  initialized: boolean

  initialize: () => () => void
  signInWithMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,
  initialized: false,

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false, initialized: true })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false })
    })

    return () => subscription.unsubscribe()
  },

  signInWithMagicLink: async (email: string) => {
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    set(error ? { error: error.message, loading: false } : { loading: false })
  },

  signOut: async () => {
    set({ loading: true, error: null })
    await supabase.auth.signOut()
    set({ user: null, session: null, loading: false })
  },

  clearError: () => set({ error: null }),
}))
