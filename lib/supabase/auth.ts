'use client'

import { getSupabaseBrowserClient } from './client'
import type { User, Session } from '@supabase/supabase-js'

export type { User, Session }

export async function signInWithEmail(email: string, password: string) {
  const sb = getSupabaseBrowserClient()
  if (!sb) return { data: null, error: new Error('Supabase not configured') }
  return sb.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  const sb = getSupabaseBrowserClient()
  if (!sb) return { data: null, error: new Error('Supabase not configured') }
  return sb.auth.signUp({
    email,
    password,
    options: displayName ? { data: { display_name: displayName } } : undefined,
  })
}

export async function signOut() {
  const sb = getSupabaseBrowserClient()
  if (!sb) return
  await sb.auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabaseBrowserClient()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session
}

export async function getUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user ?? null
}
