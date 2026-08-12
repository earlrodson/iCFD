#!/usr/bin/env bun
/**
 * Quiz generator for local apologetics docs with a Supak N / Tubag N (objection/answer)
 * structure that aren't yet mirrored into Supabase as a topic (see tools/generate-quiz.ts
 * for the Supabase-backed equivalent).
 *
 * Split confirmed 2026-08-04: qwen3.5:9b extracts a short {question, answer} label per
 * Supak/Tubag pair — condensing text already given to it is extraction, not composition,
 * so it belongs on 9b per the generate-vs-extract routing rule, not 14b (which produced
 * wrong correct_index placement and theological mix-ups on this same document when asked
 * to draft full questions directly).
 *
 * This script never asks a model to place the correct answer or pick distractors. It
 * assembles each question itself: correct choice = the pair's own extracted answer,
 * distractors = other pairs' extracted answers (real, grounded, never invented) — then
 * shuffles and computes correct_index in code, same pattern as tools/generate-quiz.ts.
 *
 * Coverage note: only produces questions for Supak/Tubag pairs. Any general-teaching
 * question that doesn't map to a pair (e.g. "who is the second Person of the Trinity")
 * is out of scope here — author those directly and merge with the output file.
 *
 * Usage: bun tools/generate-quiz-from-doc.ts <doc.md> <topic_id> [tier] [--lang ceb] [--labels <path.json>]
 *   --labels <path.json>: skip the qwen3.5:9b extraction call and assemble questions from a
 *   pre-written [{"n":1,"question":"...","answer":"..."}, ...] file instead (e.g. Claude-authored
 *   labels, after qwen extraction proved too unreliable on a given document's language/register).
 * Output: content/quiz/generated/<topic_id>-<lang>-<tier>.json
 */
import { join } from 'path'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'

const ROOT = join(import.meta.dir, '..')
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat'
const MODEL_9B = 'qwen3.5:9b'

const argv = process.argv.slice(2)
const langFlagIdx = argv.indexOf('--lang')
const lang = langFlagIdx >= 0 ? argv[langFlagIdx + 1] : 'ceb'
const labelsFlagIdx = argv.indexOf('--labels')
const labelsPath = labelsFlagIdx >= 0 ? argv[labelsFlagIdx + 1] : null
const skipIdx = new Set([
  ...(langFlagIdx >= 0 ? [langFlagIdx, langFlagIdx + 1] : []),
  ...(labelsFlagIdx >= 0 ? [labelsFlagIdx, labelsFlagIdx + 1] : []),
])
const positional = argv.filter((_, i) => !skipIdx.has(i))
const [docPath, topicId, tierArg] = positional
if (!docPath || !topicId) {
  console.error('Usage: bun tools/generate-quiz-from-doc.ts <doc.md> <topic_id> [tier] [--lang ceb]')
  process.exit(1)
}
const tier = tierArg ?? 'beginner'

const doc = readFileSync(docPath, 'utf-8')

type Pair = { n: number; supak: string; tubag: string }

/** Extracts "Supak N.  <text>" blocks up to the next "Supak N." or the "Tubag:" header. */
function extractBlocks(text: string, label: 'Supak' | 'Tubag'): Map<number, string> {
  const re = new RegExp(`${label}\\s+(\\d+)\\.\\s*(.+?)(?=${label}\\s+\\d+\\.|Tubag:|$)`, 'gs')
  const out = new Map<number, string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    out.set(parseInt(m[1]), m[2].trim().replace(/\s+/g, ' '))
  }
  return out
}

const supakBlocks = extractBlocks(doc, 'Supak')
const tubagBlocks = extractBlocks(doc, 'Tubag')
const pairs: Pair[] = []
for (const [n, supak] of supakBlocks) {
  const tubag = tubagBlocks.get(n)
  if (tubag) pairs.push({ n, supak, tubag })
}

if (pairs.length === 0 && !labelsPath) {
  console.error(`No Supak N / Tubag N pairs found in ${docPath} — this doc may not follow the expected structure.`)
  process.exit(1)
}
console.log(`[Parse] found ${pairs.length} Supak/Tubag pairs`)

function extractJson(raw: string) {
  const noThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const start = noThink.indexOf('{')
  const end = noThink.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error(`No JSON object found in model output:\n${raw.slice(0, 500)}`)
  return JSON.parse(noThink.slice(start, end + 1))
}

