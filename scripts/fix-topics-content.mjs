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

import { getSupabaseAdmin, fetchAll } from './lib/supabase-admin.mjs'

const APPLY_FIX = process.argv.includes('--fix')
const supabase = getSupabaseAdmin()

function isMalformedObjection(o) {
  return !o || typeof o !== 'object' || !o.objection?.trim() || !o.response?.trim()
}

async function main() {
  const topics = await fetchAll(
    supabase,
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
