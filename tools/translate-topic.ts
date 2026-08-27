#!/usr/bin/env bun
/**
 * Translates a generated English topic into Cebuano or Tagalog via sailor2:20b.
 * (qwen3.6:27b-mlx/35b-mlx tested 2026-08-09: both stall on long multi-citation
 * fields — thinking-mode overhead exhausts the token budget before real output
 * is produced, timing out even at num_predict 16000. sailor2 remains the only
 * model fast enough for answer_full-length content on this hardware.)
 *
 * Scope (decided 2026-08-08): only original prose is translated — title, question,
 * summary, answer_full, objections. Anything sourced from an external document
 * (CCC/conciliar/Church-document citations, Church Father quotes, blockquoted
 * source text) is protected and stays in English — those are quoted historical
 * sources, not this article's own content, and letting a translation model
 * touch a citation risks it fabricating or misattributing one (confirmed
 * failure mode: sailor2 invented a nonexistent "(CCC 641)" and separately
 * misattributed "(CCC 643)" to an uncited sentence in testing).
 *
 * Scripture is swapped to a Cebuano/Tagalog Bible version only where
 * scripture_verses actually has a matching row for that reference+lang;
 * otherwise the English (NABRE) text and English reference are kept
 * unchanged. Coverage is currently thin (verified 2026-08-08): 23 rows in
 * "Cebuano Ang Dating Biblia", 20 in "Ang Biblia" (Tagalog) — most verses
 * will fall through to English, by design.
 *
 * Usage: bun tools/translate-topic.ts <path/to/topic.json> <ceb|tl>
 * Output: content/topics/generated/<topic_id>-<lang>.json
 */
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { LANG_NAMES, translateProse, translateScripture } from './lib/sailor-translate'

const ROOT = join(import.meta.dir, '..')

const [, , inPath, langArg] = process.argv
if (!inPath || !langArg || !['ceb', 'tl'].includes(langArg)) {
  console.error('Usage: bun tools/translate-topic.ts <path/to/topic.json> <ceb|tl>')
  process.exit(1)
}
const lang = langArg as 'ceb' | 'tl'

const topic = JSON.parse(readFileSync(inPath, 'utf8'))

// ---- run ----

console.log(`\nTranslating "${topic.topic_id}" → ${LANG_NAMES[lang]}\n`)

const title = await translateProse(lang, 'title', topic.title)
const question = await translateProse(lang, 'question', topic.question)
const summary = await translateProse(lang, 'summary', topic.summary)
const answerFull = await translateProse(lang, 'answer_full', topic.answer_full)

const objections = []
for (const [i, o] of (topic.objections ?? []).entries()) {
  const objection = await translateProse(lang, `objections[${i}].objection`, o.objection)
  const response = await translateProse(lang, `objections[${i}].response`, o.response)
  objections.push({ objection, response })
}

const scripture = topic.scripture?.length ? await translateScripture(lang, topic.scripture) : topic.scripture

const translated = {
  ...topic,
  lang,
  title,
  question,
  summary,
  answer_full: answerFull,
  objections,
  scripture,
  // church_fathers, catechism: left untouched — historical sources / labels, not this article's content
}

const outDir = join(ROOT, 'content', 'topics', 'generated')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${topic.topic_id}-${lang}.json`)
writeFileSync(outPath, JSON.stringify(translated, null, 2))

console.log(`\n✓ Wrote ${outPath}`)
console.log('  Review before validating — the model can still drop clauses inside long sentences (see documents/content-review-checklist.md).')
