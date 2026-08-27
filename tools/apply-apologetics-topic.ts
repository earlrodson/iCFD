#!/usr/bin/env bun
/**
 * Upserts a staged content/legacy-translations/needs-review/<id>-tl-essay.json
 * (from tools/seed-apologetics-topic.ts) into the `topics` table. Run only
 * after reviewing the file — this does no validation itself.
 *
 * Usage: bun tools/apply-apologetics-topic.ts <file.json> [--dry-run]
 */
import { readFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const [, , file] = process.argv
const dryRun = process.argv.includes('--dry-run')
if (!file) {
  console.error('Usage: bun tools/apply-apologetics-topic.ts <file.json> [--dry-run]')
  process.exit(1)
}

const row = JSON.parse(readFileSync(file, 'utf8'))

if (dryRun) {
  console.log(`[dry-run] would upsert (id="${row.id}", lang="${row.lang}"):`)
  console.log(JSON.stringify(row, null, 2))
  process.exit(0)
}

const supabase = getSupabaseAdmin()
const { error } = await supabase
  .from('topics')
  .upsert({ ...row, published: true, last_updated: new Date().toISOString() }, { onConflict: 'id,lang' })
if (error) throw error

console.log(`✓ Upserted topics row (id="${row.id}", lang="${row.lang}")`)
