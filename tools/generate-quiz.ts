#!/usr/bin/env bun
/**
 * Quiz-question generator, grounded in an existing topic's content — runs on qwen3.6:35b-mlx
 * (14b is deleted locally), per the generate-vs-extract model split confirmed 2026-08-03
 * (project CLAUDE.md, "Local LLM use"). Drafting new quiz prose is a generation task.
 *
 * correct_index always comes back as 0 from the model regardless of prompting (tested
 * 2026-08-03) — this script shuffles each question's choices after generation rather than
 * relying on the model to vary position.
 *
 * Usage: bun tools/generate-quiz.ts <topic_id> [tier] [count] [--lang <lang>] [--note "<feedback>"]
 *   tier defaults to the topic's own difficulty; count defaults to 5; lang defaults to 'en'
 *   (topics.id is not unique alone — some ids exist in multiple languages, e.g. purgatory
 *   has both 'ceb' and 'en' rows — lang disambiguates which row to ground on)
 *   --note appends a specific correction instruction to the prompt — for a targeted
 *   regeneration after a review-checklist fail, not a general quality knob.
 *
 * Output: content/quiz/generated/<topic_id>-<tier>.json
 */
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat'
// qwen3:14b is deleted locally — quiz generation runs on qwen3.6:35b-mlx instead.
const MODEL_35B = 'qwen3.6:35b-mlx'

function loadEnvLocal() {
  const envLines = readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')
  for (const line of envLines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
}
loadEnvLocal()

const argv = process.argv.slice(2)
const langFlagIdx = argv.indexOf('--lang')
const lang = langFlagIdx >= 0 ? argv[langFlagIdx + 1] : 'en'
const noteFlagIdx = argv.indexOf('--note')
const note = noteFlagIdx >= 0 ? argv[noteFlagIdx + 1] : null
const skipIdx = new Set([
  ...(langFlagIdx >= 0 ? [langFlagIdx, langFlagIdx + 1] : []),
  ...(noteFlagIdx >= 0 ? [noteFlagIdx, noteFlagIdx + 1] : []),
])
const positional = argv.filter((_, i) => !skipIdx.has(i))
const [topicId, tierArg, countArg] = positional
if (!topicId) {
  console.error('Usage: bun tools/generate-quiz.ts <topic_id> [tier] [count] [--lang <lang>]')
  process.exit(1)
}
const count = countArg ? parseInt(countArg) : 5

/** Strips <think>...</think> blocks and code fences, then extracts the first balanced {...} object. */
function extractJson(raw: string): any {
  const noThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const start = noThink.indexOf('{')
  const end = noThink.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error(`No JSON object found in model output:\n${raw.slice(0, 500)}`)
  return JSON.parse(noThink.slice(start, end + 1))
}

// stream MUST be true — see tools/generate-topic.ts callModel for why (Bun fetch idle-timeout
// on long buffered Ollama responses).
async function callModel(prompt: string, maxTokens: number): Promise<any> {
  const res = await fetch(OLLAMA_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_35B,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      think: false,
      options: { num_predict: maxTokens },
    }),
    signal: AbortSignal.timeout(20 * 60 * 1000),
  })
  if (!res.body) throw new Error('Ollama returned no response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (!line) continue
      const chunk = JSON.parse(line) as { message?: { content?: string }; done?: boolean; error?: string }
      if (chunk.error) throw new Error(`Ollama error: ${chunk.error}`)
      full += chunk.message?.content ?? ''
    }
  }
  return extractJson(full)
}

type QuizQuestion = { topic_id: string; tier: string; lang: string; question: string; choices: string[]; correct_index: number }

/** Fisher-Yates shuffle of choices, remapping correct_index to the answer's new position. */
function shuffleChoices(q: QuizQuestion): QuizQuestion {
  const correctAnswer = q.choices[q.correct_index]
  const choices = [...q.choices]
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[choices[i], choices[j]] = [choices[j], choices[i]]
  }
  return { ...q, choices, correct_index: choices.indexOf(correctAnswer) }
}

