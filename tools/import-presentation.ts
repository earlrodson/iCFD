#!/usr/bin/env bun
/**
 * Database import stage for presentations — mirrors tools/import-quiz.ts's pattern.
 *
 * Upserts a presentations row with published:false (safety gate, same reasoning as
 * topics'/quiz's published/active:false) — a human/Claude review pass must promote it
 * before it's live. See tools/promote-presentation.ts for that step.
 *
 * Usage: bun tools/import-presentation.ts content/presentations/validated/<topic_id>.json [--dry-run]
 */
import { readFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const [, , inputPath, ...flags] = process.argv
const dryRun = flags.includes('--dry-run')
if (!inputPath) {
  console.error('Usage: bun tools/import-presentation.ts content/presentations/validated/<topic_id>.json [--dry-run]')
  process.exit(1)
}

type Slide = { heading: string; bullets: string[] }
type Presentation = { topic_id: string; slides: Slide[] }

const presentation = JSON.parse(readFileSync(inputPath, 'utf8')) as Presentation
if (!presentation.topic_id) throw new Error(`${inputPath} has no topic_id`)
if (!Array.isArray(presentation.slides) || presentation.slides.length === 0) {
  throw new Error(`${inputPath} has no non-empty slides array`)
}

const supabase = getSupabaseAdmin()
console.log(`\nImporting presentation: ${presentation.topic_id} (${presentation.slides.length} slides)${dryRun ? ' (dry run)' : ''}\n`)

const { data: existing } = await supabase.from('presentations').select('topic_id')
  .eq('topic_id', presentation.topic_id).maybeSingle()

if (dryRun) {
  console.log(`  [dry-run] would ${existing ? 'update' : 'insert'} (published:false): ${presentation.topic_id}`)
} else {
  const { error } = await supabase.from('presentations').upsert({
    topic_id: presentation.topic_id,
    slides: presentation.slides,
    published: false,
  })
  if (error) throw new Error(`upsert presentations failed for ${presentation.topic_id}: ${error.message}`)
  console.log(`  ${existing ? 'Updated' : 'Inserted'}: ${presentation.topic_id}`)
}

console.log(`\n✓ Done${dryRun ? ' (dry run — no writes made)' : ''}`)
if (!dryRun) console.log(`  Run: bun tools/promote-presentation.ts ${inputPath}  (to make this live)`)
