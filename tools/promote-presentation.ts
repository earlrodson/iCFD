#!/usr/bin/env bun
/**
 * Promotion stage for presentations — flips the published:false safety gate set by
 * import-presentation.ts to true, then moves the source file
 * content/presentations/validated/ -> content/presentations/published/. Mirrors
 * tools/promote-topic.ts's pattern.
 *
 * Usage: bun tools/promote-presentation.ts content/presentations/validated/<topic_id>.json [--dry-run]
 */
import { join, basename } from 'path'
import { readFileSync, renameSync, mkdirSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')

const [, , inputPath, ...flags] = process.argv
const dryRun = flags.includes('--dry-run')
if (!inputPath) {
  console.error('Usage: bun tools/promote-presentation.ts content/presentations/validated/<topic_id>.json [--dry-run]')
  process.exit(1)
}

const presentation = JSON.parse(readFileSync(inputPath, 'utf8')) as { topic_id: string }
if (!presentation.topic_id) throw new Error(`${inputPath} has no topic_id`)

const supabase = getSupabaseAdmin()
console.log(`\nPromoting presentation: ${presentation.topic_id}${dryRun ? ' (dry run)' : ''}\n`)

const { data: row, error: findError } = await supabase.from('presentations').select('topic_id, published')
  .eq('topic_id', presentation.topic_id).maybeSingle()
if (findError) throw new Error(`lookup failed for ${presentation.topic_id}: ${findError.message}`)
if (!row) {
  console.log(`✗ Not found in DB (run import-presentation.ts first): ${presentation.topic_id}`)
  process.exit(1)
}

if (row.published) {
  console.log(`Already published: ${presentation.topic_id}`)
} else if (dryRun) {
  console.log(`[dry-run] would set published:true: ${presentation.topic_id}`)
} else {
  const { error: updateError } = await supabase.from('presentations').update({ published: true })
    .eq('topic_id', presentation.topic_id)
  if (updateError) throw new Error(`publish failed for ${presentation.topic_id}: ${updateError.message}`)
  console.log(`✓ Published: ${presentation.topic_id}`)
}

if (!dryRun) {
  const publishedDir = join(ROOT, 'content', 'presentations', 'published')
  mkdirSync(publishedDir, { recursive: true })
  const destPath = join(publishedDir, basename(inputPath))
  renameSync(inputPath, destPath)
  console.log(`\n✓ Moved file to ${destPath}`)
} else {
  console.log(`\n✓ Dry run complete — file would move to content/presentations/published/`)
}