console.log(`\nGenerating quiz for topic: "${topicId}"\n`)

const supabase = getSupabaseAdmin()
const { data: topic, error } = await supabase
  .from('topics')
  .select('id,title,answer,answer_full,scripture,catechism,difficulty')
  .eq('id', topicId)
  .eq('lang', lang)
  .maybeSingle()
if (error) throw new Error(`Failed to fetch topic ${topicId} (lang=${lang}): ${error.message}`)
if (!topic) throw new Error(`Topic not found: ${topicId} (lang=${lang})`)

const tier = tierArg ?? topic.difficulty ?? 'intermediate'
const sourceText = topic.answer_full || (topic.answer as { summary?: string } | null)?.summary
if (!sourceText) throw new Error(`Topic ${topicId} has no answer_full or answer.summary to ground on`)

const LANG_NAMES: Record<string, string> = { en: 'English', ceb: 'Cebuano (Bisaya)', tl: 'Tagalog/Filipino' }
const langName = LANG_NAMES[lang] ?? lang

/** Returns the question text of any item whose 4 choices aren't all distinct (trimmed, case-insensitive). */
function findDuplicateChoiceQuestions(qs: QuizQuestion[]): string[] {
  return qs
    .filter((q) => new Set(q.choices.map((c) => c.trim().toLowerCase())).size !== q.choices.length)
    .map((q) => q.question)
}

/** Normalizes for near-duplicate comparison — trimmed, lowercased, whitespace-collapsed. */
function normalizeQuestion(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ')
}

function buildPrompt(chunkCount: number, askedQuestions: string[], extraNote: string | null): string {
  const avoidBlock = askedQuestions.length > 0
    ? `\n\nQuestions already asked in this quiz — do NOT repeat these or reword the same fact:\n${askedQuestions.map((q) => `- ${q}`).join('\n')}`
    : ''
  return `You are drafting quiz questions for a Catholic apologetics learning app. Base every question strictly on the source material below — do not introduce facts, citations, or claims not present in it.

Write the question and all 4 choices in ${langName} — the same language as the source material below. Do not translate into English.

Topic ID: ${topicId}
Title: ${topic.title}
Difficulty tier: ${tier}

Source material:
"""
${sourceText}
"""

Scripture references: ${JSON.stringify(topic.scripture ?? [])}
CCC paragraphs: ${JSON.stringify(topic.catechism ?? [])}

Task: Generate exactly ${chunkCount} multiple-choice quiz questions for tier '${tier}'. Output a single JSON object of this exact shape:

{"questions": [ {"topic_id": "${topicId}", "tier": "${tier}", "question": "...", "choices": ["...", "...", "...", "..."], "correct_index": 0}, ... ]}

The "questions" array must contain exactly ${chunkCount} objects. Each needs exactly 4 choices, one correct (correct_index 0-3), and all 4 choices must be distinct strings — never repeat the same choice text twice within a question. Cover ${chunkCount} distinct facts spread across the whole source material — do not ask near-duplicate questions about the same fact reworded. Before writing a question that quotes or attributes a line to a specific speaker (an angel, a saint, Scripture, etc.), verify against the source who actually said it — do not guess the speaker.${note ? `\n\nAdditional correction from a previous review: ${note}` : ''}${extraNote ? `\n\n${extraNote}` : ''}${avoidBlock} Output ONLY the raw JSON object, no markdown fences, no commentary.`
}

// Requesting the full bank_size (up to 90 for advanced) in one call runs the model out of
// distinct facts to draw on — it starts repeating near-identical questions past ~10-15.
// Generate in small chunks instead, feeding each chunk the questions already accepted so
// it doesn't retread the same ground, and de-duplicating across chunks by normalized text.
const CHUNK_SIZE = 8
const MAX_ATTEMPTS_PER_CHUNK = 3
const MAX_CHUNK_ROUNDS = Math.ceil(count / 2) + 10 // safety cap against an infinite loop

