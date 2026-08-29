#!/usr/bin/env bun
/**
 * Translates one legacy handbook.json topic (title/question/answer) into
 * Cebuano or Tagalog via sailor2:20b, sharing the same protect/translate/
 * verify machinery as translate-topic.ts (tools/lib/sailor-translate.ts).
 *
 * Built 2026-08-13 after a full Tier 0 run (validate-translation-legacy.ts)
 * found 59 of the 72 "covered" ceb/tl handbook topics were never actually
 * translated — just raw English filed under lang: "ceb"/"tl". This produces
 * a real, faithful translation to close that gap. Deliberately NOT trying
 * to replicate the independently-authored style of the 7 real ceb/tl
 * translations already in the seed (different Church Father quotes,
 * different CCC citations, translated tags) — that's full content
 * generation, not translation, and would need theology-RAG grounding to do
 * safely at this scale. This keeps the English source's own citations and
 * structure, which Tier 0 can then verify against.
 *
 * catechism is kept as-is (CCC numbers are language-independent — the "CCC "
 * prefix is stripped only because that's the format the existing real ceb/tl
 * entries use, e.g. "1374" not "CCC 1374"). churchFathers/tags/difficulty/
 * relatedTopics/category are copied from English untouched — translating
 * those is out of scope for this pass. scripture is swapped to a local Bible
 * version where translateScripture finds a match, same as translate-topic.ts.
 *
 * Usage: bun tools/translate-legacy-topic.ts <en-topic-id> <ceb|tl>
 * Output: content/legacy-translations/needs-review/<topic_id>-<lang>.json
 */
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { LANG_NAMES, translateProse, translateScripture } from './lib/sailor-translate'

const ROOT = join(import.meta.dir, '..')

const [, , topicId, langArg] = process.argv
const lang = langArg as 'ceb' | 'tl'
if (!topicId || !['ceb', 'tl'].includes(lang)) {
  console.error('Usage: bun tools/translate-legacy-topic.ts <en-topic-id> <ceb|tl>')
  process.exit(1)
}

type LegacyTopic = {
  id: string
  category: string
  title: string
  question: string
  answer: string
  scripture: { reference: string; text: string; version: string }[]
  catechism: string[]
  churchFathers: unknown
  tags: string[]
  difficulty: string
  relatedTopics: string[]
}

const en: LegacyTopic[] = JSON.parse(readFileSync(join(ROOT, 'public/data/content/en/handbook.json'), 'utf8')).topics
const topic = en.find((t) => t.id === topicId)
if (!topic) {
  console.error(`No topic with id "${topicId}" found in public/data/content/en/handbook.json`)
  process.exit(1)
}

console.log(`\nTranslating "${topic.id}" → ${LANG_NAMES[lang]}\n`)

const title = await translateProse(lang, 'title', topic.title)
const question = await translateProse(lang, 'question', topic.question)
const answer = await translateProse(lang, 'answer', topic.answer)
const scripture = topic.scripture?.length ? await translateScripture(lang, topic.scripture) : topic.scripture

const translated = {
  ...topic,
  lang,
  title,
  question,
  answer,
  scripture,
  catechism: topic.catechism.map((c) => c.replace(/^CCC\s*/, '')),
  // churchFathers, tags, difficulty, relatedTopics, category: copied as-is from English — out of scope for this pass
}

const outDir = join(ROOT, 'content', 'legacy-translations', 'needs-review')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${topic.id}-${lang}.json`)
writeFileSync(outPath, JSON.stringify(translated, null, 2))

console.log(`\n✓ Wrote ${outPath}`)
console.log(`  Run: bun tools/validate-translation-legacy.ts ${topic.id} ${lang} ${outPath}`)
console.log(`  Then review before merging into public/data/content/${lang}/handbook.json.`)
