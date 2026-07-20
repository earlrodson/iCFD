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
import { createClient } from '@supabase/supabase-js'

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
const serviceKey  = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Upsert metadata
console.log('Upserting document metadata…')
const { error: metaErr } = await supabase
  .from('church_document_meta')
  .upsert(meta, { onConflict: 'slug' })
if (metaErr) {
  console.error('Meta upsert failed:', metaErr.message)
  process.exit(1)
}
console.log('  ✓ Metadata saved')

// Upsert sections in batches of 50
console.log(`Upserting ${sections.length} sections…`)
const rows = sections.map(s => ({ ...s, slug: meta.slug }))
const BATCH = 50
let inserted = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await supabase
    .from('church_documents')
    .upsert(batch, { onConflict: 'slug,section_num' })
  if (error) {
    console.error(`Batch ${i}–${i + BATCH} failed:`, error.message)
    process.exit(1)
  }
  inserted += batch.length
  process.stdout.write(`\r  ${inserted}/${rows.length} sections`)
}
console.log('\n  ✓ Sections saved')
console.log()
console.log(`Done! "${meta.title}" is now in the database.`)
console.log(`Add it to the Library page in app/library/page.tsx if not already listed.`)
