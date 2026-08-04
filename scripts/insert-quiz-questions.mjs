/**
 * Bulk-inserts quiz questions from a JSON file into quiz_questions.
 * Run with: node scripts/insert-quiz-questions.mjs <path-to-json>
 *
 * JSON shape:
 * [
 *   { "topic_id": "purgatory", "tier": "beginner", "path_slug": null,
 *     "question": "...", "choices": ["a","b","c","d"], "correct_index": 1 },
 *   ...
 * ]
 */

import { readFileSync } from 'fs'
import { getSupabaseAdmin } from './lib/supabase-admin.mjs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/insert-quiz-questions.mjs <path-to-json>')
  process.exit(1)
}

const rows = JSON.parse(readFileSync(file, 'utf8'))
if (!Array.isArray(rows) || rows.length === 0) {
  console.error('JSON must be a non-empty array of question rows')
  process.exit(1)
}

for (const row of rows) {
  if (!row.topic_id || !row.tier || !row.question || !Array.isArray(row.choices) || typeof row.correct_index !== 'number') {
    console.error('Invalid row:', row)
    process.exit(1)
  }
}

const supabase = getSupabaseAdmin()
const CHUNK = 200
let inserted = 0
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK)
  const { error } = await supabase.from('quiz_questions').insert(
    chunk.map((r) => ({
      topic_id: r.topic_id,
      tier: r.tier,
      question: r.question,
      choices: r.choices,
      correct_index: r.correct_index,
      path_slug: r.path_slug ?? null,
    })),
  )
  if (error) {
    console.error('Insert error:', error.message)
    process.exit(1)
  }
  inserted += chunk.length
}

console.log(`Inserted ${inserted} question(s) from ${file}`)
