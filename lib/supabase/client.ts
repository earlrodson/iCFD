'use client'

/**
 * Browser Supabase client — factory pattern (not a singleton).
 *
 * Uses the new Supabase Publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
 * which replaces the legacy anon key. Safe to expose in the browser — all
 * access is still protected by Row Level Security policies.
 *
 * Server-side equivalent: lib/supabase/server.ts (uses SUPABASE_SECRET_KEY,
 * only active when output: 'export' is removed for a server deployment).
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

/** True when env vars are present and not placeholders. */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
  return (
    url.startsWith('https://') &&
    key.length > 20 &&
    !key.startsWith('your-')
  )
}
