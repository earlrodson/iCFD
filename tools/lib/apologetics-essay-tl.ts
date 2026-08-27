/**
 * Parses a documents/Apologetics-tl/*.md essay (already human/model-translated
 * to Tagalog, not re-translated by this tool) into the same {title, intro, qa}
 * shape tools/lib/apologetics-essay.ts produces for the Cebuano originals —
 * see tools/seed-apologetics-topic-tl.ts for how this feeds the `topics` DB
 * upsert.
 *
 * Unlike the Cebuano essays, the Tagalog label vocabulary is NOT consistent
 * across files — each was translated independently, so the same structural
 * marker (question label / response label) comes out as a different Tagalog
 * word per file. Verified against all 20 files in documents/Apologetics-tl
 * (2026-08-27): question labels appear as Tanong/Pangutana/Pagsupak/Supak/
 * Salungat/Pagsalungat/Tutol/Pagtutol (optionally numbered, "Tutol 1."),
 * response labels as Sagot/Tubag/Tugon/Aral/Pagtulon-an. All are recognized
 * here. Block-splitting and fallback behavior (unlabeled blocks appended as
 * a continuation of the previous response) mirror apologetics-essay.ts
 * exactly, so parse quality is at parity with the accepted Cebuano pipeline.
 */

// \b word-boundary anchors matter here: without them "Salungat" (a label)
// also matches inside unrelated words like "sumasalungat" ("to conflict"),
// which was observed splitting a block mid-sentence (verified 2026-08-27).
const QUESTION_LABEL = /\b(?:Tanong|Pangutana|Pagsupak|Supak|Salungat|Pagsalungat|Tutol|Pagtutol)\s*[0-9]*\s*[:.]/i
const RESPONSE_LABEL = /\b(?:Sagot|Tubag|Tugon|Aral|Pagtulon-an)\s*[0-9]*\s*[:.]/i
const OBJECTION_LABEL = /(?:Pagsupak|Supak|Salungat|Pagsalungat|Tutol|Pagtutol)/i

export interface EssayQA {
  question: string
  response: string
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

export function parseApologeticsEssayTl(rawText: string): ParsedEssay {
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
    const isObjection = OBJECTION_LABEL.test(block.slice(qStart).match(QUESTION_LABEL)![0])
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
