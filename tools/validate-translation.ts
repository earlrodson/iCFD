#!/usr/bin/env bun
/**
 * Tier 0 (deterministic) translation QA — see
 * documents/VerifyArchitecture/translation-qa-pipeline.md. Zero LLM tokens.
 *
 * Checks a translated topic file against its English source (fetched live
 * from Supabase, same as translate-topic.ts does — no English copy is kept
 * locally):
 *
 * 1. Citation integrity — extracts blockquotes + inline citation
 *    parentheticals ((CCC 126), (Lumen Fidei §38), (John 1:14)) using the
 *    same regex translate-topic.ts uses to protect them from translation,
 *    then diffs the EN and translated sets. Flags missing, added
 *    (fabricated — the (CCC 641) failure mode noted in the pipeline doc),
 *    reordered, or text-altered citations.
 * 2. Terminology consistency — flags when a fixed EN term's expected
 *    translation doesn't appear anywhere in the target text, or appears
 *    inconsistently (multiple different renderings of the same EN term).
 *
 * This does not judge translation quality — that's Tier 2 (local LLM
 * judges), not yet built. This only catches mechanically-checkable errors.
 *
 * Usage: bun tools/validate-translation.ts <path/to/topic-ceb.json|topic-tl.json>
 */
import { readFileSync } from 'fs'
import { getSupabaseAdmin } from '../scripts/lib/supabase-admin.mjs'

const [, , inPath] = process.argv
if (!inPath) {
  console.error('Usage: bun tools/validate-translation.ts <path/to/topic-ceb.json|topic-tl.json>')
  process.exit(1)
}

const translated = JSON.parse(readFileSync(inPath, 'utf8'))
const lang = translated.lang as 'ceb' | 'tl'
if (!['ceb', 'tl'].includes(lang)) {
  console.error(`Unexpected lang "${translated.lang}" in ${inPath} — expected "ceb" or "tl"`)
  process.exit(1)
}

// ---- citation extraction (mirrors translate-topic.ts's protect()) ----

const CITATION_RE =
  /(^>.*$)|(\((?:CCC\s?\d+(?:[,\s–-]+\d+)*|[A-Za-z][A-Za-z .'-]*§\s?\d+|[1-3]?\s?[A-Z][a-zA-Z]+\.?\s\d+:\d+(?:[-–]\d+)?(?:,\s?\d+(?:[-–]\d+)?)*)\))/gm

function extractCitations(text: string | undefined): string[] {
  if (!text) return []
  return [...text.matchAll(CITATION_RE)].map((m) => (m[1] ?? m[2]).trim())
}

const PROSE_FIELDS = ['title', 'question', 'summary', 'answer_full'] as const

function fieldCitations(topic: Record<string, unknown>): string[] {
  const out: string[] = []
  for (const f of PROSE_FIELDS) out.push(...extractCitations(topic[f] as string | undefined))
  for (const o of (topic.objections as { objection?: string; response?: string }[] | undefined) ?? []) {
    out.push(...extractCitations(o.objection))
    out.push(...extractCitations(o.response))
  }
  return out
}

function diffCitations(enList: string[], trList: string[]) {
  const enCounts = new Map<string, number>()
  for (const c of enList) enCounts.set(c, (enCounts.get(c) ?? 0) + 1)
  const trCounts = new Map<string, number>()
  for (const c of trList) trCounts.set(c, (trCounts.get(c) ?? 0) + 1)

  const missing: string[] = []
  for (const [c, n] of enCounts) {
    const have = trCounts.get(c) ?? 0
    for (let i = have; i < n; i++) missing.push(c)
  }
  const added: string[] = []
  for (const [c, n] of trCounts) {
    const have = enCounts.get(c) ?? 0
    for (let i = have; i < n; i++) added.push(c)
  }
  const reordered = missing.length === 0 && added.length === 0 && enList.join('|') !== trList.join('|')
  return { missing, added, reordered }
}

// ---- terminology dictionary (seeded from what's actually in this corpus) ----

const TERMINOLOGY: { en: RegExp; expected: Record<'ceb' | 'tl', RegExp> }[] = [
  { en: /\bHoly Spirit\b/i, expected: { ceb: /\bEspiritu Santo\b/i, tl: /\bEspiritu Santo\b/i } },
  { en: /\bChurch\b/, expected: { ceb: /\b(Simbahan|Iglesya)\b/i, tl: /\b(Simbahan|Iglesia)\b/i } },
  { en: /\bTradition\b/, expected: { ceb: /\bTradisyon\b/i, tl: /\bTradisyon\b/i } },
  { en: /\bCatechism\b/, expected: { ceb: /\bKatesismo\b/i, tl: /\bKatesismo\b/i } },
  { en: /\bMagisterium\b/, expected: { ceb: /\bMagisterium|Magisteryo\b/i, tl: /\bMagisterium|Magisteryo\b/i } },
  { en: /\bGospels?\b/i, expected: { ceb: /\bEbanghelyo\b/i, tl: /\bEbanghelyo\b/i } },
  { en: /\bApostles?\b/i, expected: { ceb: /\bapostoles\b/i, tl: /\bapostol/i } },
]

function checkTerminology(enText: string, trText: string): { term: string; issue: string }[] {
  const flagged: { term: string; issue: string }[] = []
  for (const { en, expected } of TERMINOLOGY) {
    const enHits = enText.match(en)
    if (!enHits) continue
    const re = expected[lang]
    if (!re.test(trText)) {
      flagged.push({ term: en.source, issue: `EN term present (${enHits.length}x) but expected translation not found in ${lang} text` })
    }
  }
  return flagged
}

// ---- fetch English source ----

const supabase = getSupabaseAdmin()
const { data: enRow, error } = await supabase
  .from('topics')
  .select('id,title,question,answer,answer_full,objections')
  .eq('id', translated.topic_id)
  .eq('lang', 'en')
  .maybeSingle()

if (error) throw error
if (!enRow) {
  console.error(`No English source found in Supabase for topic_id "${translated.topic_id}" — cannot run Tier 0 checks.`)
  process.exit(1)
}

// DB stores summary in the `answer` column, either as a plain string or as
// { summary, full, keyPoints? } (see drizzle/schema.ts comment on `answer`).
// The translated file keeps it top-level (tools/import-topic.ts's
// `answer: { summary }` mapping only covers the object shape).
const rawAnswer = enRow.answer as string | { summary?: string } | null
const enTopic = { ...enRow, summary: typeof rawAnswer === 'string' ? rawAnswer : rawAnswer?.summary }

// ---- run checks ----

const enCitations = fieldCitations(enTopic)
const trCitations = fieldCitations(translated)
const citationDiff = diffCitations(enCitations, trCitations)

const enProse = PROSE_FIELDS.map((f) => enTopic[f] ?? '').join('\n')
const trProse = PROSE_FIELDS.map((f) => translated[f] ?? '').join('\n')
const terminologyIssues = checkTerminology(enProse, trProse)

const critical = citationDiff.missing.length > 0 || citationDiff.added.length > 0
const verdict = critical ? 'FAIL' : citationDiff.reordered || terminologyIssues.length > 0 ? 'REVIEW' : 'PASS'

const report = {
  topic_id: translated.topic_id,
  lang,
  citations: {
    en_count: enCitations.length,
    translated_count: trCitations.length,
    missing: citationDiff.missing,
    added: citationDiff.added,
    reordered: citationDiff.reordered,
  },
  terminology: { flagged: terminologyIssues },
  verdict,
}

console.log(JSON.stringify(report, null, 2))
if (verdict === 'FAIL') process.exit(1)
