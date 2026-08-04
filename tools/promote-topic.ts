#!/usr/bin/env bun
/**
 * Promotion stage for topics — flips the published:false safety gate set by
 * import-topic.ts to true, then moves the source file content/topics/validated/ ->
 * content/topics/published/. Mirrors tools/promote-quiz.ts's pattern; see that file's
 * header for why content/topics/published/ existed as an empty, unused folder before
 * this script — nothing previously flipped `published` or moved the file.
 *
 * Usage: bun tools/promote-topic.ts content/topics/validated/<topic_id>.json [--dry-run]
 */
import { join, basename } from 'path'
import { readFileSync, renameSync, mkdirSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')

const [, , inputPath, ...flags] = process.argv
const dryRun = flags.includes('--dry-run')
if (!inputPath) {
  console.error('Usage: bun tools/promote-topic.ts content/topics/validated/<topic_id>.json [--dry-run]')
  process.exit(1)
}

const topic = JSON.parse(readFileSync(inputPath, 'utf8')) as { topic_id: string }
if (!topic.topic_id) throw new Error(`${inputPath} has no topic_id`)

const supabase = getSupabaseAdmin()
console.log(`\nPromoting topic: ${topic.topic_id}${dryRun ? ' (dry run)' : ''}\n`)

const { data: row, error: findError } = await supabase.from('topics').select('id, published')
  .eq('id', topic.topic_id).eq('lang', 'en').maybeSingle()
if (findError) throw new Error(`lookup failed for ${topic.topic_id}: ${findError.message}`)
if (!row) {
  console.log(`✗ Not found in DB (run import-topic.ts first): ${topic.topic_id}`)
  process.exit(1)
}

if (row.published) {
  console.log(`Already published: ${topic.topic_id}`)
} else if (dryRun) {
  console.log(`[dry-run] would set published:true: ${topic.topic_id}`)
} else {
  const { error: updateError } = await supabase.from('topics').update({ published: true })
    .eq('id', topic.topic_id).eq('lang', 'en')
  if (updateError) throw new Error(`publish failed for ${topic.topic_id}: ${updateError.message}`)
  console.log(`✓ Published: ${topic.topic_id}`)
}

if (!dryRun) {
  const publishedDir = join(ROOT, 'content', 'topics', 'published')
  mkdirSync(publishedDir, { recursive: true })
  const destPath = join(publishedDir, basename(inputPath))
  renameSync(inputPath, destPath)
  console.log(`\n✓ Moved file to ${destPath}`)
} else {
  console.log(`\n✓ Dry run complete — file would move to content/topics/published/`)
}
