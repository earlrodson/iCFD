#!/usr/bin/env node
/**
 * Seeds a course-manual topics JSON (from scripts/parse-course-manual.mjs) into
 * Supabase. Two-step upsert:
 *   1. scripture_verses  — library rows, ON CONFLICT (reference, version) skip
 *   2. topics            — ON CONFLICT (id, lang) upsert, scripture stored as
 *                          reference strings resolved against scripture_verses
 *                          at render time (see lib/content/database.ts)
 *
 * Usage:
 *   node scripts/seed-course-topics.mjs scripts/output/<file>.json [--dry-run]
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const [jsonPath, flag] = process.argv.slice(2)
if (!jsonPath) {
  console.error('Usage: node scripts/seed-course-topics.mjs <path-to-json> [--dry-run]')
  process.exit(1)
}
const dryRun = flag === '--dry-run'

const { topics, scripture_verses: verses } = JSON.parse(readFileSync(resolve(jsonPath), 'utf8'))
if (!topics?.length) {
  console.error('JSON must have { topics: [...], scripture_verses: [...] }')
  process.exit(1)
}

console.log(`Topics:  ${topics.length}`)
console.log(`Verses:  ${verses?.length ?? 0}`)

if (dryRun) {
  console.log('\n--- DRY RUN — no DB writes ---\n')
  console.log('First topic:')
  console.log(JSON.stringify(topics[0], null, 2))
  console.log('\nFirst 3 verses:')
  console.log(JSON.stringify(verses.slice(0, 3), null, 2))
  process.exit(0)
}

// ── Load .env.local ───────────────────────────────────────────────────────────

const envLines = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const val = trimmed.slice(eq + 1).trim()
  if (key && !process.env[key]) process.env[key] = val
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SECRET_KEY || SECRET_KEY.startsWith('your-')) {
  console.error('❌  SUPABASE_SECRET_KEY not set in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 1. scripture_verses ───────────────────────────────────────────────────────

console.log('\n── scripture_verses ─────────────────────')
if (verses?.length) {
  const { error } = await supabase
    .from('scripture_verses')
    .upsert(verses, { onConflict: 'reference,version', ignoreDuplicates: true })

  if (error) {
    console.error('  ✗', error.message)
    process.exit(1)
  }
  console.log(`  ✓ ${verses.length} verses upserted (version=CEB, skipped where already present)`)
}

// ── 2. topics ──────────────────────────────────────────────────────────────

console.log('\n── topics ───────────────────────────────')
const rows = topics.map((t) => ({
  id: t.id,
  lang: t.lang,
  category: t.category,
  title: t.title,
  question: t.question,
  answer: t.answer,
  answer_full: t.answerFull ?? null,
  objections: t.objections ?? [],
  scripture: t.scripture ?? [],
  tags: t.tags ?? [],
  difficulty: t.difficulty,
  related_topics: t.related_topics ?? [],
  last_updated: t.last_updated,
}))

const { error } = await supabase.from('topics').upsert(rows, { onConflict: 'id,lang' })

if (error) {
  console.error('  ✗', error.message)
  process.exit(1)
}
console.log(`  ✓ ${rows.length} topics upserted (lang=${rows[0]?.lang})`)
console.log('\n✅  Done')
