#!/usr/bin/env bun
/**
 * Combined Supabase + Drizzle snapshot for iCFD.
 *
 * This project's live DB is Supabase (project ref gdobgalhdepfpxexssvq), but
 * schema/migrations are authored through Drizzle files under drizzle/ rather
 * than the supabase/ CLI directory — so this snapshot reads generated Supabase
 * types for the live table shape, and drizzle/schema.ts + drizzle/migrations
 * for the source of truth on structure and RLS.
 *
 * Run: bun tools/snapshot.ts
 * Re-generate types first if schema changed:
 *   npx supabase gen types typescript --project-id gdobgalhdepfpxexssvq > lib/supabase/database.types.ts
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dir, '..')
const OUT  = join(ROOT, '.claude', 'snapshot.json')

function readFile(p: string) { try { return readFileSync(p, 'utf-8') } catch { return '' } }

// ── Stack ─────────────────────────────────────────────────────────────────────

function extractStack() {
  const pkg = JSON.parse(readFile(join(ROOT, 'package.json')) || '{}')
  return {
    runtime: 'pnpm',
    framework: 'Next.js (App Router)',
    orm: 'Drizzle (schema/migrations authoring) over a live Supabase Postgres DB',
    commands: {
      dev:        'pnpm dev',
      lint:       'pnpm lint',
      typecheck:  'pnpm type-check',
      test:       'pnpm test',
      test_e2e:   'pnpm test:e2e',
      db_seed:    'pnpm db:seed',
      gen_types:  'npx supabase gen types typescript --project-id gdobgalhdepfpxexssvq > lib/supabase/database.types.ts',
      snapshot:   'pnpm exec bun tools/snapshot.ts',
    },
    package_manager: 'pnpm',
    version: pkg.version,
  }
}

// ── Supabase: generated types ────────────────────────────────────────────────

function findTypesFile(): string | null {
  const candidates = [
    'lib/supabase/database.types.ts',
    'supabase/types/database.types.ts',
    'supabase/database.types.ts',
    'types/database.types.ts',
    'lib/database.types.ts',
  ]
  return candidates.find(p => existsSync(join(ROOT, p))) ?? null
}

function extractSupabaseTables(typesPath: string) {
  const source = readFile(join(ROOT, typesPath))
  const tables: Record<string, { row_columns: string[]; insert_columns: string[] }> = {}

  const tableRe = /(\w+):\s*\{\s*Row:\s*\{([^}]+)\}[^}]*Insert:\s*\{([^}]+)\}/g
  let m: RegExpExecArray | null
  while ((m = tableRe.exec(source)) !== null) {
    const [, name, rowBlock, insertBlock] = m
    const colRe = /(\w+)\s*:/g
    const rowCols: string[] = [], insCols: string[] = []
    let c: RegExpExecArray | null
    while ((c = colRe.exec(rowBlock)) !== null) rowCols.push(c[1])
    while ((c = colRe.exec(insertBlock)) !== null) insCols.push(c[1])
    tables[name] = { row_columns: rowCols, insert_columns: insCols }
  }
  return tables
}

// ── Supabase: edge functions ─────────────────────────────────────────────────

function extractEdgeFunctions(): string[] {
  const dir = join(ROOT, 'supabase', 'functions')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => !f.startsWith('_') && !f.startsWith('.'))
}

// ── Migrations + RLS live under drizzle/migrations for this project ─────────

function countMigrations(): number {
  const dir = join(ROOT, 'drizzle', 'migrations')
  if (!existsSync(dir)) return 0
  return readdirSync(dir).filter(f => f.endsWith('.sql')).length
}

function detectRls(): boolean {
  const dir = join(ROOT, 'drizzle', 'migrations')
  const rlsFile = join(ROOT, 'drizzle', 'rls.sql')
  const files = [
    ...(existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.sql')).map(f => join(dir, f)) : []),
    ...(existsSync(rlsFile) ? [rlsFile] : []),
  ]
  return files.some(f => readFile(f).toLowerCase().includes('row level security'))
}

// ── Drizzle: static schema parse ─────────────────────────────────────────────

function findDrizzleSchemaFiles(): string[] {
  const candidates = ['drizzle/schema.ts', 'db/schema.ts', 'src/db/schema.ts']
  return candidates.filter(p => existsSync(join(ROOT, p))).map(p => join(ROOT, p))
}

function extractDrizzleSchema(files: string[]) {
  const tables: Record<string, { columns: string[]; dialect: string }> = {}
  for (const file of files) {
    const source = readFile(file)
    const tableRe = /export const (\w+)\s*=\s*(pgTable|mysqlTable|sqliteTable|pgView|mysqlView)\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]+)\}/g
    let m: RegExpExecArray | null
    while ((m = tableRe.exec(source)) !== null) {
      const [, exportName, fn,, body] = m
      const dialect = fn.startsWith('pg') ? 'postgresql' : fn.startsWith('mysql') ? 'mysql' : 'sqlite'
      const colRe = /^\s+(\w+)\s*:/gm
      const columns: string[] = []
      let c: RegExpExecArray | null
      while ((c = colRe.exec(body)) !== null) columns.push(c[1])
      tables[exportName] = { columns, dialect }
    }
  }
  return tables
}

// ── Key files ─────────────────────────────────────────────────────────────────

function keyFiles() {
  const typesFile = findTypesFile()
  const schemaFiles = findDrizzleSchemaFiles()
  const candidates = {
    types:       typesFile ? [typesFile] : [],
    drizzle_schema: schemaFiles.map(f => f.replace(ROOT + '/', '')),
    drizzle_migrations: ['drizzle/migrations'],
    drizzle_rls: ['drizzle/rls.sql'],
    functions:   ['supabase/functions/'],
    client:      ['lib/supabase/client.ts', 'lib/supabase/server.ts', 'lib/supabase/admin.ts'],
    seed:        ['drizzle/seed.ts', 'scripts/seed.mjs'],
  }
  const result: Record<string, string[]> = {}
  for (const [k, paths] of Object.entries(candidates))
    result[k] = paths.filter(p => existsSync(join(ROOT, p)))
  return result
}

// ── Build ─────────────────────────────────────────────────────────────────────

const typesFile   = findTypesFile()
const supaTables  = typesFile ? extractSupabaseTables(typesFile) : {}
const functions   = extractEdgeFunctions()
const migrations  = countMigrations()
const rls         = detectRls()

const drizzleFiles  = findDrizzleSchemaFiles()
const drizzleTables = extractDrizzleSchema(drizzleFiles)

const snapshot = {
  generated_at: new Date().toISOString(),
  generated_by: 'tools/snapshot.ts',
  stack: extractStack(),
  db: {
    platforms: ['supabase', 'drizzle'],
    supabase: {
      project_ref:      'gdobgalhdepfpxexssvq',
      table_count:      Object.keys(supaTables).length,
      tables:           supaTables,
      edge_functions:   functions,
      migration_count:  migrations,
      rls_enabled:      rls,
      types_file:       typesFile ?? 'not found — run: npx supabase gen types typescript --project-id gdobgalhdepfpxexssvq > lib/supabase/database.types.ts',
      notes: [
        'Migrations and RLS are authored in drizzle/migrations, not supabase/migrations — this project does not use the supabase/ CLI directory for schema.',
        'scripture_verses (~69,835 rows) and ccc_paragraphs (2,865 rows) are Supabase/PostgREST-managed, not tracked in drizzle/schema.ts.',
      ],
    },
    drizzle: {
      schema_files: drizzleFiles.map(f => f.replace(ROOT + '/', '')),
      tables: drizzleTables,
      table_count: Object.keys(drizzleTables).length,
    },
  },
  key_files: keyFiles(),
  env_map: {
    // FILL IN: confirm/update after creation — values below are field names only, not secrets
    local: {
      NEXT_PUBLIC_SUPABASE_URL: 'FILL_IN — from .env.local',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'FILL_IN — from .env.local',
      SUPABASE_SECRET_KEY: 'FILL_IN — from .env.local (service role, never commit)',
      DATABASE_URL: 'FILL_IN — from .env.local',
    },
    production: {
      note: 'Same Supabase project (gdobgalhdepfpxexssvq) — no separate staging/prod project as of writing. Confirm in Supabase dashboard before assuming otherwise.',
    },
    notes: [
      'Never commit real key values — this file only records which env vars matter and where.',
      'A second, unrelated Supabase project exists on the same account (ztwdlkbnvsgjuzrwplxm, loans/investors schema) — not this app, ignore it.',
    ],
  },
}

const json = JSON.stringify(snapshot, null, 2)
writeFileSync(OUT, json)
console.log(`✓ Snapshot — supabase: ${Object.keys(supaTables).length} tables · ${functions.length} edge functions · ${migrations} migrations (rls: ${rls}) | drizzle: ${Object.keys(drizzleTables).length} tables → ${OUT}`)
