/**
 * Custom migration runner for iCFD.
 * Run with: pnpm db:migrate
 *
 * Applies all .sql files in drizzle/migrations/ in alphabetical order.
 * Tracks applied files in a _cfd_migrations table so re-runs are safe.
 *
 * Handles the case where the initial schema (0000_nice_shaman.sql) was
 * already applied manually — it detects existing tables and skips the file
 * while still marking it as applied.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle/migrations')

// Drizzle-generated files use this delimiter between statements
function splitStatements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean)
}

async function tableExists(client: postgres.Sql, name: string): Promise<boolean> {
  const rows = await client`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS e
  `
  return rows[0].e as boolean
}

async function migrate() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('ERROR: DATABASE_URL is not set in .env.local')
    process.exit(1)
  }

  const client = postgres(url, { prepare: false, max: 1 })

  try {
    // Create migration tracking table
    await client`
      CREATE TABLE IF NOT EXISTS _cfd_migrations (
        id         serial PRIMARY KEY,
        filename   text NOT NULL UNIQUE,
        applied_at timestamptz DEFAULT now()
      )
    `

    const applied = await client`SELECT filename FROM _cfd_migrations ORDER BY id`
    const appliedSet = new Set(applied.map(r => r.filename as string))

    // All .sql files sorted (skip meta/ subdirectory)
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort()

    let didApply = false

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ✓  ${file}  (already applied)`)
        continue
      }

      // Special handling: the initial Drizzle-generated schema migration.
      // If the core tables already exist (applied manually), skip running it
      // but still mark it as applied so future runs don't try again.
      if (file === '0000_nice_shaman.sql') {
        const alreadyExists = await tableExists(client, 'favorites')
        if (alreadyExists) {
          console.log(`  ⏭  ${file}  (tables already exist — marking applied)`)
          await client`INSERT INTO _cfd_migrations (filename) VALUES (${file})`
          continue
        }
      }

      // Special handling: 001_rls.sql (idempotent) — if RLS is already enabled
      // on topics we know it was applied before; run it anyway (safe) but note it.
      // The file itself is fully idempotent so no risk of re-running.

      console.log(`  →  Applying ${file}…`)
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
      const statements = splitStatements(sql)

      for (const stmt of statements) {
        if (stmt.trim()) await client.unsafe(stmt)
      }

      await client`INSERT INTO _cfd_migrations (filename) VALUES (${file})`
      console.log(`  ✓  ${file}  applied`)
      didApply = true
    }

    if (!didApply) {
      console.log('\nDatabase is already up to date.')
    } else {
      console.log('\nAll migrations applied ✓')
    }
  } finally {
    await client.end()
  }
}

migrate().catch(e => {
  console.error('\nMigration failed:', e.message ?? e)
  process.exit(1)
})
