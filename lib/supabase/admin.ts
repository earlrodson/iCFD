/**
 * Service-role Supabase client — bypasses RLS entirely. Use ONLY inside
 * trusted server code (API routes) that has already verified the caller's
 * identity via a session-based client (see lib/supabase/server.ts).
 *
 * Needed for quiz scoring/certificate issuance: quiz_attempts, course_progress,
 * and certificates intentionally have no client-side INSERT policy (a user
 * must never be able to forge a passing score by writing directly), so the
 * only way to record a legitimate result is through code that authenticates
 * the user first, then writes with this elevated client.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
