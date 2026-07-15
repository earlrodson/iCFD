/**
 * Server-side Supabase client — for Route Handlers, Server Actions, and
 * Server Components when the app is deployed with a Node.js server
 * (i.e., when output: 'export' is removed from next.config.ts).
 *
 * Uses the Publishable key (not the Secret key) — the server client here is
 * for user-scoped operations protected by RLS. Use SUPABASE_SECRET_KEY only
 * in scripts/migrations that need to bypass RLS entirely.
 *
 * NOT used in the current static-export build. Kept here so the
 * migration to SSR is one import-swap away.
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    },
  )
}
