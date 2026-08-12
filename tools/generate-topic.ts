#!/usr/bin/env bun
/**
 * Phase 0-8 assembler: generates one topic.json end-to-end, per the v1.2 pipeline in
 * documents/VerifyArchitecture/content-generation-architecture-proposal.md.
 *
 * Usage: bun tools/generate-topic.ts "<topic title>" "<apologetics question>" [topic-id-slug]
 *
 * Output: content/topics/generated/<topic_id>.json
 */
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat'

// qwen3:14b/qwen3.5:9b are deleted locally — both extraction (Phases 1,3-6,7) and
// generation (Phase 2) run on qwen3.6:35b-mlx for now, replacing the prior 14b/9b split.
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

const [, , title, question, slugArg] = process.argv
if (!title || !question) {
  console.error('Usage: bun tools/generate-topic.ts "<topic title>" "<apologetics question>" [topic-id-slug]')
  process.exit(1)
}

type RetrievedChunk = { source_table: string; reference_label: string; score: number; content: string }

async function retrievePhase0(query: string, top = 8): Promise<RetrievedChunk[]> {
  const proc = Bun.spawn(['bun', join(ROOT, 'tools/vector-search-theology.ts'), query, '--top', String(top), '--json'], {
    stdout: 'pipe', stderr: 'pipe',
  })
  const out = await new Response(proc.stdout).text()
  const code = await proc.exited
  if (code !== 0) throw new Error(`Phase 0 retrieval failed: ${await new Response(proc.stderr).text()}`)
  return JSON.parse(out)
}

function formatPassages(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '(none retrieved)'
  return chunks.map((c) => `[${c.source_table}: ${c.reference_label}]\n${c.content}`).join('\n\n')
}

/** Strips <think>...</think> blocks and code fences, then extracts the first balanced {...} object. */
function extractJson(raw: string) {
  const noThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const start = noThink.indexOf('{')
  const end = noThink.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error(`No JSON object found in model output:\n${raw.slice(0, 500)}`)
  return JSON.parse(noThink.slice(start, end + 1))
}

