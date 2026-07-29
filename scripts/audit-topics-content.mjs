/**
 * Full content-integrity audit for `topics` and its cross-referenced sections.
 *
 * Mirrors the scripture-ref bug found earlier: any field that stores an ID/slug
 * pointing at another table can silently go stale (wrong number, renamed slug,
 * range instead of a discrete key) with no error — it just quietly drops from
 * the rendered page. This checks every such link plus basic section completeness.
 *
 * Usage:
 *   node scripts/audit-topics-content.mjs             # report only
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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

async function main() {
  const topics = await fetchAll(
    'topics',
    'id,lang,title,scripture,catechism,church_fathers,objections,related_topics,translation_source,published',
  )
  const topicIdSet = new Set(topics.map(t => t.id))

  const cccRows = await fetchAll('ccc_paragraphs', 'paragraph')
  const cccSet = new Set(cccRows.map(r => r.paragraph))

  const fatherRows = await fetchAll('church_father_quotes', 'id')
  const fatherIdSet = new Set(fatherRows.map(r => r.id))

  console.log(`Loaded ${topics.length} topics, ${cccSet.size} CCC paragraphs, ${fatherIdSet.size} father quotes.\n`)

  // ── 1. catechism numbers that don't exist in ccc_paragraphs ──────────────────
  console.log('## Broken catechism refs (number not in ccc_paragraphs)')
  let brokenCatechism = 0
  for (const t of topics) {
    const nums = (t.catechism ?? [])
    const bad = nums.filter(n => !cccSet.has(n))
    if (bad.length) {
      console.log(`  ${t.id} (${t.lang}): ${bad.join(', ')}`)
      brokenCatechism += bad.length
    }
  }
  console.log(`  -> ${brokenCatechism} broken refs\n`)

  // ── 2. church_fathers IDs that don't exist in church_father_quotes ───────────
  console.log('## Broken church_fathers refs (id not in church_father_quotes)')
  let brokenFathers = 0
  for (const t of topics) {
    const ids = (t.church_fathers ?? [])
    const bad = ids.filter(id => !fatherIdSet.has(id))
    if (bad.length) {
      console.log(`  ${t.id} (${t.lang}): ${bad.join(', ')}`)
      brokenFathers += bad.length
    }
  }
  console.log(`  -> ${brokenFathers} broken refs\n`)

  // ── 3. related_topics slugs that don't exist as a topic id ───────────────────
  console.log('## Broken related_topics (slug not in topics.id)')
  let brokenRelated = 0
  for (const t of topics) {
    const slugs = (t.related_topics ?? [])
    const bad = slugs.filter(s => !topicIdSet.has(s))
    if (bad.length) {
      console.log(`  ${t.id} (${t.lang}): ${bad.join(', ')}`)
      brokenRelated += bad.length
    }
    const selfRef = slugs.filter(s => s === t.id)
    if (selfRef.length) console.log(`  ${t.id} (${t.lang}): self-referencing related_topics`)
  }
  console.log(`  -> ${brokenRelated} broken refs\n`)

  // ── 4. malformed objections (missing objection or response text) ─────────────
  console.log('## Malformed objections entries')
  let malformedObjections = 0
  for (const t of topics) {
    const objs = t.objections ?? []
    objs.forEach((o, i) => {
      const bad = !o || typeof o !== 'object' || !o.objection?.trim() || !o.response?.trim()
      if (bad) {
        console.log(`  ${t.id} (${t.lang}): objections[${i}] = ${JSON.stringify(o)}`)
        malformedObjections++
      }
    })
  }
  console.log(`  -> ${malformedObjections} malformed entries\n`)

  // ── 5. empty sections (topic has zero refs in a given field) ─────────────────
  console.log('## Topics missing entire sections')
  const empties = { scripture: [], catechism: [], church_fathers: [], objections: [] }
  for (const t of topics) {
    if (!(t.scripture ?? []).length) empties.scripture.push(`${t.id} (${t.lang})`)
    if (!(t.catechism ?? []).length) empties.catechism.push(`${t.id} (${t.lang})`)
    if (!(t.church_fathers ?? []).length) empties.church_fathers.push(`${t.id} (${t.lang})`)
    if (!(t.objections ?? []).length) empties.objections.push(`${t.id} (${t.lang})`)
  }
  for (const [field, list] of Object.entries(empties)) {
    console.log(`  ${field}: ${list.length} topics empty`)
    if (list.length && list.length <= 15) for (const l of list) console.log(`    ${l}`)
  }
  console.log()

  // ── 6. translation stubs never translated ─────────────────────────────────────
  console.log('## Non-English topics still translation_source=stub')
  const stubs = topics.filter(t => t.lang !== 'en' && t.translation_source === 'stub')
  for (const t of stubs) console.log(`  ${t.id} (${t.lang})`)
  console.log(`  -> ${stubs.length} stub translations\n`)

  // ── 7. unpublished topics ──────────────────────────────────────────────────────
  const unpublished = topics.filter(t => !t.published)
  console.log(`## Unpublished topics: ${unpublished.length}`)
  for (const t of unpublished) console.log(`  ${t.id} (${t.lang})`)

  // ── 8. topic ids present in one lang but missing in others ───────────────────
  console.log('\n## Topic ids missing translations (present in en, absent in tl/ceb, or vice versa)')
  const byId = new Map()
  for (const t of topics) {
    if (!byId.has(t.id)) byId.set(t.id, new Set())
    byId.get(t.id).add(t.lang)
  }
  const allLangs = new Set(topics.map(t => t.lang))
  let missingLangCount = 0
  for (const [id, langs] of byId) {
    const missing = [...allLangs].filter(l => !langs.has(l))
    if (missing.length) {
      console.log(`  ${id}: has [${[...langs].join(',')}], missing [${missing.join(',')}]`)
      missingLangCount++
    }
  }
  console.log(`  -> ${missingLangCount} topics with incomplete language coverage`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
