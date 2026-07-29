/**
 * Shared Supabase admin-client bootstrap for one-off scripts/ tools.
 * Loads .env.local, builds a service-role client, and paginates full-table
 * reads past PostgREST's row cap. Import instead of re-pasting this setup.
 *
 * Usage:
 *   import { getSupabaseAdmin, fetchAll } from './lib/supabase-admin.mjs'
 *   const supabase = getSupabaseAdmin()
 *   const rows = await fetchAll(supabase, 'topics', 'id,lang,scripture')
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvLocal() {
  const envLines = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
  for (const line of envLines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
}

export function getSupabaseAdmin() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key || key.startsWith('your-')) {
    console.error('SUPABASE_SECRET_KEY not set in .env.local')
    process.exit(1)
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Paginates past PostgREST's default row cap (1000) for a full-table select. */
export async function fetchAll(supabase, table, select) {
  const PAGE = 1000
  let all = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE - 1)
    if (error) throw error
    all = all.concat(data)
    if (data.length < PAGE) break
  }
  return all
}
