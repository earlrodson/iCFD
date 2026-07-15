'use client'

/**
 * Browser Supabase client — factory pattern (not a singleton).
 *
 * Call createClient() once per component/hook, not at module level.
 * @supabase/ssr's createBrowserClient handles token storage and refresh
 * automatically via localStorage and PKCE flow.
 *
 * Server-side equivalent: lib/supabase/server.ts (for when output: 'export'
 * is switched to a server deployment — see middleware.ts for session refresh).
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/** True when env vars are present (non-placeholder values). */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return (
    url.startsWith('https://') &&
    key.length > 20 &&
    !key.startsWith('your-')
  )
}
