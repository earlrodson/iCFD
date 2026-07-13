/**
 * Server-side Drizzle client using the service role (bypasses RLS).
 * Only for use in migration scripts and seed scripts — NEVER import in browser code.
 */
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '@/drizzle/schema'

let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (_db) return _db
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required for server-side DB access')
  const client = postgres(url)
  _db = drizzle(client, { schema })
  return _db
}
