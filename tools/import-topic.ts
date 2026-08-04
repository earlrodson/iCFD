#!/usr/bin/env bun
/**
 * Database Import stage from
 * documents/VerifyArchitecture/content-generation-architecture-proposal.md
 * ("topic.json -> Validator -> Importer -> Supabase", "No manual SQL writing").
 *
 * Upserts a validated topic.json directly via the Supabase admin client — no hand-written
 * SQL, no Admin UI copy-paste. New topics default to published:false so a human still
 * approves visibility in the Admin UI as the final gate.
 *
 * Verified against a live topics row (2026-07-30): `scripture` is a string[] of bare
 * reference strings (no per-entry version), `catechism` is a number[] of CCC paragraph
 * numbers, `church_fathers` is a number[] of church_father_quotes.id — NOT the nested
 * objects documents/content-generation-prompt.md's SQL example implies. This script
 * follows the live schema, not that doc.
 *
 * Usage: bun tools/import-topic.ts content/topics/validated/<topic_id>.json [--dry-run]
 */
import { readFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const [, , inputPath, ...flags] = process.argv
const dryRun = flags.includes('--dry-run')
if (!inputPath) {
  console.error('Usage: bun tools/import-topic.ts content/topics/validated/<topic_id>.json [--dry-run]')
  process.exit(1)
}

const topic = JSON.parse(readFileSync(inputPath, 'utf8'))
const supabase = getSupabaseAdmin()

async function resolveScriptureVerse(reference: string, version: string, text: string): Promise<void> {
  const { data: existing } = await supabase.from('scripture_verses').select('reference')
    .eq('reference', reference).eq('version', version).maybeSingle()
  if (existing) return
  if (dryRun) { console.log(`  [dry-run] would insert scripture_verses: ${reference} (${version})`); return }
  const { error } = await supabase.from('scripture_verses').insert({ reference, version, text })
  if (error) throw new Error(`insert scripture_verses(${reference}, ${version}) failed: ${error.message}`)
}

async function resolveFatherQuoteId(author: string, quote: string, source: string): Promise<number | null> {
  const { data: existing } = await supabase.from('church_father_quotes').select('id')
    .eq('author', author).eq('quote', quote).maybeSingle()
  if (existing) return existing.id
  if (dryRun) { console.log(`  [dry-run] would insert church_father_quotes: ${author}`); return null }
  const { data, error } = await supabase.from('church_father_quotes').insert({ author, quote, source }).select('id').single()
  if (error) throw new Error(`insert church_father_quotes(${author}) failed: ${error.message}`)
  return data.id
}

console.log(`\nImporting topic: ${topic.topic_id}${dryRun ? ' (dry run)' : ''}\n`)

console.log('[1/3] Resolving scripture_verses...')
for (const s of topic.scripture as { reference: string; version: string; text: string }[]) {
  await resolveScriptureVerse(s.reference, s.version, s.text)
}
const scriptureReferences = (topic.scripture as { reference: string }[]).map((s) => s.reference)

console.log('[2/3] Resolving church_father_quotes...')
const fatherIds: number[] = []
const skippedFathers: string[] = []
for (const f of topic.church_fathers as { author: string; quote: string; source: string; library_match?: boolean }[]) {
  if (f.library_match === false) { skippedFathers.push(f.author); continue } // needs Claude verification first
  const id = await resolveFatherQuoteId(f.author, f.quote, f.source)
  if (id !== null) fatherIds.push(id)
}
if (skippedFathers.length) console.log(`  Skipped (unverified, needs Claude review): ${skippedFathers.join(', ')}`)

const catechismNumbers = (topic.catechism as string[]).map((c) => parseInt(c.replace('CCC ', '')))

console.log('[3/3] Upserting topics row...')
const { data: existingTopic } = await supabase.from('topics').select('id').eq('id', topic.topic_id).eq('lang', 'en').maybeSingle()

const row = {
  id: topic.topic_id,
  lang: 'en',
  category: topic.category,
  title: topic.title,
  question: topic.question,
  answer: { summary: topic.summary },
  answer_full: topic.answer_full,
  scripture: scriptureReferences,
  catechism: catechismNumbers,
  church_fathers: fatherIds,
  objections: topic.objections,
  tags: topic.tags,
  difficulty: topic.difficulty,
  related_topics: topic.related_topics,
  ...(existingTopic ? {} : { published: false }),
}

if (dryRun) {
  console.log(`  [dry-run] would ${existingTopic ? 'update' : 'insert (published:false)'} topics row:`)
  console.log(JSON.stringify(row, null, 2))
} else {
  const { error } = await supabase.from('topics').upsert(row, { onConflict: 'id,lang' })
  if (error) throw new Error(`upsert topics(${topic.topic_id}) failed: ${error.message}`)
  console.log(`  ✓ ${existingTopic ? 'Updated' : 'Inserted (published:false)'} topics/${topic.topic_id}`)
}

console.log(`\n✓ Done${dryRun ? ' (dry run — no writes made)' : ''}`)
