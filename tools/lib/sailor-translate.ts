/**
 * Shared sailor2:20b translation machinery — citation protection, the
 * translate-and-verify loop, and scripture-to-local-Bible swapping. Used by
 * translate-topic.ts (new pipeline) and translate-legacy-topic.ts (legacy
 * handbook.json seed). See translate-topic.ts's original header comment for
 * why sailor2 (not qwen3.6) and why citations are protected, not translated.
 */
import { getSupabaseAdmin } from '../../scripts/lib/supabase-admin.mjs'

const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat'
// Confirmed 2026-08-13: only "sailor2:20b-chat-q8_0" is actually pulled
// (`ollama list`) — a plain "sailor2:20b" tag does not exist locally.
const MODEL = 'sailor2:20b-chat-q8_0'

export const LANG_NAMES: Record<'ceb' | 'tl', string> = { ceb: 'Cebuano (Bisaya)', tl: 'Tagalog/Filipino' }

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

export async function translateProse(lang: 'ceb' | 'tl', label: string, text: string | undefined): Promise<string> {
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

// split protected text into ~500-char sentence-boundary chunks — sailor2
// degrades on very long single inputs (observed on a ~6500-char essay
// paragraph: it dropped every citation placeholder and silently fell back
// to echoing the source unchanged rather than translating it)
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

const CEB_TL_LEAK_MARKERS = [
  'text:', 'no preamble', 'no attribution', "translator's note", 'meta-commentary',
  'mga patakaran', 'panuntunan', '```markdown',
  'pagsasalin sa tagalog', 'katapusan ng pagsasalin', 'wakas ng pagsasalin', 'tapos na ang pagsasalin',
]
// distinctive Cebuano-only function words (not shared with Tagalog) — their
// presence means sailor2 left text untranslated
const CEBUANO_MARKERS = /\b(og|dili|gikan|kinsa|unsa|ngano|asa|nato|namo|kanako|kaniya|niya|nila|mao|bisag|gani|kadto|niini|niadto|karon|maong|gipili|gitawag|gitukod)\b/gi

async function translateCebToTlChunk(label: string, chunk: string, mapLen: number): Promise<string | null> {
  const placeholderRule = mapLen > 0
    ? `\n- Tokens that look like ⟦P0⟧, ⟦P1⟧, etc. are placeholders standing in for quoted source material and citations that must NOT be translated — copy each one back EXACTLY as written, unchanged, in the same position. Do not translate, alter, or explain them.`
    : ''

  const prompt = `Translate the following text from Cebuano (Bisaya) into Tagalog/Filipino. It is content for a Catholic apologetics app.

Rules:
- Translate ALL of the surrounding prose, completely and faithfully — do not summarize, condense, or drop any clause or sentence, and do not leave any Cebuano words untranslated.
- Do NOT respond in English. Output must be entirely in Tagalog.${placeholderRule}
- Return ONLY the translated text — no preamble, no translator's note, no attribution line, no meta-commentary about these instructions.

TEXT:
${chunk}`

  const hasLeak = (s: string) => {
    const lower = s.toLowerCase()
    return CEB_TL_LEAK_MARKERS.some((marker) => lower.includes(marker))
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    let full = await callSailor(prompt)
    full = full
      .replace(/\n?\*{0,2}Translation (?:by|provided by)[^\n]*\*{0,2}\s*$/i, '')
      .replace(/\n+\*{0,2}#\w+\*{0,2}\s*$/, '')
      // leading/trailing meta-commentary lines sailor2 adds despite instructions
      .replace(/^\*{0,2}Pagsasalin[^\n]*\*{0,2}\s*:?\s*\n+/i, '')
      .replace(/\n+[-*\s]*\(?(?:Katapusan|Wakas) ng Pagsasalin\)?\s*$/i, '')
      .trim()

    const gotPlaceholders = (full.match(PLACEHOLDER_RE) || []).length
    const placeholdersOk = gotPlaceholders === mapLen
    const lengthOk = full.length <= Math.max(3 * chunk.length, chunk.length + 300)
    const noLeak = !hasLeak(full)
    const cebHits = (full.match(CEBUANO_MARKERS) || []).length
    const words = full.split(/\s+/).length || 1
    const noCebuanoLeftover = cebHits / words <= 0.03

    if (placeholdersOk && lengthOk && noLeak && noCebuanoLeftover) return full

    const reason = !placeholdersOk
      ? `${gotPlaceholders} placeholder token(s), expected ${mapLen}`
      : !lengthOk
        ? `output ${full.length} chars vs ${chunk.length} chars input — looks like hallucinated content`
        : !noCebuanoLeftover
          ? `looks like leftover Cebuano (${cebHits} marker hits)`
          : 'output echoes the prompt instructions instead of translating'
    console.warn(`  ⚠ ${label}: attempt ${attempt} failed (${reason})${attempt < 3 ? ' — retrying' : ' — giving up on this chunk'}`)
  }
  return null
}

/**
 * Cebuano -> Tagalog prose translation for the Apologetics-ceb essay seeder
 * (tools/seed-apologetics-topic.ts). Same protect/verify/retry loop as
 * translateProse, but the prompt correctly names Cebuano as the source
 * language instead of assuming English, and chunks long text by sentence so
 * sailor2 doesn't degrade on multi-thousand-character essay paragraphs.
 */
export async function translateCebToTlProse(label: string, text: string | undefined): Promise<string> {
  if (!text || !text.trim()) return text ?? ''
  const { text: protectedText, map } = protect(text)
  console.log(`[Translate] ${label} (${MODEL})...`)

  const chunks = chunkBySentence(protectedText)
  const translatedChunks: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const chunkPlaceholderCount = (chunks[i].match(PLACEHOLDER_RE) || []).length
    const chunkLabel = chunks.length > 1 ? `${label} (${i + 1}/${chunks.length})` : label
    const result = await translateCebToTlChunk(chunkLabel, chunks[i], chunkPlaceholderCount)
    if (result === null) {
      // fall back to just this chunk's original Cebuano rather than losing
      // the whole field — most essay paragraphs are 10+ chunks, and one bad
      // chunk shouldn't discard translations that already succeeded
      console.warn(`  ⚠ ${chunkLabel}: keeping original Cebuano for this chunk only`)
      translatedChunks.push(chunks[i])
    } else {
      translatedChunks.push(result)
    }
  }
  return restore(translatedChunks.join(' '), map)
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

export async function translateScripture(lang: 'ceb' | 'tl', scripture: { reference: string; version: string; text: string }[]) {
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
