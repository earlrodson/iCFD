#!/usr/bin/env bun
/**
 * Upserts content/topics/seed/<topic_id>.json files (produced by
 * tools/dump-seed-topics.ts) back into Supabase — one upsert per
 * (topic_id, lang). This is the canonical reseed path for the
 * basic-apologetics-course 20 topics, replacing scripts/output/topics/*.sql
 * + scripts/gen-course-seed-sql.mjs + scripts/seed-course-topics.mjs.
 *
 * Usage: bun tools/seed-topics.ts <topic_id> [<topic_id> ...] [--dry-run]
 *        bun tools/seed-topics.ts --all [--dry-run]
 */
import { join } from 'path'
import { readFileSync, readdirSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')
const seedDir = join(ROOT, 'content', 'topics', 'seed')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const rest = args.filter((a) => a !== '--dry-run')

let topicIds: string[]
if (rest[0] === '--all') {
  topicIds = readdirSync(seedDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
} else {
  topicIds = rest
}
if (!topicIds.length) {
  console.error('Usage: bun tools/seed-topics.ts <topic_id> [...] | --all [--dry-run]')
  process.exit(1)
}

const supabase = getSupabaseAdmin()
let changed = 0
let unchanged = 0

for (const topicId of topicIds) {
  const filePath = join(seedDir, `${topicId}.json`)
  const { topic_id, translations } = JSON.parse(readFileSync(filePath, 'utf8'))
  if (topic_id !== topicId) throw new Error(`${filePath}: topic_id field "${topic_id}" doesn't match filename`)

  for (const [lang, fields] of Object.entries(translations as Record<string, Record<string, unknown>>)) {
    const { data: existing } = await supabase.from('topics').select(
      'category,title,question,answer,answer_full,scripture,catechism,church_fathers,objections,tags,difficulty,related_topics,citations,published,translation_source',
    ).eq('id', topicId).eq('lang', lang).maybeSingle()

    const isSame = existing && JSON.stringify(existing) === JSON.stringify(fields)
    if (isSame) { unchanged++; console.log(`  = ${topicId} (${lang}) unchanged`); continue }

    changed++
    console.log(`  ${existing ? '~' : '+'} ${topicId} (${lang}) ${existing ? 'differs from DB' : 'not in DB — would insert'}${dryRun ? ' [dry-run]' : ''}`)
    if (!dryRun) {
      const { error } = await supabase.from('topics').upsert(
        { id: topicId, lang, ...fields, last_updated: new Date().toISOString() },
        { onConflict: 'id,lang' },
      )
      if (error) throw new Error(`upsert ${topicId}(${lang}) failed: ${error.message}`)
    }
  }
}

console.log(`\n${unchanged} unchanged, ${changed} ${dryRun ? 'would change' : 'changed'}${dryRun ? ' (dry run — no writes made)' : ''}`)
