#!/usr/bin/env bun
/**
 * Validation Pipeline (structure + facts) from
 * documents/VerifyArchitecture/content-generation-architecture-proposal.md.
 *
 * Reads a generated topic.json, runs JSON schema + structural checks + reference
 * resolution + Father quote verification, then moves it to content/topics/validated/
 * on success or content/topics/needs-review/ on failure (with errors printed).
 *
 * Usage: bun tools/validate-topic.ts content/topics/generated/<topic_id>.json
 */
import { z } from 'zod'
import { join, basename } from 'path'
import { mkdirSync, readFileSync, renameSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')
const TOPICS_DIR = join(ROOT, 'content', 'topics')

const [, , inputPath] = process.argv
if (!inputPath) {
  console.error('Usage: bun tools/validate-topic.ts content/topics/generated/<topic_id>.json')
  process.exit(1)
}

const CATEGORIES = ['tradition', 'scripture', 'sacraments', 'morality', 'history', 'apologetics'] as const
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const
const VERSIONS = ['NABRE', 'RSV-CE', 'DR', 'NAB'] as const

const TopicSchema = z.object({
  topic_id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be kebab-case'),
  lang: z.literal('en'),
  category: z.enum(CATEGORIES),
  title: z.string().min(1),
  question: z.string().min(1),
  summary: z.string(),
  answer_full: z.string(),
  scripture: z.array(z.object({ reference: z.string(), version: z.enum(VERSIONS), text: z.string().min(1) })),
  catechism: z.array(z.string().regex(/^CCC \d+$/)),
  church_fathers: z.array(z.object({
    author: z.string().min(1), quote: z.string().min(1), source: z.string().min(1),
    library_match: z.boolean().optional(),
  })),
  objections: z.array(z.object({ objection: z.string().min(1), response: z.string().min(1) })),
  tags: z.array(z.string()).min(1),
  difficulty: z.enum(DIFFICULTIES),
  related_topics: z.array(z.string()),
})

const errors: string[] = []
const warnings: string[] = []

const raw = JSON.parse(readFileSync(inputPath, 'utf8'))
const parsed = TopicSchema.safeParse(raw)
if (!parsed.success) {
  for (const issue of parsed.error.issues) errors.push(`schema: ${issue.path.join('.')} — ${issue.message}`)
}

if (parsed.success) {
  const topic = parsed.data

  // Markdown / word-count validation
  const wordCount = (s: string) => s.trim().split(/\s+/).length
  const summaryWords = wordCount(topic.summary)
  if (summaryWords < 500 || summaryWords > 1000) warnings.push(`summary is ${summaryWords} words (target 600-900)`)
  if (!/^>/m.test(topic.summary)) warnings.push('summary does not open with a Markdown blockquote')

  const answerWords = wordCount(topic.answer_full)
  if (answerWords < 1300 || answerWords > 2700) warnings.push(`answer_full is ${answerWords} words (target 1500-2500)`)
  if (!/^##\s/m.test(topic.answer_full)) errors.push('answer_full has no ## section headers')
  if (topic.answer_full.includes('[NEEDS SOURCE')) errors.push('answer_full contains an unresolved [NEEDS SOURCE] marker — retrieval gap, do not publish')

  // Duplicate detection within the record itself
  const dupeRefs = topic.scripture.map((s) => `${s.reference}|${s.version}`)
  const dupeCcc = topic.catechism
  const dupeFathers = topic.church_fathers.map((f) => `${f.author}|${f.quote}`)
  for (const [label, list] of [['scripture', dupeRefs], ['catechism', dupeCcc], ['church_fathers', dupeFathers]] as const) {
    const seen = new Set<string>()
    for (const item of list) {
      if (seen.has(item)) errors.push(`duplicate ${label} entry: ${item}`)
      seen.add(item)
    }
  }

  // Reference Resolution — re-verify against canonical DB (assembler already did this once;
  // re-checking here catches drift if the json was hand-edited between generate and validate)
  const supabase = getSupabaseAdmin()
  for (const ref of topic.scripture) {
    const { data } = await supabase.from('scripture_verses').select('text')
      .eq('reference', ref.reference).eq('version', ref.version).maybeSingle()
    if (!data) errors.push(`scripture reference does not resolve: ${ref.reference} (${ref.version})`)
    else if (data.text !== ref.text) errors.push(`scripture text mismatch for ${ref.reference}: does not match canonical corpus`)
  }
  for (const ccc of topic.catechism) {
    const num = parseInt(ccc.replace('CCC ', ''))
    const { data } = await supabase.from('ccc_paragraphs').select('paragraph').eq('paragraph', num).eq('lang', 'en').maybeSingle()
    if (!data) errors.push(`CCC number does not exist: ${ccc}`)
  }

  // Father Quote Verification — library match or flagged for Claude
  for (const father of topic.church_fathers) {
    const { data } = await supabase.from('church_father_quotes').select('id')
      .eq('author', father.author).eq('quote', father.quote).maybeSingle()
    if (!data && father.library_match !== false) {
      warnings.push(`Father quote not found in library and not flagged library_match:false — "${father.author}": "${father.quote.slice(0, 60)}..."`)
    }
    if (!data) warnings.push(`Father quote needs Claude verification: ${father.author}`)
  }
}

const topicId = raw.topic_id ?? basename(inputPath, '.json')
console.log(`\nValidation report for ${topicId}\n`)
if (errors.length) {
  console.log('Errors:')
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
} else {
  console.log('Errors: none')
}
if (warnings.length) {
  console.log('\nWarnings:')
  warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`))
}

const destDir = join(TOPICS_DIR, errors.length ? 'needs-review' : 'validated')
mkdirSync(destDir, { recursive: true })
const destPath = join(destDir, `${topicId}.json`)
renameSync(inputPath, destPath)
console.log(`\n${errors.length ? '✗ Moved to' : '✓ Moved to'} ${destPath}`)
process.exit(errors.length ? 1 : 0)
