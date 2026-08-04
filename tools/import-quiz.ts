#!/usr/bin/env bun
/**
 * Database Import stage for quiz content — mirrors tools/import-topic.ts's pattern.
 *
 * Inserts quiz_questions rows with active:false (safety gate, same reasoning as topics'
 * published:false) — a human/Claude review pass must promote them before they're live.
 * See tools/promote-quiz.ts for that step.
 *
 * Usage: bun tools/import-quiz.ts content/quiz/validated/<topic_id>-<tier>.json [--dry-run]
 */
import { readFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const [, , inputPath, ...flags] = process.argv
const dryRun = flags.includes('--dry-run')
if (!inputPath) {
  console.error('Usage: bun tools/import-quiz.ts content/quiz/validated/<topic_id>-<tier>.json [--dry-run]')
  process.exit(1)
}

type QuizQuestion = { topic_id: string; tier: string; lang?: string; question: string; choices: string[]; correct_index: number }

const questions = JSON.parse(readFileSync(inputPath, 'utf8')) as QuizQuestion[]
if (!Array.isArray(questions) || questions.length === 0) {
  throw new Error(`${inputPath} does not contain a non-empty array of questions`)
}

const supabase = getSupabaseAdmin()
console.log(`\nImporting quiz: ${questions[0].topic_id} / ${questions[0].tier} (${questions.length} questions)${dryRun ? ' (dry run)' : ''}\n`)

let inserted = 0
let skipped = 0

for (const q of questions) {
  const lang = q.lang ?? 'en'
  const { data: existing } = await supabase.from('quiz_questions').select('id')
    .eq('topic_id', q.topic_id).eq('tier', q.tier).eq('lang', lang).eq('question', q.question).maybeSingle()
  if (existing) {
    console.log(`  Skipped (already imported, id=${existing.id}): "${q.question.slice(0, 60)}..."`)
    skipped++
    continue
  }
  if (dryRun) {
    console.log(`  [dry-run] would insert (active:false, lang=${lang}): "${q.question.slice(0, 60)}..."`)
    inserted++
    continue
  }
  const { error } = await supabase.from('quiz_questions').insert({
    topic_id: q.topic_id,
    tier: q.tier,
    lang,
    question: q.question,
    choices: q.choices,
    correct_index: q.correct_index,
    active: false,
  })
  if (error) throw new Error(`insert quiz_questions failed for "${q.question}": ${error.message}`)
  inserted++
}

console.log(`\n✓ Done${dryRun ? ' (dry run — no writes made)' : ''} — ${inserted} inserted, ${skipped} skipped`)
if (!dryRun && inserted > 0) console.log(`  Run: bun tools/promote-quiz.ts ${inputPath}  (to make these live)`)