// think:false is required — qwen3.5:9b defaults to thinking mode and can spiral into a <think>
// block that never converges. num_predict caps output length as a second guard.
//
// stream MUST be true. With stream:false Ollama buffers the entire response server-side and
// sends zero bytes until generation fully finishes; on this hardware a long qwen3:14b generation
// takes minutes, and Bun's fetch has its own no-data/idle timeout independent of AbortSignal that
// fires around ~4m45s regardless of the signal's timeout value — confirmed by three separate
// failures (across different models, num_predict, and num_ctx settings) all dying at exactly
// ~4m45-47s server-side with "cancel task" (client disconnected), never a real generation error.
// Streaming sends bytes continuously as tokens are produced, which keeps the connection alive.
async function callModel(model: string, prompt: string): Promise<ReturnType<typeof extractJson>> {
  const res = await fetch(OLLAMA_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      think: false,
      options: { num_predict: 5000 },
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

console.log(`\nGenerating topic: "${title}"\n`)

// Phase 0 — retrieval
console.log('[Phase 0] Retrieving grounding passages...')
const retrieved = await retrievePhase0(`${title} ${question}`)
const cccPassages = retrieved.filter((c) => c.source_table === 'ccc_paragraphs')
const fatherPassages = retrieved.filter((c) => c.source_table === 'church_father_quotes')
console.log(`  ${retrieved.length} chunks retrieved (${cccPassages.length} CCC, ${fatherPassages.length} Father quotes)`)

// Phase 1 — metadata
console.log('[Phase 1] Metadata (qwen3.6:35b-mlx)...')
const metadata = await callModel(MODEL_35B, `Generate metadata only for this Catholic apologetics topic. Return ONLY JSON with keys: topic_id, title, category (tradition|scripture|sacraments|morality|history|apologetics), difficulty (beginner|intermediate|advanced), tags (3-6 kebab-case), related_topics (2-4 kebab-case slugs).

TOPIC: ${title}
QUESTION: ${question}`)
const topicId = slugArg ?? metadata.topic_id

// Phase 2 — comprehensive answer (retrieval-grounded)
console.log('[Phase 2] Comprehensive answer (qwen3.6:35b-mlx)...')
const { answer_full: answerFull } = await callModel(MODEL_35B, `You are a Catholic apologetics content writer for the "Codex Defensoris" app. Write the comprehensive answer (1500-2500 words, Markdown, ## sections, --- dividers, blockquotes for Father/Council quotes, Markdown table for CCC refs).

Use ONLY the passages below for CCC references, conciliar text, and Church Father quotes. If a required element has no matching passage below, write "[NEEDS SOURCE: <what's missing>]" instead of inventing one. Cite scripture inline by reference only (e.g. "(John 1:14)") — never write verse text yourself.

TOPIC: ${title}
QUESTION: ${question}

RETRIEVED PASSAGES:
${formatPassages(retrieved)}

Return ONLY JSON: { "answer_full": "..." }`)

if (answerFull.includes('[NEEDS SOURCE')) {
  console.warn('  ⚠ answer_full contains [NEEDS SOURCE] markers — retrieval corpus may be missing coverage for this topic.')
}

// Phase 3 — summary (condensation)
console.log('[Phase 3] Summary (qwen3.6:35b-mlx)...')
const { summary } = await callModel(MODEL_35B, `Condense the article below into a 5-paragraph, 600-900 word summary. Do not introduce claims, distinctions, or emphasis not present in the article. Preserve its doctrinal framing exactly. Open with a Markdown blockquote already present in the article. Flowing prose only, no headers, no bullet lists.

ARTICLE:
${answerFull}

Return ONLY JSON: { "summary": "..." }`)

// Phase 4 — scripture (reference selection only)
console.log('[Phase 4] Scripture references (qwen3.6:35b-mlx)...')
const { scripture: scriptureRefs } = await callModel(MODEL_35B, `Extract every scripture reference cited in the article below. Full book names, one verse per entry (never a range), version must be one of NABRE/RSV-CE/DR/NAB (default NABRE).

ARTICLE:
${answerFull}

Return ONLY JSON: { "scripture": [{ "reference": "John 1:14", "version": "NABRE" }] }`)

// Phase 5 — catechism (selection from Phase 0 retrieval)
console.log('[Phase 5] Catechism references (qwen3.6:35b-mlx)...')
const { catechism } = await callModel(MODEL_35B, `Select the CCC paragraph numbers that support the article below, from the retrieved passages provided. Do not invent a number not present below.

ARTICLE:
${answerFull}

RETRIEVED CCC PARAGRAPHS:
${formatPassages(cccPassages)}

Return ONLY JSON: { "catechism": ["CCC 1234"] }`)

// Phase 6 — church fathers (selection from Phase 0 retrieval)
console.log('[Phase 6] Church Father quotes (qwen3.6:35b-mlx)...')
const { church_fathers: churchFathers } = await callModel(MODEL_35B, `Select the Church Father quotes that support the article below, from the retrieved quotes provided. Copy author/quote/source verbatim. If the article needs a quote not present below, set "library_match": false and still include your best-effort author/quote/source.

ARTICLE:
${answerFull}

RETRIEVED FATHER QUOTES:
${formatPassages(fatherPassages)}

Return ONLY JSON: { "church_fathers": [{ "author": "", "quote": "", "source": "", "library_match": true }] }`)

// Phase 7 — objections
console.log('[Phase 7] Objections (qwen3.6:35b-mlx)...')
const { objections } = await callModel(MODEL_35B, `Extract or draft 2-4 objections a skeptic would raise against the article below, with the Catholic response to each. Ground responses only in points already in the article — no new references.

ARTICLE:
${answerFull}

Return ONLY JSON: { "objections": [{ "objection": "...", "response": "..." }] }`)

// Reference Resolution — scripture text + CCC existence (deterministic, no LLM)
console.log('[Resolution] Resolving scripture text and CCC existence...')
const supabase = getSupabaseAdmin()
const resolvedScripture: { reference: string; version: string; text: string }[] = []
const unresolvedScripture: string[] = []
for (const ref of scriptureRefs as { reference: string; version: string }[]) {
  const { data } = await supabase.from('scripture_verses').select('reference,version,text')
    .eq('reference', ref.reference).eq('version', ref.version).maybeSingle()
  if (data) resolvedScripture.push(data)
  else unresolvedScripture.push(`${ref.reference} (${ref.version})`)
}

const unresolvedCatechism: string[] = []
for (const ccc of catechism as string[]) {
  const num = parseInt(ccc.replace('CCC ', ''))
  const { data } = await supabase.from('ccc_paragraphs').select('paragraph').eq('paragraph', num).eq('lang', 'en').maybeSingle()
  if (!data) unresolvedCatechism.push(ccc)
}

const unverifiedFathers = (churchFathers as { author: string; quote: string; library_match: boolean }[])
  .filter((f) => f.library_match === false)

// Phase 8 — merge
const topic = {
  topic_id: topicId,
  lang: 'en',
  category: metadata.category,
  title: metadata.title ?? title,
  question,
  summary,
  answer_full: answerFull,
  scripture: resolvedScripture,
  catechism,
  church_fathers: churchFathers,
  objections,
  tags: metadata.tags,
  difficulty: metadata.difficulty,
  related_topics: metadata.related_topics,
}

const outDir = join(ROOT, 'content', 'topics', 'generated')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${topicId}.json`)
writeFileSync(outPath, JSON.stringify(topic, null, 2))

console.log(`\n✓ Wrote ${outPath}`)
if (answerFull.includes('[NEEDS SOURCE')) console.log('  ⚠ [NEEDS SOURCE] markers present — review before validating')
if (unresolvedScripture.length) console.log(`  ⚠ Unresolved scripture references: ${unresolvedScripture.join(', ')}`)
if (unresolvedCatechism.length) console.log(`  ⚠ Unresolved CCC numbers: ${unresolvedCatechism.join(', ')}`)
if (unverifiedFathers.length) console.log(`  ⚠ Father quotes needing Claude verification: ${unverifiedFathers.map((f) => f.author).join(', ')}`)