console.log(`[Generate] ${count} questions, tier "${tier}", lang "${lang}" (Claude, chunked ${CHUNK_SIZE} at a time)...`)

const accepted: QuizQuestion[] = []
const seenNormalized = new Set<string>()
let chunkRound = 0
let consecutiveEmptyRounds = 0
const MAX_CONSECUTIVE_EMPTY = 3
while (accepted.length < count && chunkRound < MAX_CHUNK_ROUNDS) {
  chunkRound++
  const remaining = count - accepted.length
  const chunkCount = Math.min(CHUNK_SIZE, remaining)
  const askedQuestions = accepted.map((q) => q.question)

  // 400 tokens/question covers question+4 choices with room for non-English tokenization
  // overhead and the accumulating avoid-list/note text pushing the model to ramble longer.
  const numPredict = chunkCount * 400 + 800

  let chunkQuestions: QuizQuestion[] = []
  let extraNote: string | null = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_CHUNK; attempt++) {
    try {
      const result = await callModel(buildPrompt(chunkCount, askedQuestions, extraNote), numPredict)
      chunkQuestions = result.questions as QuizQuestion[]
    } catch (err) {
      console.log(`  [round ${chunkRound}, attempt ${attempt}] model output failed to parse (${err instanceof Error ? err.message : err}), retrying`)
      extraNote = 'The previous attempt was cut off or malformed — keep the response shorter and ensure it is valid, complete JSON.'
      if (attempt === MAX_ATTEMPTS_PER_CHUNK) chunkQuestions = []
      continue
    }
    const dupes = findDuplicateChoiceQuestions(chunkQuestions)
    if (dupes.length === 0) break
    console.log(`  [round ${chunkRound}, attempt ${attempt}] ${dupes.length} question(s) had duplicate choices, retrying`)
    extraNote = `The previous attempt had duplicate choice strings within these questions — regenerate the whole batch and give each question 4 genuinely distinct choices: ${dupes.join(' | ')}`
    if (attempt === MAX_ATTEMPTS_PER_CHUNK) chunkQuestions = []
  }

  let acceptedFromChunk = 0
  for (const q of chunkQuestions) {
    const norm = normalizeQuestion(q.question)
    if (seenNormalized.has(norm)) continue
    seenNormalized.add(norm)
    accepted.push(q)
    acceptedFromChunk++
    if (accepted.length >= count) break
  }
  console.log(`  [round ${chunkRound}] accepted ${acceptedFromChunk}/${chunkQuestions.length} (total ${accepted.length}/${count})`)

  consecutiveEmptyRounds = acceptedFromChunk === 0 ? consecutiveEmptyRounds + 1 : 0
  if (consecutiveEmptyRounds >= MAX_CONSECUTIVE_EMPTY) {
    console.log(`  ⚠ ${MAX_CONSECUTIVE_EMPTY} rounds in a row produced no new distinct questions — the source material likely can't support ${count} at this tier. Stopping early.`)
    break
  }
}

if (accepted.length < count) {
  console.log(`  ⚠ Only got ${accepted.length}/${count} distinct questions after ${chunkRound} rounds — writing what we have.`)
}

const shuffled: QuizQuestion[] = accepted.map((q) => shuffleChoices({ ...q, lang }))

const indexCounts = shuffled.reduce<Record<number, number>>((acc, q) => {
  acc[q.correct_index] = (acc[q.correct_index] ?? 0) + 1
  return acc
}, {})
console.log(`  correct_index distribution after shuffle: ${JSON.stringify(indexCounts)}`)

const outDir = join(ROOT, 'content', 'quiz', 'generated')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${topicId}-${lang}-${tier}.json`)
writeFileSync(outPath, JSON.stringify(shuffled, null, 2))

console.log(`\n✓ Wrote ${outPath}`)
