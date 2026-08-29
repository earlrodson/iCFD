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
 * here.
 *
 * Also unlike the Cebuano essays, roughly half of these files pack *multiple*
 * objections into a single blank-line-delimited block instead of one
 * paragraph per objection (verified 2026-08-28 by diffing block counts
 * against the live 'ceb' row's objections array — e.g.
 * "BIBLIYA, TRADISYON UG AUTORIDAD SA STA. IGLESYA.md" has all 5 "Tutol N."
 * objections in one paragraph, followed by a shared/general "Sagot:" answer
 * paragraph, followed by a *second* paragraph with the 5 "Sagot N." specific
 * rebuttals — three separate roles a naive one-block-per-Q&A parser conflates
 * into a single garbled objection). This parser splits any block containing
 * 2+ *numbered* labels (regardless of blank-line boundaries) into that many
 * separate entries, then matches a same-length numbered response block to
 * fill them in. Unmatched prose in between (the shared/general answer) is
 * NOT attached to any objection — it is collected as `extra`, which
 * tools/seed-apologetics-topic-tl.ts folds into `answer_full` alongside the
 * intro, mirroring where the live 'ceb' answer_full content actually lives
 * (verified against 'bible-tradition-authority', 'primacy-of-peter',
 * 'purgatory' ceb rows: answer_full = intro + shared-answer + conclusion,
 * NOT the per-objection responses). For essays with only one objection
 * (verified against 'indulgences', 'salvation' ceb rows), the entire
 * "Sagot:"-labeled answer belongs to that single objection's response
 * instead — there is no leftover `extra` in that case, matching live ceb
 * answer_full there being ~equal to just the intro.
 */

const QUESTION_LABEL = /\b(?:Tanong|Pangutana|Pagsupak|Supak|Salungat|Pagsalungat|Tutol|Pagtutol)\s*[0-9]*\s*[:.]/i
// \b word-boundary anchors matter here: without them "Salungat" (a label)
// also matches inside unrelated words like "sumasalungat" ("to conflict"),
// which was observed splitting a block mid-sentence (verified 2026-08-27).
const RESPONSE_LABEL = /\b(?:Sagot|Tubag|Tugon)\s*[0-9]*\s*[:.]/i
const CONCLUSION_LABEL = /\b(?:Aral|Pagtulon-an)\s*[:.]/i
const OBJECTION_LABEL = /(?:Pagsupak|Supak|Salungat|Pagsalungat|Tutol|Pagtutol)/i

const QUESTION_LABEL_NUMBERED_G = /\b(?:Tanong|Pangutana|Pagsupak|Supak|Salungat|Pagsalungat|Tutol|Pagtutol)\s*[0-9]+\s*[:.]/gi
const RESPONSE_LABEL_NUMBERED_G = /\b(?:Sagot|Tubag|Tugon)\s*[0-9]+\s*[:.]/gi

export interface EssayQA {
  question: string
  response: string
  isObjection: boolean
}

export interface ParsedEssay {
  title: string
  intro: string
  qa: EssayQA[]
  // Shared/general prose that belongs to the essay as a whole rather than to
  // any single objection — feeds `answer_full`, not `objections`.
  extra: string[]
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function hasAnyLabel(block: string): boolean {
  return QUESTION_LABEL.test(block) || RESPONSE_LABEL.test(block) || CONCLUSION_LABEL.test(block)
}

// Splits a block containing 2+ numbered occurrences of `labelRe` into that
// many segments (each starting at a label match, ending at the next one or
// end-of-block), with the label itself stripped from the front of each.
function splitNumbered(block: string, labelRe: RegExp): string[] {
  const matches = [...block.matchAll(labelRe)]
  if (matches.length < 2) return []
  const segments: string[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!
    const end = i + 1 < matches.length ? matches[i + 1].index! : block.length
    segments.push(normalizeWhitespace(block.slice(start, end).replace(labelRe, '')))
  }
  return segments
}

export function parseApologeticsEssayTl(rawText: string): ParsedEssay {
  const blocks = rawText.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean)
  if (blocks.length < 2) throw new Error('Essay too short to contain a title and intro paragraph')

  const title = normalizeWhitespace(blocks[0])
  const intro = normalizeWhitespace(blocks[1])

  const qa: EssayQA[] = []
  const extra: string[] = []
  const rest = blocks.slice(2)

  let pendingBareHeader = false

  let i = 0
  while (i < rest.length) {
    const block = rest[i]

    const qSegments = splitNumbered(block, QUESTION_LABEL_NUMBERED_G)
    if (qSegments.length >= 2) {
      for (const q of qSegments) {
        qa.push({ question: q, response: '', isObjection: OBJECTION_LABEL.test(block) })
      }
      i++
      continue
    }

    if (QUESTION_LABEL.test(block)) {
      const qStart = block.search(QUESTION_LABEL)
      const label = block.slice(qStart).match(QUESTION_LABEL)![0]
      const isObjection = OBJECTION_LABEL.test(label)
      const afterQLabel = block.slice(qStart).replace(QUESTION_LABEL, '')
      if (normalizeWhitespace(afterQLabel) === '') {
        // Bare header ("Pagtutol:") with nothing else in the block — the
        // actual objection text is the next block.
        pendingBareHeader = true
        i++
        continue
      }
      const rMatch = afterQLabel.search(RESPONSE_LABEL)
      if (rMatch === -1) {
        qa.push({ question: normalizeWhitespace(afterQLabel), response: '', isObjection })
      } else {
        const question = afterQLabel.slice(0, rMatch)
        const response = afterQLabel.slice(rMatch).replace(RESPONSE_LABEL, '')
        qa.push({ question: normalizeWhitespace(question), response: normalizeWhitespace(response), isObjection })
      }
      i++
      continue
    }

    if (pendingBareHeader) {
      qa.push({ question: normalizeWhitespace(block), response: '', isObjection: true })
      pendingBareHeader = false
      i++
      continue
    }

    const openQA = qa.filter((q) => q.response === '')

    if (openQA.length >= 2) {
      const rSegments = splitNumbered(block, RESPONSE_LABEL_NUMBERED_G)
      if (rSegments.length === openQA.length) {
        openQA.forEach((q, idx) => { q.response = rSegments[idx] })
      } else {
        // Shared/general answer prose that precedes the per-objection
        // response block — not attributable to any single objection.
        extra.push(block)
      }
      i++
      continue
    }

    if (openQA.length === 1) {
      if (CONCLUSION_LABEL.test(block)) {
        extra.push(block)
        i++
        continue
      }
      openQA[0].response = normalizeWhitespace(block.replace(RESPONSE_LABEL, ''))
      i++
      // Absorb subsequent unlabeled continuation blocks into this same
      // response, so content is never silently lost.
      while (i < rest.length && !hasAnyLabel(rest[i])) {
        openQA[0].response += ' ' + normalizeWhitespace(rest[i])
        i++
      }
      continue
    }

    // No pending objection — conclusion or other essay-level prose.
    extra.push(block)
    i++
  }

  return { title, intro, qa, extra }
}
