#!/usr/bin/env bun
/**
 * Translates one raw legacy essay from documents/Apologetics-ceb/*.md
 * (Cebuano) into Tagalog via sailor2:20b, reusing the citation-protection
 * approach from tools/lib/sailor-translate.ts (adapted: source is Cebuano,
 * not English, and quotes here are inline "..." (ref) pairs rather than
 * blockquotes).
 *
 * Built 2026-08-26: confirmed by direct test that sailor2 hallucinates a
 * citation onto a sentence that had none in the source when citations are
 * left unprotected — so every parenthetical Scripture reference is swapped
 * for a placeholder before translation and restored verbatim after,
 * identical in spirit to translate-topic.ts's protect/restore.
 *
 * Usage: bun tools/translate-legacy-md.ts "<filename>.md"
 * Reads:  documents/Apologetics-ceb/<filename>.md
 * Writes: documents/Apologetics-tl/<filename>.md
 */
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'

const ROOT = join(import.meta.dir, '..')
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat'
const MODEL = 'sailor2:20b-chat-q8_0'

const [, , filename] = process.argv
if (!filename) {
  console.error('Usage: bun tools/translate-legacy-md.ts "<filename>.md"')
  process.exit(1)
}

const srcPath = join(ROOT, 'documents', 'Apologetics-ceb', filename)
const text = readFileSync(srcPath, 'utf8')

// ---- protect Scripture citations: "(Book. C:V)" style, tolerant of stray spaces ----
const CITATION_RE = /\(\s*[1-3]?\s?[A-Z][a-zA-Z.]*\.?\s\d+:\d+(?:[-–]\d+)?\s*\)/g
const PLACEHOLDER_RE = /⟦P(\d+)⟧/g

function protect(s: string): { text: string; map: string[] } {
  const map: string[] = []
  const out = s.replace(CITATION_RE, (m) => {
    map.push(m)
    return `⟦P${map.length - 1}⟧`
  })
  return { text: out, map }
}

function restore(s: string, map: string[]): string {
  return s.replace(PLACEHOLDER_RE, (m, i) => map[Number(i)] ?? m)
}

async function callSailor(prompt: string): Promise<string> {
  const res = await fetch(OLLAMA_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      options: { num_predict: 6000 },
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
      const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string }
      if (chunk.error) throw new Error(`Ollama error: ${chunk.error}`)
      full += chunk.message?.content ?? ''
    }
  }
  return full
}

// distinctive Cebuano-only function words (NOT shared with Tagalog) —
// their presence in "translated" output means sailor2 left text untranslated
const CEBUANO_MARKERS = /\b(og|dili|gikan|kinsa|unsa|ngano|asa|nato|namo|kanako|kaniya|niya|nila|mao|bisag|gani|kadto|niini|niadto|karon|human|human sa|maong|kanunay|bag-ong|gipili|gitawag|gitukod)\b/gi
// English leaks (sailor2 answering in English instead of Tagalog)
const ENGLISH_MARKERS = /\b(the|and|of|to|is|are|this|that|answer|translation|teaching)\b/gi

function langIssue(s: string): string | null {
  const cebHits = (s.match(CEBUANO_MARKERS) || []).length
  const engHits = (s.match(ENGLISH_MARKERS) || []).length
  const words = s.split(/\s+/).length || 1
  if (cebHits / words > 0.03) return `looks like leftover Cebuano (${cebHits} marker hits)`
  if (engHits / words > 0.08) return `looks like English output (${engHits} marker hits)`
  return null
}

