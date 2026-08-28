/**
 * Parses a documents/Apologetics-ceb/*.md essay into the same structure the
 * existing `topics` rows use for these essays (verified against the live
 * 'true-church' row 2026-08-26): a title, an intro paragraph (-> `answer`),
 * and a list of Pangutana/Tubag (question/response) blocks (-> `objections`).
 *
 * Each essay's paragraphs (split on blank lines) map 1:1 to: [0] title,
 * [1] intro, [2..] one Q&A pair per paragraph — question and response are
 * inline in the same paragraph ("Pangutana: ... Tubag: ..."), not separate
 * paragraphs. Some essays use "Pagsupak:" instead of "Pangutana:", and
 * "Pagtulon-an:"/"Dugang mga tubag:" instead of "Tubag:" — all recognized.
 */

const QUESTION_LABEL = /(?:Pangutana|Pagsupak)\s*:/i
const RESPONSE_LABEL = /(?:Tubag|Pagtulon-an|Dugang mga tubag)\s*:/i

export interface EssayQA {
  question: string
  response: string
  // true when the block used "Pagsupak:" (objection) rather than
  // "Pangutana:" (plain question) — i.e. the question itself is a
  // counter-argument someone raises against Catholic teaching.
  isObjection: boolean
}

export interface ParsedEssay {
  title: string
  intro: string
  qa: EssayQA[]
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function parseApologeticsEssay(rawText: string): ParsedEssay {
  const blocks = rawText.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean)
  if (blocks.length < 2) throw new Error('Essay too short to contain a title and intro paragraph')

  const title = normalizeWhitespace(blocks[0])
  const intro = normalizeWhitespace(blocks[1])

  const qa: EssayQA[] = []
  for (const block of blocks.slice(2)) {
    if (!QUESTION_LABEL.test(block)) {
      // Continuation of the previous response (no new question label) —
      // append rather than drop, so content is never silently lost.
      if (qa.length) qa[qa.length - 1].response += ' ' + normalizeWhitespace(block)
      continue
    }
    const qStart = block.search(QUESTION_LABEL)
    const isObjection = /Pagsupak/i.test(block.slice(qStart).match(QUESTION_LABEL)![0])
    const afterQLabel = block.slice(qStart).replace(QUESTION_LABEL, '')
    const rMatch = afterQLabel.search(RESPONSE_LABEL)
    if (rMatch === -1) {
      qa.push({ question: normalizeWhitespace(afterQLabel), response: '', isObjection })
      continue
    }
    const question = afterQLabel.slice(0, rMatch)
    const response = afterQLabel.slice(rMatch).replace(RESPONSE_LABEL, '')
    qa.push({ question: normalizeWhitespace(question), response: normalizeWhitespace(response), isObjection })
  }

  return { title, intro, qa }
}

export interface ScriptureRefEntry {
  reference: string
  stance: 'supporting' | 'objection'
}

export const CITATION_RE = /\(\s*([1-3]?\s?[A-Z][a-zA-Z.]*\.?\s\d+:\d+(?:[-–]\d+)?)\s*\)/g

function citationsIn(text: string): string[] {
  return [...text.matchAll(CITATION_RE)].map((m) => m[1].replace(/\s+/g, ' ').trim())
}

/**
 * Every "(Book. C:V)"-style Scripture citation in the essay, deduped (first
 * stance seen wins), in first-seen order. A citation is tagged 'objection'
 * only when it appears in the QUESTION half of a "Pagsupak:" block — i.e. an
 * objector's own proof-text against Catholic teaching, which the response
 * then answers. Everything else (intro, plain "Pangutana:" questions, and
 * every response) supports the Church's teaching.
 */
export function extractScriptureRefs(essay: ParsedEssay): ScriptureRefEntry[] {
  const seen = new Map<string, ScriptureRefEntry>()
  const add = (refs: string[], stance: ScriptureRefEntry['stance']) => {
    for (const reference of refs) if (!seen.has(reference)) seen.set(reference, { reference, stance })
  }

  add(citationsIn(essay.intro), 'supporting')
  for (const block of essay.qa) {
    add(citationsIn(block.question), block.isObjection ? 'objection' : 'supporting')
    add(citationsIn(block.response), 'supporting')
  }

  return [...seen.values()]
}
