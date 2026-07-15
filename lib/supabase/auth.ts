'use client'

/**
 * Auth helpers — all use createClient() factory (not a module-level singleton).
 *
 * Key rule from Supabase docs: use getUser() for any security check.
 * getUser() always validates the JWT with the Supabase server.
 * getSession() only reads from localStorage and can be spoofed client-side.
 */

import { createClient } from './client'
import { APP_CONFIG } from '@/lib/config'
import type { User, Session, AuthError } from '@supabase/supabase-js'

export type { User, Session, AuthError }

// ── Email / password ──────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  return createClient().auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  return createClient().auth.signUp({
    email,
    password,
    options: displayName ? { data: { display_name: displayName } } : undefined,
  })
}

// ── Magic link (passwordless) ─────────────────────────────────────────────────

export async function signInWithMagicLink(email: string) {
  return createClient().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${APP_CONFIG.siteUrl}/account`,
      // Magic link uses PKCE by default in @supabase/ssr
    },
  })
}

// ── OAuth (social login) ──────────────────────────────────────────────────────

export async function signInWithGoogle() {
  return createClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${APP_CONFIG.siteUrl}/account` },
  })
}

export async function signInWithApple() {
  return createClient().auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: `${APP_CONFIG.siteUrl}/account` },
  })
}

// ── Session management ────────────────────────────────────────────────────────

export async function signOut() {
  await createClient().auth.signOut()
}

/**
 * Securely verify the current user — always makes a server request.
 * Use this for any auth-gated logic. Never rely on getSession() alone.
 */
export async function getUser(): Promise<User | null> {
  const { data: { user } } = await createClient().auth.getUser()
  return user
}

/**
 * Get the current session from local storage (fast, no network).
 * Safe for display purposes (e.g. showing the user's name) but NOT
 * for security checks — use getUser() for that.
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 * INITIAL_SESSION fires on mount with the existing session (if any).
 */
export function onAuthStateChange(
  callback: (user: User | null) => void,
): () => void {
  const { data: { subscription } } = createClient().auth.onAuthStateChange(
    (_event, session) => callback(session?.user ?? null),
  )
  return () => subscription.unsubscribe()
}
