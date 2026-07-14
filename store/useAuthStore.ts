import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Role } from '@/drizzle/schema'

interface AuthState {
  user: User | null
  session: Session | null
  role: Role | null
  loading: boolean
  error: string | null
  initialized: boolean

  initialize: () => () => void
  signInWithMagicLink: (email: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
  clearError: () => void
}

async function fetchRole(userId: string): Promise<Role | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('role')
    .eq('user_id', userId)
    .single()
  return (data?.role as Role) ?? null
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  role: null,
  loading: true,
  error: null,
  initialized: false,

  initialize: () => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const role = session?.user ? await fetchRole(session.user.id) : null
      set({ session, user: session?.user ?? null, role, loading: false, initialized: true })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const role = session?.user ? await fetchRole(session.user.id) : null
      set({ session, user: session?.user ?? null, role, loading: false })
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

  signInWithPassword: async (email: string, password: string) => {
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set(error ? { error: error.message, loading: false } : { loading: false })
  },

  signUp: async (email: string, password: string, displayName?: string) => {
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: displayName ? { data: { full_name: displayName } } : undefined,
    })
    set(error ? { error: error.message, loading: false } : { loading: false })
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    })
    if (error) set({ error: error.message, loading: false })
  },

  signOut: async () => {
    set({ loading: true, error: null })
    await supabase.auth.signOut()
    set({ user: null, session: null, role: null, loading: false })
  },

  refreshRole: async () => {
    const { user } = get()
    if (!user) return
    const role = await fetchRole(user.id)
    set({ role })
  },

  clearError: () => set({ error: null }),
}))
