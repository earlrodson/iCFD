#!/usr/bin/env bun
/**
 * Seeds a Tagalog `topics` row for one of the 20 Apologetics-ceb essays by
 * parsing the Cebuano original's Pangutana/Tubag structure (see
 * tools/lib/apologetics-essay.ts) and translating each piece (title, intro,
 * each question, each response) individually via sailor2 — not by reusing
 * documents/Apologetics-tl/*.md, whose translated question/answer labels are
 * inconsistent ("Tanong:"/"Pagtutol:"/"Aral:") and unsafe to parse.
 *
 * category/tags/difficulty/related_topics are copied from the existing
 * `ceb` row for the same topic id — translating those is out of scope here.
 * Scripture citations are pulled verbatim from the Cebuano source (never
 * translated) so they match the `ceb` row's reference format exactly.
 *
 * Output is staged as JSON for review, not written to the database —
 * apply with tools/apply-apologetics-topic.ts after checking the content.
 *
 * Usage: bun tools/seed-apologetics-topic.ts <topic-id>
 */
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'
import { parseApologeticsEssay, extractScriptureRefs } from './lib/apologetics-essay'
import { translateCebToTlProse } from './lib/sailor-translate'

const ROOT = join(import.meta.dir, '..')

// topic id -> documents/Apologetics-ceb/<filename>.md
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
  console.error('Usage: bun tools/seed-apologetics-topic.ts <topic-id>')
  console.error(`Known topic ids: ${Object.keys(TOPIC_TO_FILE).join(', ')}`)
  process.exit(1)
}

const srcPath = join(ROOT, 'documents', 'Apologetics-ceb', filename)
const rawText = readFileSync(srcPath, 'utf8')
const essay = parseApologeticsEssay(rawText)
const scripture = extractScriptureRefs(essay)
const objectionRefCount = scripture.filter((s) => s.stance === 'objection').length

console.log(`\nParsed "${filename}": intro + ${essay.qa.length} Q&A block(s), ${scripture.length} scripture ref(s) (${objectionRefCount} objection)\n`)

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

const title = await translateCebToTlProse('title', essay.title)
const introTl = await translateCebToTlProse('intro (answer)', essay.intro)

const objections: { objection: string; response: string }[] = []
for (let i = 0; i < essay.qa.length; i++) {
  const { question, response } = essay.qa[i]
  const objection = await translateCebToTlProse(`Q${i + 1}`, question)
  const responseTl = await translateCebToTlProse(`A${i + 1}`, response)
  objections.push({ objection, response: responseTl })
}

// Mirrors the existing true-church 'ceb' row's convention of reusing the
// essay's own first question as the top-level `question` field.
const topicRow = {
  id: topicId,
  lang: 'tl' as const,
  category: cebRow.category,
  title,
  question: objections[0]?.objection ?? title,
  answer: introTl,
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
