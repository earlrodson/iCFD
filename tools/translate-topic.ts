#!/usr/bin/env bun
/**
 * Translates a generated English topic into Cebuano or Tagalog via sailor2:20b.
 * (qwen3.6:27b-mlx/35b-mlx tested 2026-08-09: both stall on long multi-citation
 * fields — thinking-mode overhead exhausts the token budget before real output
 * is produced, timing out even at num_predict 16000. sailor2 remains the only
 * model fast enough for answer_full-length content on this hardware.)
 *
 * Scope (decided 2026-08-08): only original prose is translated — title, question,
 * summary, answer_full, objections. Anything sourced from an external document
 * (CCC/conciliar/Church-document citations, Church Father quotes, blockquoted
 * source text) is protected and stays in English — those are quoted historical
 * sources, not this article's own content, and letting a translation model
 * touch a citation risks it fabricating or misattributing one (confirmed
 * failure mode: sailor2 invented a nonexistent "(CCC 641)" and separately
 * misattributed "(CCC 643)" to an uncited sentence in testing).
 *
 * Scripture is swapped to a Cebuano/Tagalog Bible version only where
 * scripture_verses actually has a matching row for that reference+lang;
 * otherwise the English (NABRE) text and English reference are kept
 * unchanged. Coverage is currently thin (verified 2026-08-08): 23 rows in
 * "Cebuano Ang Dating Biblia", 20 in "Ang Biblia" (Tagalog) — most verses
 * will fall through to English, by design.
 *
 * Usage: bun tools/translate-topic.ts <path/to/topic.json> <ceb|tl>
 * Output: content/topics/generated/<topic_id>-<lang>.json
 */
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat'
const MODEL = 'sailor2:20b'

const [, , inPath, langArg] = process.argv
if (!inPath || !langArg || !['ceb', 'tl'].includes(langArg)) {
  console.error('Usage: bun tools/translate-topic.ts <path/to/topic.json> <ceb|tl>')
  process.exit(1)
}
const lang = langArg as 'ceb' | 'tl'
const LANG_NAMES: Record<'ceb' | 'tl', string> = { ceb: 'Cebuano (Bisaya)', tl: 'Tagalog/Filipino' }

const topic = JSON.parse(readFileSync(inPath, 'utf8'))

// ---- protect citations / quoted source text from translation ----

const PLACEHOLDER_RE = /⟦P(\d+)⟧/g

