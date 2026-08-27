#!/usr/bin/env bun
/**
 * Seeds a Tagalog `topics` row for one of the 20 Apologetics essays by
 * parsing the already-translated documents/Apologetics-tl/<file>.md directly
 * (see tools/lib/apologetics-essay-tl.ts) — unlike tools/seed-apologetics-topic.ts,
 * this does NOT call sailor2 to re-translate; it publishes the Tagalog essay
 * that already exists.
 *
 * Scripture citations are extracted from the Tagalog text itself (same
 * "(Book. C:V)" citation format as Cebuano, just reusing the generic
 * `extractScriptureRefs` stance-tagging logic from tools/lib/apologetics-essay.ts)
 * rather than from the Cebuano original — the Cebuano parser fails to find
 * any Q&A blocks in a few of these 20 files (missing colon after a bare
 * "Pagsupak" header), which would silently drop citations if relied upon.
 *
 * category/tags/difficulty/related_topics are copied from the existing `ceb`
 * row for the same topic id, same as the sibling script.
 *
 * Output is staged as JSON for review, not written to the database —
 * apply with tools/apply-apologetics-topic.ts after checking the content.
 *
 * Usage: bun tools/seed-apologetics-topic-tl.ts <topic-id>
 */
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'
import { parseApologeticsEssay, extractScriptureRefs } from './lib/apologetics-essay'
import { parseApologeticsEssayTl } from './lib/apologetics-essay-tl'

const ROOT = join(import.meta.dir, '..')

// topic id -> documents/Apologetics-{ceb,tl}/<filename>.md (same basename in both dirs)
const TOPIC_TO_FILE: Record<string, string> = {
  'sunday-observance': 'ADLAWNG IGPAPAHULAY.md',
  indulgences: 'ANG INDULHENSYA.md',
  'prayer-to-saints': 'ANG PAG-AMPO SA MGA SANTOS.md',
  'primacy-of-peter': 'ANG PAGKAPANGULO NI PEDRO.md',
  'holy-orders': 'ANG SACRAMENTO SA ORDEN.md',
  'holy-eucharist': 'ANG SANTOS NGA EUKARISTIYA.md',
  'holy-mass': 'ANG SANTOS NGA MISA.md',
  'bible-tradition-authority': 'BIBLIYA, TRADISYON UG AUTORIDAD SA STA. IGLESYA.md',
  'infant-baptism': 'BUNYAG SA BATA.md',
  'dietary-abstinence': 'KALAN-ON NGA GIDILI.md',
  salvation: 'KALUWASAN.md',
  'cross-sign-of-cross': 'KRUS UG PANGUROS.md',
  'sacred-images': 'LARAWAN.md',
  'true-church': 'MATUOD NGA IGLESYA.md',
  'divinity-of-christ': 'PAGKA-DIOS NI CRISTO.md',
  'confession-to-priest': 'PAGKOMPISAL SA PARI.md',
  purgatory: 'PURGATURYO.md',
  'holy-trinity': 'SANTISIMA TRINIDAD.md',
  'immaculate-conception': 'STA. MARIA, IMMACULADA CONCEPCION.md',
  'perpetual-virginity': 'STA. MARIA, KANUNAY’NG ULAY.md',
}

const [, , topicId] = process.argv
const filename = topicId ? TOPIC_TO_FILE[topicId] : undefined
if (!filename) {
  console.error('Usage: bun tools/seed-apologetics-topic-tl.ts <topic-id>')
  console.error(`Known topic ids: ${Object.keys(TOPIC_TO_FILE).join(', ')}`)
  process.exit(1)
}

const cebPath = join(ROOT, 'documents', 'Apologetics-ceb', filename)
const tlPath = join(ROOT, 'documents', 'Apologetics-tl', filename)
const cebEssay = parseApologeticsEssay(readFileSync(cebPath, 'utf8'))
const tlEssay = parseApologeticsEssayTl(readFileSync(tlPath, 'utf8'))
const scripture = extractScriptureRefs(tlEssay)
const objectionRefCount = scripture.filter((s) => s.stance === 'objection').length

console.log(`\nParsed "${filename}": intro + ${tlEssay.qa.length} Tagalog Q&A block(s) (ceb source has ${cebEssay.qa.length}), ${scripture.length} scripture ref(s) (${objectionRefCount} objection)\n`)
if (tlEssay.qa.length !== cebEssay.qa.length) {
  console.warn(`  WARNING: Tagalog block count differs from Cebuano source — review for dropped/merged content.`)
}

const supabase = getSupabaseAdmin()
const { data: cebRow, error } = await supabase
  .from('topics')
  .select('category,tags,difficulty,related_topics')
  .eq('id', topicId)
  .eq('lang', 'ceb')
  .maybeSingle()
if (error) throw error
if (!cebRow) {
  console.error(`No existing 'ceb' row for topic id "${topicId}" — cannot copy category/tags/difficulty.`)
  process.exit(1)
}

const objections = tlEssay.qa.map(({ question, response }) => ({ objection: question, response }))

// Mirrors the existing true-church 'ceb' row's convention of reusing the
// essay's own first question as the top-level `question` field.
const topicRow = {
  id: topicId,
  lang: 'tl' as const,
  category: cebRow.category,
  title: tlEssay.title,
  question: objections[0]?.objection ?? tlEssay.title,
  answer: tlEssay.intro,
  objections,
  scripture,
  tags: cebRow.tags,
  difficulty: cebRow.difficulty,
  related_topics: cebRow.related_topics,
  translation_source: 'manual' as const,
}

const outDir = join(ROOT, 'content', 'legacy-translations', 'needs-review')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${topicId}-tl-essay.json`)
writeFileSync(outPath, JSON.stringify(topicRow, null, 2))

console.log(`\n✓ Wrote ${outPath}`)
console.log('  Review it, then run: bun tools/apply-apologetics-topic.ts ' + outPath)
