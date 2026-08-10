#!/usr/bin/env bun
/**
 * Slide-deck generator, grounded in an existing topic's content. Drafting new
 * slide headings/bullets is a generation task (composing new outline prose
 * from source material), so it runs on a local generation-tier model —
 * qwen3:14b/qwen3.5:9b aren't installed locally right now, so this uses
 * qwen3.6:35b-mlx (the closest available generation-capable model) via the
 * local Ollama HTTP API, mirroring tools/generate-topic.ts's callModel().
 * No Anthropic API key required.
 *
 * Usage: bun tools/generate-presentation.ts <topic_id> [--lang <lang>] [--note "<feedback>"]
 *   lang defaults to 'en' (topics.id is not unique alone — lang disambiguates which row
 *   to ground on). --note appends a targeted correction after a review-checklist fail.
 *
 * Output: content/presentations/generated/<topic_id>.json
 */
import { join } from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat'
const MODEL = 'qwen3.6:35b-mlx'

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
const [topicId] = positional
if (!topicId) {
  console.error('Usage: bun tools/generate-presentation.ts <topic_id> [--lang <lang>] [--note "<feedback>"]')
  process.exit(1)
}

/** Strips <think>...</think> blocks and code fences, then extracts the first balanced {...} object. */
function extractJson(raw: string): unknown {
  const noThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const start = noThink.indexOf('{')
  const end = noThink.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error(`No JSON object found in model output:\n${raw.slice(0, 500)}`)
  return JSON.parse(noThink.slice(start, end + 1))
}

// Streaming (not a single blocking request) — long local generations otherwise risk an
// idle-connection timeout; streaming keeps bytes flowing as tokens are produced.
async function callModel(prompt: string): Promise<unknown> {
  const res = await fetch(OLLAMA_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      think: false,
      options: { num_predict: 4000 },
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

type Slide = { heading: string; bullets: string[] }

console.log(`\nGenerating presentation for topic: "${topicId}"\n`)

const supabase = getSupabaseAdmin()
const { data: topic, error } = await supabase
  .from('topics')
  .select('id,title,question,answer,answer_full,scripture,catechism')
  .eq('id', topicId)
  .eq('lang', lang)
  .maybeSingle()
if (error) throw new Error(`Failed to fetch topic ${topicId} (lang=${lang}): ${error.message}`)
if (!topic) throw new Error(`Topic not found: ${topicId} (lang=${lang})`)

const sourceText = topic.answer_full || (topic.answer as { summary?: string } | null)?.summary
if (!sourceText) throw new Error(`Topic ${topicId} has no answer_full or answer.summary to ground on`)

function buildPrompt(): string {
  return `You are drafting a slide deck for a Catholic apologetics presentation. Base every slide strictly on the source material below — do not introduce facts, citations, or claims not present in it.

Topic ID: ${topicId}
Title: ${topic.title}
Question: ${topic.question}

Source material:
"""
${sourceText}
"""

Scripture references: ${JSON.stringify(topic.scripture ?? [])}
CCC paragraphs: ${JSON.stringify(topic.catechism ?? [])}

Task: Generate a slide deck of 6-10 slides covering the source material, suitable for presenting to a live audience. Output a single JSON object of this exact shape:

{"slides": [ {"heading": "...", "bullets": ["...", "...", "..."]}, ... ]}

Each slide needs a short heading (under 8 words) and 2-5 concise bullets (each under 20 words, no full paragraphs — this is a presentation, not an essay). The first slide should introduce the question/topic; the last slide should be a concise summary or key takeaway. Order slides so the deck builds logically.${note ? `\n\nAdditional correction from a previous review: ${note}` : ''} Output ONLY the raw JSON object, no markdown fences, no commentary.`
}

console.log(`[Generate] slide deck, lang "${lang}" (${MODEL}, local)...`)

const result = await callModel(buildPrompt()) as { slides: Slide[] }
const slides = result.slides
if (!Array.isArray(slides) || slides.length === 0) {
  throw new Error(`Model did not return a non-empty "slides" array:\n${JSON.stringify(result).slice(0, 500)}`)
}

console.log(`  Generated ${slides.length} slides`)

const outDir = join(ROOT, 'content', 'presentations', 'generated')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${topicId}.json`)
writeFileSync(outPath, JSON.stringify({ topic_id: topicId, slides }, null, 2))

console.log(`\n✓ Wrote ${outPath}`)
