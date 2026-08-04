#!/usr/bin/env bun
/**
 * Promotion stage for quiz content — flips the active:false safety gate set by
 * import-quiz.ts to true, then moves the source file content/quiz/validated/ ->
 * content/quiz/published/, matching the topics/{validated,published} convention
 * (which exists as folders but has no script actually populating published/ yet —
 * this is the first real implementation of that promotion step, built for quiz first).
 *
 * Matches rows by the exact question text in the file, not just topic_id+tier, so
 * promoting one batch never accidentally activates a different batch for the same
 * topic/tier.
 *
 * Usage: bun tools/promote-quiz.ts content/quiz/validated/<topic_id>-<tier>.json [--dry-run]
 */
import { join, basename } from 'path'
import { readFileSync, renameSync, mkdirSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')

const [, , inputPath, ...flags] = process.argv
const dryRun = flags.includes('--dry-run')
if (!inputPath) {
  console.error('Usage: bun tools/promote-quiz.ts content/quiz/validated/<topic_id>-<tier>.json [--dry-run]')
  process.exit(1)
}

type QuizQuestion = { topic_id: string; tier: string; lang?: string; question: string }

const questions = JSON.parse(readFileSync(inputPath, 'utf8')) as QuizQuestion[]
if (!Array.isArray(questions) || questions.length === 0) {
  throw new Error(`${inputPath} does not contain a non-empty array of questions`)
}

const supabase = getSupabaseAdmin()
console.log(`\nPromoting quiz: ${questions[0].topic_id} / ${questions[0].tier} (${questions.length} questions)${dryRun ? ' (dry run)' : ''}\n`)

let promoted = 0
let missing = 0

for (const q of questions) {
  const lang = q.lang ?? 'en'
  const { data: row, error: findError } = await supabase.from('quiz_questions').select('id, active')
    .eq('topic_id', q.topic_id).eq('tier', q.tier).eq('lang', lang).eq('question', q.question).maybeSingle()
  if (findError) throw new Error(`lookup failed for "${q.question}": ${findError.message}`)
  if (!row) {
    console.log(`  ✗ Not found in DB (run import-quiz.ts first): "${q.question.slice(0, 60)}..."`)
    missing++
    continue
  }
  if (row.active) {
    console.log(`  Already active (id=${row.id}): "${q.question.slice(0, 60)}..."`)
    promoted++
    continue
  }
  if (dryRun) {
    console.log(`  [dry-run] would set active:true (id=${row.id}): "${q.question.slice(0, 60)}..."`)
    promoted++
    continue
  }
  const { error: updateError } = await supabase.from('quiz_questions').update({ active: true }).eq('id', row.id)
  if (updateError) throw new Error(`activate failed for id=${row.id}: ${updateError.message}`)
  console.log(`  ✓ Activated id=${row.id}: "${q.question.slice(0, 60)}..."`)
  promoted++
}

if (missing > 0) {
  console.log(`\n✗ ${missing} question(s) not in DB — not moving file. Run import-quiz.ts first.`)
  process.exit(1)
}

if (!dryRun) {
  const publishedDir = join(ROOT, 'content', 'quiz', 'published')
  mkdirSync(publishedDir, { recursive: true })
  const destPath = join(publishedDir, basename(inputPath))
  renameSync(inputPath, destPath)
  console.log(`\n✓ Promoted ${promoted} question(s), moved file to ${destPath}`)
} else {
  console.log(`\n✓ Dry run complete — ${promoted} would be promoted, file would move to content/quiz/published/`)
}
