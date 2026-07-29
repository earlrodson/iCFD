/**
 * Applies the mechanical fixes identified by audit-topics-content.mjs:
 *   1. Strip related_topics entries that reference a nonexistent topic id
 *      (renders as a dead-link chip — TopicContent.tsx does no existence check).
 *   2. Strip related_topics self-references (a topic listing itself as "related").
 *   3. Drop malformed objections entries (empty objection or response text).
 *
 * Does NOT fabricate content: it never invents scripture/catechism/father refs,
 * translations, or objection text — only removes provably-broken entries.
 *
 * Usage:
 *   node scripts/fix-topics-content.mjs           # report only
 *   node scripts/fix-topics-content.mjs --fix      # write corrections
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const APPLY_FIX = process.argv.includes('--fix')

const envLines = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY
if (!SUPABASE_URL || !SECRET_KEY || SECRET_KEY.startsWith('your-')) {
  console.error('SUPABASE_SECRET_KEY not set in .env.local')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function fetchAll(table, select) {
  const PAGE = 1000
  let all = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE - 1)
    if (error) throw error
    all = all.concat(data)
    if (data.length < PAGE) break
  }
  return all
}

function isMalformedObjection(o) {
  return !o || typeof o !== 'object' || !o.objection?.trim() || !o.response?.trim()
}

async function main() {
  const topics = await fetchAll(
    'topics',
    'id,lang,related_topics,objections',
  )
  const topicIdSet = new Set(topics.map(t => t.id))

  let relatedFixed = 0
  let objectionsFixed = 0

  for (const t of topics) {
    const update = {}

    const related = t.related_topics ?? []
    const nextRelated = related.filter(s => s !== t.id && topicIdSet.has(s))
    if (nextRelated.length !== related.length) {
      const dropped = related.filter(s => !nextRelated.includes(s))
      console.log(`${t.id} (${t.lang}): related_topics drop [${dropped.join(', ')}]`)
      update.related_topics = nextRelated
      relatedFixed++
    }

    const objections = t.objections ?? []
    const nextObjections = objections.filter(o => !isMalformedObjection(o))
    if (nextObjections.length !== objections.length) {
      console.log(`${t.id} (${t.lang}): objections drop ${objections.length - nextObjections.length} malformed entr${objections.length - nextObjections.length === 1 ? 'y' : 'ies'}`)
      update.objections = nextObjections
      objectionsFixed++
    }

    if (APPLY_FIX && Object.keys(update).length) {
      const { error } = await supabase
        .from('topics')
        .update(update)
        .eq('id', t.id)
        .eq('lang', t.lang)
      if (error) throw error
    }
  }

  console.log(`\n${relatedFixed} topics with related_topics ${APPLY_FIX ? 'fixed' : 'to fix'}, ${objectionsFixed} topics with objections ${APPLY_FIX ? 'fixed' : 'to fix'}.`)
  if (!APPLY_FIX && (relatedFixed || objectionsFixed)) console.log('Re-run with --fix to write changes.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
