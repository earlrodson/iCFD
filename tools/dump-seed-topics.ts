#!/usr/bin/env bun
/**
 * Dumps the live topics rows (en/ceb/tl) for a set of topic_ids into
 * content/topics/seed/<topic_id>.json — one file per topic, all languages,
 * mirroring the `topics` table row shape exactly (bare-string scripture refs,
 * not the newer generate-topic.ts object schema).
 *
 * This is the read half of the "one seed folder" consolidation for the
 * basic-apologetics-course 20 topics (see DECISIONS.md). Pairs with
 * tools/seed-topics.ts, which upserts these files back to Supabase.
 *
 * Usage: bun tools/dump-seed-topics.ts <topic_id> [<topic_id> ...]
 *        bun tools/dump-seed-topics.ts --course basic-apologetics-course
 */
import { join } from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')
const supabase = getSupabaseAdmin()

const args = process.argv.slice(2)
let topicIds: string[] = []
if (args[0] === '--course') {
  const slug = args[1]
  const { data, error } = await supabase.from('path_topics').select('topic_id,position').eq('path_slug', slug).order('position')
  if (error) throw error
  topicIds = data.map((r: { topic_id: string }) => r.topic_id)
} else {
  topicIds = args
}
if (!topicIds.length) {
  console.error('Usage: bun tools/dump-seed-topics.ts <topic_id> [...] | --course <path_slug>')
  process.exit(1)
}

const COLUMNS = 'lang,category,title,question,answer,answer_full,scripture,catechism,church_fathers,objections,tags,difficulty,related_topics,citations,published,translation_source'

const outDir = join(ROOT, 'content', 'topics', 'seed')
mkdirSync(outDir, { recursive: true })

for (const topicId of topicIds) {
  const { data: rows, error } = await supabase.from('topics').select(COLUMNS).eq('id', topicId)
  if (error) throw error
  if (!rows.length) { console.warn(`⚠ ${topicId}: no rows found, skipping`); continue }

  const translations: Record<string, unknown> = {}
  for (const row of rows) {
    const { lang, ...rest } = row as { lang: string; [k: string]: unknown }
    translations[lang] = rest
  }

  const outPath = join(outDir, `${topicId}.json`)
  writeFileSync(outPath, JSON.stringify({ topic_id: topicId, translations }, null, 2))
  console.log(`✓ ${topicId} (${rows.length} lang${rows.length === 1 ? '' : 's'}) → ${outPath}`)
}
