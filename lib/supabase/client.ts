'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Returns null when keys are not configured (e.g. dev without .env.local).
// All callers must handle null gracefully — cloud features simply no-op offline.
export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'your-anon-key-here') {
    return null
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseBrowserClient>>
