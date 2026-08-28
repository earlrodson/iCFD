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
 * Citations inside `extra` (the shared/general-answer prose folded into
 * `answer_full`, see tools/lib/apologetics-essay-tl.ts) are tagged
 * 'supporting' and merged in separately since extractScriptureRefs only
 * scans `intro` + `qa`.
 *
 * `answer_full` = intro + extra blocks, joined — mirrors where this content
 * actually lives in the live 'ceb' rows (verified 2026-08-28 against
 * bible-tradition-authority/primacy-of-peter/purgatory: answer_full there is
 * the intro plus the shared "Tubag:"/conclusion prose, NOT the per-objection
 * responses). For single-objection essays `extra` is empty by construction
 * (the whole answer belongs to that one objection) — matches live ceb rows
 * for indulgences/salvation, where answer_full ≈ answer (intro) alone.
 *
 * category/tags/difficulty/related_topics are copied from the existing `ceb`
 * row for the same topic id, same as the sibling script. `question` is
 * generated from the same fixed template the ceb rows use ("Unsa ang
 * gitudlo sa Simbahang Katoliko bahin sa X?" -> "Ano ang itinuturo ng
 * Simbahang Katoliko tungkol sa X?"), reusing this essay's own (already
 * human-translated) title for X rather than machine-translating — verified
 * against 19 of the 20 ceb rows following this exact template 2026-08-28.
 * 'true-church' is the one exception (its ceb `question` is a standalone
 * question, not the template) and its `tl` row is already correct in
 * Supabase, so it's deliberately excluded from TOPIC_TO_FILE reruns.
 *
 * Output is staged as JSON for review, not written to the database —
 * apply with tools/apply-apologetics-topic.ts after checking the content.
 *
 * Usage: bun tools/seed-apologetics-topic-tl.ts <topic-id>
 */
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'
import { parseApologeticsEssay, extractScriptureRefs, CITATION_RE } from './lib/apologetics-essay'
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
  // 'true-church' deliberately omitted — its 'tl' row is already correct in
  // Supabase (proper question, 3 separate objections) and its ceb `question`
  // doesn't follow the template this script generates from, so regenerating
  // it would replace a good row with a worse one.
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
const extraRefs = [...new Set(tlEssay.extra.flatMap((block) => [...block.matchAll(CITATION_RE)].map((m) => m[1].replace(/\s+/g, ' ').trim())))]
for (const reference of extraRefs) {
  if (!scripture.some((s) => s.reference === reference)) scripture.push({ reference, stance: 'supporting' })
}
const objectionRefCount = scripture.filter((s) => s.stance === 'objection').length

console.log(`\nParsed "${filename}": intro + ${tlEssay.qa.length} Tagalog Q&A block(s) (ceb source has ${cebEssay.qa.length}), ${tlEssay.extra.length} extra block(s), ${scripture.length} scripture ref(s) (${objectionRefCount} objection)\n`)
if (tlEssay.qa.length !== cebEssay.qa.length) {
  console.warn(`  WARNING: Tagalog Q&A count (${tlEssay.qa.length}) differs from Cebuano source (${cebEssay.qa.length}) — review for dropped/merged content.`)
}

const supabase = getSupabaseAdmin()
const { data: cebRow, error } = await supabase
  .from('topics')
  .select('category,tags,difficulty,related_topics,question')
  .eq('id', topicId)
  .eq('lang', 'ceb')
  .maybeSingle()
if (error) throw error
if (!cebRow) {
  console.error(`No existing 'ceb' row for topic id "${topicId}" — cannot copy category/tags/difficulty.`)
  process.exit(1)
}

const objections = tlEssay.qa.map(({ question, response }) => ({ objection: question, response }))

const TEMPLATE_QUESTION = /^Unsa ang gitudlo sa Simbahang Katoliko bahin sa .+\?$/i
const question = TEMPLATE_QUESTION.test(cebRow.question)
  ? `Ano ang itinuturo ng Simbahang Katoliko tungkol sa ${tlEssay.title.toLowerCase()}?`
  : objections[0]?.objection ?? tlEssay.title
if (!TEMPLATE_QUESTION.test(cebRow.question)) {
  console.warn(`  WARNING: ceb question doesn't follow the template — falling back to first objection text for "question". Review manually.`)
}

const answer_full = [tlEssay.intro, ...tlEssay.extra].join('\n\n')

const topicRow = {
  id: topicId,
  lang: 'tl' as const,
  category: cebRow.category,
  title: tlEssay.title,
  question,
  answer: tlEssay.intro,
  answer_full,
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
