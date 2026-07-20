#!/usr/bin/env node
/**
 * Seeds a church document from a JSON file into Supabase.
 * Run AFTER reviewing the output from fetch-vatican-doc.mjs.
 *
 * Usage:
 *   node scripts/seed-church-doc.mjs scripts/output/<slug>.json [--dry-run]
 *
 * Options:
 *   --dry-run   Print what would be inserted without touching the DB
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (same pattern as seed.mjs)
const envLines = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq < 0) continue
  const key = trimmed.slice(0, eq).trim()
  const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  if (key && !process.env[key]) process.env[key] = val
}

// Use direct REST API (supabase-js doesn't accept the sb_secret_* key format yet)
async function restUpsert(supabaseUrl, serviceKey, table, rows, onConflict) {
  const url = onConflict
    ? `${supabaseUrl}/rest/v1/${table}?on_conflict=${onConflict}`
    : `${supabaseUrl}/rest/v1/${table}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`REST ${res.status}: ${body}`)
  }
}

const [jsonPath, flag] = process.argv.slice(2)
if (!jsonPath) {
  console.error('Usage: node scripts/seed-church-doc.mjs <path-to-json> [--dry-run]')
  process.exit(1)
}

const dryRun = flag === '--dry-run'
if (dryRun) console.log('--- DRY RUN — no DB writes ---\n')

const raw = readFileSync(jsonPath, 'utf8')
const { meta, sections } = JSON.parse(raw)

if (!meta?.slug || !sections?.length) {
  console.error('JSON must have { meta: { slug, title, ... }, sections: [...] }')
  process.exit(1)
}

console.log(`Document: ${meta.title} (${meta.slug})`)
console.log(`Sections: ${sections.length}`)
console.log(`Author:   ${meta.author}  Year: ${meta.year}`)
console.log()

if (dryRun) {
  console.log('META row:')
  console.log(JSON.stringify(meta, null, 2))
  console.log()
  console.log(`First 3 sections:`)
  sections.slice(0, 3).forEach(s => {
    console.log(`  §${s.section_num}${s.section_label ? ` [${s.section_label}]` : ''}: ${(s.text ?? '').slice(0, 80)}…`)
  })
  process.exit(0)
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Use legacy anon JWT key for REST API (sb_secret_* format not yet supported by the REST endpoint)
const serviceKey  = process.env.SUPABASE_ANON_JWT ?? process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_JWT in .env.local')
  process.exit(1)
}

// Upsert metadata
console.log('Upserting document metadata…')
try {
  await restUpsert(supabaseUrl, serviceKey, 'church_document_meta', [meta], 'slug')
  console.log('  ✓ Metadata saved')
} catch (err) {
  console.error('Meta upsert failed:', err.message)
  process.exit(1)
}

// Upsert sections in batches of 50
console.log(`Upserting ${sections.length} sections…`)
const rows = sections.map(s => ({ ...s, slug: meta.slug }))
const BATCH = 50
let inserted = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  try {
    await restUpsert(supabaseUrl, serviceKey, 'church_documents', batch, 'slug,section_num')
  } catch (err) {
    console.error(`\nBatch ${i}–${i + BATCH} failed:`, err.message)
    process.exit(1)
  }
  inserted += batch.length
  process.stdout.write(`\r  ${inserted}/${rows.length} sections`)
}
console.log('\n  ✓ Sections saved')
console.log()
console.log(`Done! "${meta.title}" is now in the database.`)
console.log(`Add it to the Library page in app/library/page.tsx if not already listed.`)
