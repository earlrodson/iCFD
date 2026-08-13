#!/usr/bin/env bun
/**
 * Tier 0 (deterministic) translation QA for the legacy handbook.json seed —
 * see documents/VerifyArchitecture/translation-qa-pipeline.md. Sibling of
 * validate-translation.ts, which targets the newer translate-topic.ts
 * pipeline's schema instead.
 *
 * The handbook.json format has no inline (CCC 123) / (John 3:16) style
 * citations in prose — references live in structured `catechism` (CCC
 * paragraph numbers) and `scripture` (reference + translated verse text)
 * arrays instead, so the checks here are structural, not regex-over-prose:
 *
 * 1. Catechism validity — every CCC number cited in the target-lang entry
 *    must actually exist (checked against the live ccc_paragraphs corpus,
 *    which is lang-independent by paragraph number). NOT compared for
 *    parity against the English entry's citation set: ceb/tl handbook
 *    entries were hand-authored independently of en (different author,
 *    different pass), so picking a different-but-valid supporting
 *    paragraph from the same doctrinal area is expected, not an error —
 *    verified 2026-08-13 against holy-eucharist/eucharist-real-presence,
 *    where en cites CCC 1374/1375/1377/1413 and ceb cites CCC
 *    1374/1376/1380/1413, and all six numbers are genuinely about the
 *    Real Presence. An earlier version of this script flagged that
 *    divergence as FAIL; that was a validator bug, not a content bug.
 * 2. Scripture reference well-formedness — each reference must parse to a
 *    chapter:verse pattern. Not checked for existence against
 *    scripture_verses: book names are themselves translated (e.g. "John"
 *    -> "Juan") and ceb/tl coverage in that table is thin by design (see
 *    CLAUDE.md), so a DB miss there is not meaningful signal here.
 * 3. Terminology consistency — same fixed-term dictionary as
 *    validate-translation.ts, run against the `answer` field.
 *
 * The English entry's own catechism/scripture citations are still fetched
 * and included in the report for human reference, but purely informational
 * — they do not affect the verdict.
 *
 * ceb/tl entries in this seed were hand-authored separately from en, so a
 * chunk of them use their own id instead of the matching English id — this
 * script resolves that the same way tools/audit-translation-coverage.ts
 * does, via its exported FUZZY_MATCH map.
 *
 * Usage: bun tools/validate-translation-legacy.ts <ceb-or-tl-topic-id> <ceb|tl>
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { FUZZY_MATCH } from './audit-translation-coverage'
import { checkTerminology } from './lib/qa-terminology'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const ROOT = join(import.meta.dir, '..')

const [, , targetId, langArg] = process.argv
const lang = langArg as 'ceb' | 'tl'
if (!targetId || !['ceb', 'tl'].includes(lang)) {
  console.error('Usage: bun tools/validate-translation-legacy.ts <ceb-or-tl-topic-id> <ceb|tl>')
  process.exit(1)
}

type LegacyTopic = {
  id: string
  title: string
  question: string
  answer: string
  scripture: { reference: string; text: string; version: string }[]
  catechism: string[]
}

function readTopics(l: string): LegacyTopic[] {
  return JSON.parse(readFileSync(join(ROOT, 'public/data/content', l, 'handbook.json'), 'utf8')).topics
}

const en = readTopics('en')
const target = readTopics(lang)

const targetTopic = target.find((t) => t.id === targetId)
if (!targetTopic) {
  console.error(`No topic with id "${targetId}" found in public/data/content/${lang}/handbook.json`)
  process.exit(1)
}

const enId = en.some((t) => t.id === targetId) ? targetId : FUZZY_MATCH[targetId]
const enTopic = enId ? en.find((t) => t.id === enId) : undefined
if (!enTopic) {
  console.error(`No English source found for "${targetId}" (resolved en id: ${enId ?? 'none'}) — cannot run Tier 0 checks.`)
  process.exit(1)
}

// ---- catechism validity (does each cited CCC number actually exist?) ----

const cccNumber = (s: string) => parseInt(s.match(/\d+/)?.[0] ?? '0', 10)
const trCccNumbers = targetTopic.catechism.map(cccNumber)

const supabase = getSupabaseAdmin()
const { data: existingCcc, error: cccError } = await supabase
  .from('ccc_paragraphs')
  .select('paragraph')
  .in('paragraph', trCccNumbers)
  .eq('lang', 'en')
if (cccError) throw cccError
const existingCccSet = new Set((existingCcc ?? []).map((r) => r.paragraph))
const cccInvalid = trCccNumbers.filter((n) => !existingCccSet.has(n))

// ---- scripture reference well-formedness ----

const verseNumbers = (ref: string) => ref.match(/\d+:\d+(?:[-–]\d+)?/g) ?? []
const scriptureMalformed = targetTopic.scripture.filter((s) => verseNumbers(s.reference).length === 0).map((s) => s.reference)

// ---- terminology ----

const terminologyIssues = checkTerminology(lang, enTopic.answer, targetTopic.answer)

const critical = cccInvalid.length > 0
const verdict = critical ? 'FAIL' : scriptureMalformed.length > 0 || terminologyIssues.length > 0 ? 'REVIEW' : 'PASS'

const report = {
  target_id: targetId,
  en_id: enId,
  lang,
  catechism: {
    translated: targetTopic.catechism,
    invalid: cccInvalid,
    en_citations_informational: enTopic.catechism,
  },
  scripture: {
    translated_references: targetTopic.scripture.map((s) => s.reference),
    malformed: scriptureMalformed,
    en_references_informational: enTopic.scripture.map((s) => s.reference),
  },
  terminology: { flagged: terminologyIssues },
  verdict,
}

console.log(JSON.stringify(report, null, 2))
if (verdict === 'FAIL') process.exit(1)