function protect(text: string): { text: string; map: string[] } {
  const map: string[] = []
  const push = (s: string) => { map.push(s); return `⟦P${map.length - 1}⟧` }
  // whole blockquote lines — direct CCC/Council/Church Father quotations
  let out = text.replace(/^>.*$/gm, push)
  // inline citation parentheticals: (CCC 126), (CCC 514, 515), (Lumen Fidei §38),
  // (John 1:14), (Matthew 16:18-19), etc.
  out = out.replace(
    /\((?:CCC\s?\d+(?:[,\s–-]+\d+)*|[A-Za-z][A-Za-z .'-]*§\s?\d+|[1-3]?\s?[A-Z][a-zA-Z]+\.?\s\d+:\d+(?:[-–]\d+)?(?:,\s?\d+(?:[-–]\d+)?)*)\)/g,
    push,
  )
  return { text: out, map }
}

function restore(text: string, map: string[]): string {
  return text.replace(PLACEHOLDER_RE, (m, i) => map[Number(i)] ?? m)
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

async function translateProse(label: string, text: string | undefined): Promise<string> {
  if (!text || !text.trim()) return text ?? ''
  const { text: protectedText, map } = protect(text)
  console.log(`[Translate] ${label} (${MODEL})...`)

  const placeholderRule = map.length > 0
    ? `\n- Tokens that look like ⟦P0⟧, ⟦P1⟧, etc. are placeholders standing in for quoted source material and citations that must NOT be translated — copy each one back EXACTLY as written, unchanged, in the same position. Do not translate, alter, or explain them.`
    : ''

  const prompt = `Translate the following text from English into ${LANG_NAMES[lang]}. It is content for a Catholic apologetics app.

Rules:
- Translate ONLY the surrounding prose, completely and faithfully — do not summarize, condense, or drop any clause or sentence.${placeholderRule}
- Preserve Markdown formatting (##, ---, blank lines) exactly.
- Return ONLY the translated text — no preamble, no translator's note, no attribution line, no meta-commentary about these instructions.

TEXT:
${protectedText}`

  // plain substring checks, not one combined regex — a trailing \b silently
  // fails to match punctuation-ending phrases like "**TEXT:**" (no word/
  // non-word transition between ":" and "*"), which let a leak through once
  const LEAK_MARKERS = [
    'text:', 'no preamble', 'no attribution', "translator's note", 'meta-commentary',
    'preserve markdown formatting', 'mga patakaran', 'panuntunan', 'blank lines preserved',
    'blank line preserved', '```markdown',
  ]
  const hasLeak = (s: string) => {
    const lower = s.toLowerCase()
    return LEAK_MARKERS.some((marker) => lower.includes(marker))
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    let full = await callSailor(prompt)
    // strip a trailing watermark/attribution line the model tacks on regardless of
    // instructions — seen both as prose ("Translation by Sailor2 from Sea AI Lab")
    // and as a bolded hashtag ("**#TagalogTranslationComplete**"); a generic
    // "last line is bolded and short, not real prose" catch is more robust than
    // matching one exact phrasing.
    full = full
      .replace(/\n?\*{0,2}Translation (?:by|provided by)[^\n]*\*{0,2}\s*$/i, '')
      .replace(/\n+\*{0,2}#\w+\*{0,2}\s*$/, '')
      .trim()

    const gotPlaceholders = (full.match(PLACEHOLDER_RE) || []).length
    const placeholdersOk = gotPlaceholders === map.length
    // catches the model going off-script on short inputs: inventing unrelated
    // content, or echoing the prompt's own instructions back as "translation"
    const lengthOk = full.length <= Math.max(3 * protectedText.length, protectedText.length + 300)
    const noLeak = !hasLeak(full)

    if (placeholdersOk && lengthOk && noLeak) return restore(full, map)

    const reason = !placeholdersOk
      ? `${gotPlaceholders} placeholder token(s), expected ${map.length}`
      : !lengthOk
        ? `output ${full.length} chars vs ${protectedText.length} chars input — looks like hallucinated content`
        : 'output echoes the prompt instructions instead of translating'
    console.warn(`  ⚠ ${label}: attempt ${attempt} failed (${reason}) — ${attempt < 2 ? 'retrying' : 'keeping original English text instead of shipping corrupted output'}`)
  }
  return text
}

// ---- scripture: swap to a local-language Bible only where one actually exists ----

// Best-effort book-name map, built only from names verified against live
// scripture_verses rows (2026-08-08) plus a few high-confidence extras.
// Unmapped books simply fall through to English — that's the correct
// default per spec, not a bug, given how thin local-language coverage is.
const BOOK_NAMES: Partial<Record<string, { ceb: string; tl: string }>> = {
  Genesis: { ceb: 'Genesis', tl: 'Genesis' },
  Matthew: { ceb: 'Mateo', tl: 'Mateo' },
  Mark: { ceb: 'Marcos', tl: 'Marcos' },
  Luke: { ceb: 'Lucas', tl: 'Lucas' },
  John: { ceb: 'Juan', tl: 'Juan' },
  Acts: { ceb: 'Mga Buhat', tl: 'Mga Gawa' },
  Romans: { ceb: 'Roma', tl: 'Roma' },
  '1 Corinthians': { ceb: '1 Corintios', tl: '1 Corinto' },
  '2 Corinthians': { ceb: '2 Corintios', tl: '2 Corinto' },
  Ephesians: { ceb: 'Efeso', tl: 'Efeso' },
  Philippians: { ceb: 'Filipos', tl: 'Filipos' },
  Colossians: { ceb: 'Colosas', tl: 'Colosas' },
  '1 Thessalonians': { ceb: '1 Tesalonica', tl: '1 Tesalonica' },
  '2 Thessalonians': { ceb: '2 Tesalonica', tl: '2 Tesalonica' },
  '1 Timothy': { ceb: '1 Timoteo', tl: '1 Timoteo' },
  '2 Timothy': { ceb: '2 Timoteo', tl: '2 Timoteo' },
  Titus: { ceb: 'Tito', tl: 'Tito' },
  Hebrews: { ceb: 'Hebreo', tl: 'Hebreo' },
  James: { ceb: 'Santiago', tl: 'Santiago' },
  '1 Peter': { ceb: '1 Pedro', tl: '1 Pedro' },
  '2 Peter': { ceb: '2 Pedro', tl: '2 Pedro' },
  '1 John': { ceb: '1 Juan', tl: '1 Juan' },
  '2 John': { ceb: '2 Juan', tl: '2 Juan' },
  '3 John': { ceb: '3 Juan', tl: '3 Juan' },
  Jude: { ceb: 'Judas', tl: 'Judas' },
  Revelation: { ceb: 'Apocalipsis', tl: 'Pahayag' },
}

const LOCAL_VERSIONS: Record<'ceb' | 'tl', string[]> = {
  ceb: ['Cebuano Ang Dating Biblia'],
  tl: ['Ang Biblia'],
}

async function translateScripture(scripture: { reference: string; version: string; text: string }[]) {
  const supabase = getSupabaseAdmin()
  const out: typeof scripture = []
  let matched = 0
  for (const entry of scripture) {
    const m = entry.reference.match(/^([1-3]?\s?[A-Za-z ]+?)\s(\d+):(\d+)(-\d+)?$/)
    const localBook = m ? BOOK_NAMES[m[1].trim()]?.[lang] : undefined
    if (!m || !localBook || m[4]) { out.push(entry); continue } // no map, or a verse range — skip local lookup

    const localRef = `${localBook} ${m[2]}:${m[3]}`
    let found: { reference: string; version: string; text: string } | null = null
    for (const version of LOCAL_VERSIONS[lang]) {
      const { data } = await supabase.from('scripture_verses').select('reference,version,text')
        .eq('reference', localRef).eq('version', version).maybeSingle()
      if (data) { found = data; break }
    }
    if (found) { out.push(found); matched++ } else { out.push(entry) }
  }
  console.log(`[Scripture] ${matched}/${scripture.length} verse(s) matched to a local-language Bible; rest kept in English`)
  return out
}

// ---- run ----

console.log(`\nTranslating "${topic.topic_id}" → ${LANG_NAMES[lang]}\n`)

const title = await translateProse('title', topic.title)
const question = await translateProse('question', topic.question)
const summary = await translateProse('summary', topic.summary)
const answerFull = await translateProse('answer_full', topic.answer_full)

const objections = []
for (const [i, o] of (topic.objections ?? []).entries()) {
  const objection = await translateProse(`objections[${i}].objection`, o.objection)
  const response = await translateProse(`objections[${i}].response`, o.response)
  objections.push({ objection, response })
}

const scripture = topic.scripture?.length ? await translateScripture(topic.scripture) : topic.scripture

const translated = {
  ...topic,
  lang,
  title,
  question,
  summary,
  answer_full: answerFull,
  objections,
  scripture,
  // church_fathers, catechism: left untouched — historical sources / labels, not this article's content
}

const outDir = join(ROOT, 'content', 'topics', 'generated')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${topic.topic_id}-${lang}.json`)
writeFileSync(outPath, JSON.stringify(translated, null, 2))

console.log(`\n✓ Wrote ${outPath}`)
console.log('  Review before validating — the model can still drop clauses inside long sentences (see documents/content-review-checklist.md).')