async function callModel(model: string, prompt: string, numPredict: number): Promise<ReturnType<typeof extractJson>> {
  const res = await fetch(OLLAMA_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      think: false,
      options: { num_predict: numPredict, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(10 * 60 * 1000),
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


// One pair per call, not a 9-pair batch — qwen3.5:9b's output degraded into garbled,
// run-on Cebuano partway through a batched request (verified 2026-08-04); a single small
// block per call keeps it coherent. Few-shot examples anchor register and the word cap.
const FEWSHOT = `Example input:
Supak (objection): "Ang Dios dili tawo… dili anak sa tawo" (Num 23:19). Apan si Cristo tawo, gianak og tawo (Gal. 4:4) busa dili siya Dios.
Tubag (answer): Ang Dios dili tawo apan dili ta makabuot kon ang Dios magpakatawo. "Ang Pulong nahimong tawo ug mipuyo uban kanato" (Jn. 1:14).

Example output:
{"question": "Unsay tubag sa Supak nga si Cristo tawo busa dili Dios?", "answer": "Ang Dios dili tawo apan mahimo siyang magpakatawo; ang Pulong nahimong tawo (Jn. 1:14)"}`

function buildExtractPrompt(p: Pair): string {
  return `You are condensing existing Cebuano (Binisaya) religious text into one short quiz label. Do NOT add any fact, claim, or citation that is not already in the text below — only shorten and rephrase what is there. Write in clear, grammatical Cebuano — reread your own output before answering and fix any garbled or run-on phrasing.

${FEWSHOT}

Now do the same for this pair:
Supak ${p.n} (objection): ${p.supak}
Tubag ${p.n} (answer): ${p.tubag}

Extract:
- "question": one short Cebuano question asking what the Church's answer is to this specific objection.
- "answer": ONE short, grammatical Cebuano sentence, STRICTLY under 15 words, stating the core of the Tubag answer. Count your words before answering.

Output a single JSON object: {"question": "...", "answer": "..."}. Output ONLY the raw JSON object, no markdown fences, no commentary.`
}

let labels: { n: number; question: string; answer: string }[]
if (labelsPath) {
  if (!existsSync(labelsPath)) throw new Error(`Labels file not found: ${labelsPath}`)
  labels = JSON.parse(readFileSync(labelsPath, 'utf-8'))
  console.log(`[Labels] loaded ${labels.length} pre-written labels from ${labelsPath}`)
} else {
  console.log(`[Extract] condensing ${pairs.length} pairs via ${MODEL_9B} (one call per pair)...`)
  labels = []
  for (const p of pairs) {
    const result = await callModel(MODEL_9B, buildExtractPrompt(p), 250)
    labels.push({ n: p.n, question: result.question, answer: result.answer })
    console.log(`  [pair ${p.n}] ${result.answer}`)
  }
  console.log(`[Extract] got ${labels.length} labels`)
}
if (!Array.isArray(labels) || labels.length === 0) {
  throw new Error('No labels available (model returned none, or labels file was empty)')
}

type QuizQuestion = { topic_id: string; tier: string; lang: string; question: string; choices: string[]; correct_index: number }

/** Fisher-Yates shuffle, remapping correct_index to the answer's new position. */
function shuffleChoices(question: string, correctAnswer: string, distractors: string[]): QuizQuestion {
  const choices = [correctAnswer, ...distractors]
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[choices[i], choices[j]] = [choices[j], choices[i]]
  }
  return { topic_id: topicId, tier, lang, question, choices, correct_index: choices.indexOf(correctAnswer) }
}

const questions: QuizQuestion[] = labels.map((label) => {
  const others = [...labels.filter((l) => l.n !== label.n)]
  const distractors: string[] = []
  for (let i = 0; i < 3 && others.length > 0; i++) {
    const idx = Math.floor(Math.random() * others.length)
    distractors.push(others.splice(idx, 1)[0].answer)
  }
  return shuffleChoices(label.question, label.answer, distractors)
})

const outDir = join(ROOT, 'content', 'quiz', 'generated')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${topicId}-${lang}-${tier}-supak-tubag.json`)
writeFileSync(outPath, JSON.stringify(questions, null, 2))
console.log(`\n✓ Wrote ${questions.length} questions to ${outPath}`)
console.log('  (Supak/Tubag pairs only — merge with directly-authored general-teaching questions before review.)')
