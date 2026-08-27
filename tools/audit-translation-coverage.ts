#!/usr/bin/env bun
/**
 * Audits ceb/tl translation coverage against the English source, across both
 * translation pipelines in this repo:
 *  1. public/data/content/{en,ceb,tl}/handbook.json — legacy seed source for
 *     scripts/seed.mjs. ceb/tl entries here were hand-authored separately
 *     from en, not generated from it, so a chunk of them use their own
 *     translated `id` instead of the matching English `id` — those can't be
 *     mechanically paired by id and need the manual FUZZY_MATCH map below.
 *  2. content/topics/{generated,validated,published} — the newer
 *     translate-topic.ts pipeline, which does preserve the English topic_id.
 *
 * Output: documents/translation-coverage.json — the checklist consumed when
 * deciding which topics still need a ceb/tl pass, and which existing ceb/tl
 * entries are safe to spot-check against a real English source.
 *
 * Usage: bun tools/audit-translation-coverage.ts
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dir, '..')

function readTopics(lang: string) {
  const path = join(ROOT, 'public/data/content', lang, 'handbook.json')
  return JSON.parse(readFileSync(path, 'utf8')).topics as { id: string; title: string }[]
}

// Hand-verified 2026-08-11 by comparing titles/scripture — ceb/tl id -> matching en id.
// These exist because ceb/tl were authored independently of en, using their own slugs.
export const FUZZY_MATCH: Record<string, string> = {
  'saints-intercession': 'prayer-to-saints',
  'salvation-faith-works': 'salvation',
  'tradition-authority': 'bible-tradition-authority',
  'confession-sacrament': 'confession-to-priest',
  'eucharist-real-presence': 'holy-eucharist',
  'papacy-peters-succession': 'primacy-of-peter',
  'mga-santo-intercessyon': 'prayer-to-saints',
  'kaligtasan-pananampalataya-mga-gawa': 'salvation',
  'tradisyon-awtoridad': 'bible-tradition-authority',
  'papacy-paghalili-kay-pedro': 'primacy-of-peter',
  'eucharist-tunay-na-presensya': 'holy-eucharist',
  'kumpisal-sakramento': 'confession-to-priest',
}

// Same subject already exists correctly under the matching en id in the same
// language — these are stray duplicates, not real extra coverage.
const KNOWN_DUPLICATES = new Set([
  'bible-deuterocanonical-books', // ceb dup of exact-match 'deuterocanonical-books'
  'biblia-kanon-deuterokanoniko', // tl dup of exact-match 'deuterocanonical-books'
  'maria-ina-ng-dios', // tl dup of exact-match 'mary-mother-of-god'
])

// No English source article exists for these at all (verified against the
// full en list) — translation can't be checked against an EN original.
const NO_EN_SOURCE = new Set(['church-teaching-contraception', 'kontrasepsyon-turo'])

function auditHandbook() {
  const en = readTopics('en')
  const ceb = readTopics('ceb')
  const tl = readTopics('tl')
  const enById = new Map(en.map((t) => [t.id, t]))

  function auditLang(lang: string, topics: { id: string; title: string }[]) {
    const covered: { en_id: string; en_title: string; via: string }[] = []
    const orphans: { id: string; title: string; note: string }[] = []
    const seenEnIds = new Set<string>()

    for (const t of topics) {
      if (enById.has(t.id)) {
        covered.push({ en_id: t.id, en_title: enById.get(t.id)!.title, via: 'exact-id' })
        seenEnIds.add(t.id)
      } else if (KNOWN_DUPLICATES.has(t.id)) {
        orphans.push({ id: t.id, title: t.title, note: 'duplicate of an exact-id match, not real extra coverage' })
      } else if (NO_EN_SOURCE.has(t.id)) {
        orphans.push({ id: t.id, title: t.title, note: 'no English source article exists — cannot verify against original' })
      } else if (FUZZY_MATCH[t.id]) {
        const target = FUZZY_MATCH[t.id]
        covered.push({ en_id: target, en_title: enById.get(target)?.title ?? '(unknown)', via: `fuzzy:${t.id}` })
        seenEnIds.add(target)
      } else {
        orphans.push({ id: t.id, title: t.title, note: 'unrecognized — needs manual triage' })
      }
    }

    const missing = en.filter((t) => !seenEnIds.has(t.id)).map((t) => ({ id: t.id, title: t.title }))
    return { total: topics.length, covered, missing, orphans }
  }

  return {
    en_total: en.length,
    ceb: auditLang('ceb', ceb),
    tl: auditLang('tl', tl),
  }
}

function auditNewPipeline() {
  const stages = ['generated', 'needs-review', 'validated', 'published'] as const
  const files: Record<string, string[]> = {}
  for (const stage of stages) {
    const dir = join(ROOT, 'content/topics', stage)
    // stage dirs aren't tracked by git when empty (e.g. generated/validated
    // after their last file was removed), so a missing dir just means "no
    // files at this stage" rather than an error.
    try {
      files[stage] = readdirSync(dir).filter((f) => f.endsWith('.json'))
    } catch {
      files[stage] = []
    }
  }

  // published English topics with no ceb/tl file anywhere in the pipeline
  const translated = new Set(
    Object.values(files)
      .flat()
      .filter((f) => f.endsWith('-ceb.json') || f.endsWith('-tl.json'))
      .map((f) => f.replace(/-(ceb|tl)\.json$/, ''))
  )
  const untranslated = files.published.filter((f) => !translated.has(f.replace('.json', '')))

  return { files, untranslated }
}

// Guarded so other tools (e.g. validate-translation-legacy.ts) can import
// FUZZY_MATCH without triggering a full audit run + report overwrite as a
// side effect of the import.
if (import.meta.main) {
  const report = {
    generated_at_note: 'run bun tools/audit-translation-coverage.ts to refresh — timestamps are not embedded',
    handbook_seed: auditHandbook(),
    translate_topic_pipeline: auditNewPipeline(),
  }

  const outPath = join(ROOT, 'documents/translation-coverage.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2))

  console.log(`Wrote ${outPath}`)
  console.log(`\nceb: ${report.handbook_seed.ceb.covered.length} covered, ${report.handbook_seed.ceb.missing.length} missing, ${report.handbook_seed.ceb.orphans.length} orphans`)
  console.log(`tl:  ${report.handbook_seed.tl.covered.length} covered, ${report.handbook_seed.tl.missing.length} missing, ${report.handbook_seed.tl.orphans.length} orphans`)
  console.log(`\ntranslate-topic.ts pipeline: ${report.translate_topic_pipeline.untranslated.length} published topic(s) with no ceb/tl file: ${report.translate_topic_pipeline.untranslated.join(', ') || 'none'}`)
}