// split protected text into ~500-char sentence-boundary chunks so sailor2
// doesn't degrade on very long single paragraphs (observed on the 2000+ char
// "Tubag" block: later sentences silently reverted to Cebuano)
function chunkBySentence(s: string, maxLen = 500): string[] {
  const sentences = s.split(/(?<=[.!?”"])\s+(?=[A-ZÑ⟦])/)
  const chunks: string[] = []
  let cur = ''
  for (const sent of sentences) {
    if (cur && (cur + ' ' + sent).length > maxLen) {
      chunks.push(cur)
      cur = sent
    } else {
      cur = cur ? `${cur} ${sent}` : sent
    }
  }
  if (cur) chunks.push(cur)
  return chunks
}

async function translateChunk(label: string, chunk: string, mapLen: number): Promise<string | null> {
  const placeholderRule = mapLen
    ? `\n- Tokens like ⟦P0⟧, ⟦P1⟧ stand in for Scripture citations that must NOT be translated — copy each back EXACTLY, unchanged, in the same position.`
    : ''
  const prompt = `Translate the following Catholic apologetics text from Cebuano (Bisaya) into Tagalog/Filipino.

Rules:
- Translate ALL prose completely and faithfully into TAGALOG — do not summarize, condense, drop, or add any clause or sentence, and do not leave any Cebuano words untranslated.
- Do NOT respond in English. Output must be entirely in Tagalog.${placeholderRule}
- Translate quoted Scripture text (inside "...") into natural Tagalog.
- Return ONLY the translated text — no preamble, no notes, no meta-commentary.

TEXT:
${chunk}`

  const LEAK_MARKERS = ['text:', 'no preamble', 'no notes', 'meta-commentary', 'mga patakaran', 'panuntunan']
  const hasLeak = (s: string) => {
    const lower = s.toLowerCase()
    return LEAK_MARKERS.some((m) => lower.includes(m))
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    let full = (await callSailor(prompt)).trim()
    full = full.replace(/\n?\*{0,2}Translation (?:by|provided by)[^\n]*\*{0,2}\s*$/i, '').trim()

    const gotPlaceholders = (full.match(PLACEHOLDER_RE) || []).length
    const placeholdersOk = gotPlaceholders === mapLen
    const lengthOk = full.length <= Math.max(3 * chunk.length, chunk.length + 300)
    const noLeak = !hasLeak(full)
    const issue = langIssue(full)

    if (placeholdersOk && lengthOk && noLeak && !issue) return full

    const reason = !placeholdersOk
      ? `${gotPlaceholders} placeholder token(s), expected ${mapLen}`
      : !lengthOk
        ? `output ${full.length} chars vs ${chunk.length} chars input`
        : issue || 'output echoes prompt instructions'
    console.warn(`  ⚠ ${label}: attempt ${attempt} failed (${reason})${attempt < 3 ? ' — retrying' : ' — giving up on this chunk'}`)
  }
  return null
}

async function translateParagraph(label: string, para: string): Promise<string> {
  if (!para.trim()) return para
  const { text: protectedText, map } = protect(para)
  const chunks = chunkBySentence(protectedText)
  const translatedChunks: string[] = []
  let failed = false
  for (let i = 0; i < chunks.length; i++) {
    const chunkPlaceholderCount = (chunks[i].match(PLACEHOLDER_RE) || []).length
    const result = await translateChunk(`${label}.${i + 1}/${chunks.length}`, chunks[i], chunkPlaceholderCount)
    if (result === null) { failed = true; break }
    translatedChunks.push(result)
  }
  if (failed) {
    console.warn(`  ⚠ ${label}: falling back to original Cebuano — could not produce a clean Tagalog translation`)
    return para
  }
  return restore(translatedChunks.join(' '), map)
}

const paragraphs = text.split(/\n\n+/)
console.log(`\nTranslating "${filename}" → Tagalog (${paragraphs.length} paragraph blocks)\n`)

const translatedParas: string[] = []
for (let i = 0; i < paragraphs.length; i++) {
  console.log(`[Translate] block ${i + 1}/${paragraphs.length}...`)
  translatedParas.push(await translateParagraph(`block ${i + 1}`, paragraphs[i]))
}

const outDir = join(ROOT, 'documents', 'Apologetics-tl')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, filename)
writeFileSync(outPath, translatedParas.join('\n\n'))

console.log(`\n✓ Wrote ${outPath}`)
