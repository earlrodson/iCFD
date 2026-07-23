#!/usr/bin/env node
/**
 * Parses the CFD Davao Layman's Biblical Theology and Apologetics Course manual
 * (converted from .doc to .txt via `textutil -convert txt`) into topics-schema JSON.
 *
 * Usage:
 *   textutil -convert txt "documents/CFD-Davao-Laymans-biblical-theology-and-apologetic-course.doc" -output /tmp/course.txt
 *   node scripts/parse-course-manual.mjs /tmp/course.txt
 *
 * Output: scripts/output/laymans-biblical-theology-course.json
 *         Array of objects matching the `topics` table / Topic type (lang: 'ceb'):
 *         { id, lang, category, title, question, answer, objections, scripture,
 *           tags, difficulty, related_topics, last_updated }
 *
 * The manual's 20 lessons each follow one of two patterns:
 *   1. "Panudlo sa Sta. Iglesya.- ..." teaching paragraph, then "Pagsupak:" with
 *      numbered "Supak N." objections, then "Tubag:" main rebuttal followed by
 *      numbered "Tubag N." replies (one per objection), then optional "Pagtulon-an:"
 *   2. "Panudlo sa Sta. Iglesya.- ..." then repeating "Pangutana: ... Tubag: ..." pairs
 *
 * Scripture citations appear as “quoted Cebuano text” (Book Ch:Verse) — both the
 * quote and reference are extracted; `text` is Cebuano prose, not a canonical
 * translation, so `version` is tagged 'CEB-CFD' rather than NABRE/RSV-CE/DR.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/parse-course-manual.mjs <path-to-txt>')
  process.exit(1)
}

const raw = readFileSync(resolve(inputPath), 'utf8')

// ── Lesson boundaries ────────────────────────────────────────────────────────
// Hardcoded from the manual's actual body headers (lines ~470-1341 of the
// textutil output) — the TOC and a duplicate "outline" appendix later in the
// document use slightly different header text, so these are matched verbatim
// against the body copy specifically.

const LESSONS = [
  { header: 'BIBLIYA, TRADISYON UG AUTORIDAD SA STA. IGLESYA', id: 'bible-tradition-authority', title: 'Bibliya, Tradisyon ug Autoridad sa Sta. Iglesya', category: 'tradition' },
  { header: 'MATUOD NGA IGLESYA', id: 'true-church', title: 'Matuod nga Iglesya', category: 'church-teaching' },
  { header: 'SANTISIMA TRINIDAD', id: 'holy-trinity', title: 'Santisima Trinidad', category: 'church-teaching' },
  { header: 'PAGKA-DIOS NI CRISTO', id: 'divinity-of-christ', title: 'Pagka-Dios ni Cristo', category: 'church-teaching' },
  { header: 'STA. MARIA, IMMACULADA CONCEPCION', id: 'immaculate-conception', title: 'Sta. Maria, Immaculada Concepcion', category: 'mary' },
  { header: "STA. MARIA, KANUNAY’NG ULAY", id: 'perpetual-virginity', title: "Sta. Maria, Kanunay'ng Ulay", category: 'mary' },
  { header: 'LARAWAN', id: 'sacred-images', title: 'Larawan', category: 'tradition' },
  { header: 'ANG PAG-AMPO SA MGA SANTOS', id: 'prayer-to-saints', title: 'Ang Pag-ampo sa mga Santos', category: 'saints' },
  { header: 'PURGATURYO', id: 'purgatory', title: 'Purgaturyo', category: 'salvation' },
  { header: 'ANG PAGKAPANGULO NI PEDRO', id: 'primacy-of-peter', title: 'Ang Pagkapangulo ni Pedro', category: 'papacy' },
  { header: 'ANG INDULHENSYA', id: 'indulgences', title: 'Ang Indulhensya', category: 'salvation' },
  { header: 'BUNYAG SA BATA', id: 'infant-baptism', title: 'Bunyag sa Bata', category: 'sacraments' },
  { header: 'PAGKOMPISAL SA PARI', id: 'confession-to-priest', title: 'Pagkompisal sa Pari', category: 'sacraments' },
  { header: 'ANG SANTOS NGA EUKARISTIYA', id: 'holy-eucharist', title: 'Ang Santos nga Eukaristiya', category: 'sacraments' },
  { header: 'ANG SACRAMENTO SA ORDEN', id: 'holy-orders', title: 'Ang Sacramento sa Orden', category: 'sacraments' },
  { header: 'ANG SANTOS NGA MISA', id: 'holy-mass', title: 'Ang Santos nga Misa', category: 'sacraments' },
  { header: 'ADLAWNG IGPAPAHULAY', id: 'sunday-observance', title: 'Adlawng Igpapahulay', category: 'church-teaching' },
  { header: 'KALAN-ON NGA GIDILI', id: 'dietary-abstinence', title: 'Kalan-on nga Gidili', category: 'church-teaching' },
  { header: 'KRUS UG PANGUROS', id: 'cross-sign-of-cross', title: 'Krus ug Panguros', category: 'tradition' },
  { header: 'KALUWASAN', id: 'salvation', title: 'Kaluwasan', category: 'salvation' },
]

// ── Slice the raw text into one block per lesson ────────────────────────────

function findAll(haystack, needle) {
  const idxs = []
  let from = 0
  while (true) {
    const i = haystack.indexOf(needle, from)
    if (i === -1) break
    idxs.push(i)
    from = i + needle.length
  }
  return idxs
}

// The body copy is the FIRST occurrence of each header; a duplicate "outline"
// appendix later in the doc reuses the same titles, so anchor on lesson 1's
// first occurrence and lesson 2's first occurrence *after* it, etc.
let cursor = 0
const blocks = []
for (let i = 0; i < LESSONS.length; i++) {
  const startIdx = raw.indexOf(LESSONS[i].header, cursor)
  if (startIdx === -1) {
    console.error(`✗ Could not find header for "${LESSONS[i].title}" after offset ${cursor}`)
    process.exit(1)
  }
  const searchFrom = startIdx + LESSONS[i].header.length
  const nextHeader = LESSONS[i + 1]?.header
  const endIdx = nextHeader ? raw.indexOf(nextHeader, searchFrom) : raw.length
  blocks.push({ ...LESSONS[i], raw: raw.slice(searchFrom, endIdx).trim() })
  cursor = searchFrom
}

// ── Text cleanup helpers ─────────────────────────────────────────────────────

function clean(s) {
  return s
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n\n')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim()
}

// ── Scripture citation extraction ───────────────────────────────────────────
// Matches “quoted Cebuano text” (Book Ch:Verse[-Verse]) — curly or straight quotes.

const CITATION_RE = /[“"]([^“”"]{3,400}?)[”"]\s*\(([1-3]?\s?[A-Za-zÀ-ÿ.]+\.?\s*\d{1,3}:\d{1,3}(?:[-–]\d{1,3})?(?:,\s*\d{1,3}(?:[-–]\d{1,3})?)*)\)/g

function extractScripture(text) {
  const seen = new Map()
  for (const m of text.matchAll(CITATION_RE)) {
    const quote = m[1].replace(/\s+/g, ' ').trim()
    const reference = m[2].replace(/\s+/g, ' ').trim()
    if (!seen.has(reference)) {
      seen.set(reference, { reference, text: quote, version: 'CEB-CFD' })
    }
  }
  return [...seen.values()]
}

// ── Per-lesson body parsing ──────────────────────────────────────────────────

function parseLesson(block) {
  const { raw: body } = block

  // Teaching paragraph: everything up to the first objection/question marker.
  // Most lessons have a "Pagsupak:" or "Pangutana:" label, but a few (e.g.
  // Pagkompisal sa Pari) jump straight into "Supak 1." with no label at all.
  const firstMarker = body.search(/\n?\s*(Pagsupak:?|Pangutana:|Supak\s*1\.)/)
  const teachingRaw = firstMarker === -1 ? body : body.slice(0, firstMarker)
  let teaching = clean(teachingRaw).replace(/^Panudlo sa Sta\. Iglesya\.?\s*[-–]\s*/, '')

  const rest = firstMarker === -1 ? '' : body.slice(firstMarker)

  const objections = []
  let question = `Unsa ang gitudlo sa Simbahang Katoliko bahin sa ${block.title.toLowerCase()}?`
  let answerExtra = ''

  if (/^\s*(Pagsupak:?|Supak\s*1\.)/.test(rest.trimStart())) {
    // Pattern 1: [Pagsupak:] Supak N. ... then either
    //   (a) "Tubag:" <main rebuttal> Tubag N. ... , or
    //   (b) straight into "Tubag 1." with no bare "Tubag:" header
    const tubagBareIdx = rest.search(/Tubag:/)
    const tubagNumIdx = rest.search(/Tubag\s*1\./)
    const closeIdx = [tubagBareIdx, tubagNumIdx].filter(i => i !== -1).sort((a, b) => a - b)[0] ?? rest.length

    const supakStartMatch = rest.match(/Pagsupak:?/)
    const supakStart = supakStartMatch ? supakStartMatch.index + supakStartMatch[0].length : 0
    const supakText = rest.slice(supakStart, closeIdx)
    const supaks = new Map()
    for (const m of supakText.matchAll(/Supak\s*(\d+)\.\s*([\s\S]*?)(?=Supak\s*\d+\.|$)/g)) {
      supaks.set(m[1], clean(m[2]))
    }

    // Only strip a bare "Tubag:" label if it appears before the first numbered "Tubag N."
    const hasBareTubagFirst = tubagBareIdx !== -1 && (tubagNumIdx === -1 || tubagBareIdx < tubagNumIdx)
    const afterTubag = hasBareTubagFirst ? rest.slice(tubagBareIdx + 'Tubag:'.length) : rest.slice(closeIdx)
    const firstNumbered = afterTubag.search(/Tubag\s*1\./)
    const mainRebuttal = firstNumbered === -1 ? afterTubag : afterTubag.slice(0, firstNumbered)
    const numberedPart = firstNumbered === -1 ? '' : afterTubag.slice(firstNumbered)

    // Strip a trailing "Pagtulon-an:" section out of whichever chunk has it
    const lessonMatch = (numberedPart || mainRebuttal).match(/Pagtulon-an:([\s\S]*)$/)
    if (lessonMatch) answerExtra = clean(lessonMatch[1])

    answerExtra = clean(mainRebuttal.replace(/Pagtulon-an:[\s\S]*$/, '')) + (answerExtra ? '\n\n' + answerExtra : '')

    const tubaks = new Map()
    for (const m of numberedPart.matchAll(/Tubag\s*(\d+)\.\s*([\s\S]*?)(?=Tubag\s*\d+\.|Pagtulon-an:|$)/g)) {
      tubaks.set(m[1], clean(m[2]))
    }

    if (supaks.size === 0 && clean(supakText)) {
      // No "Supak N." numbering at all — a single unnumbered objection paragraph
      // paired with the single unnumbered "Tubag:" rebuttal as its response.
      objections.push({ objection: clean(supakText), response: answerExtra })
      answerExtra = ''
    } else if (supaks.size > 0 && tubaks.size === 0 && clean(answerExtra)) {
      // Several numbered Supak N. objections but only ONE shared "Tubag:"
      // paragraph answering all of them together (no per-number Tubag N.) —
      // attach the same shared rebuttal to every objection rather than
      // leaving response blank, and don't also duplicate it into `answer`.
      const nums = [...supaks.keys()].sort((a, b) => +a - +b)
      for (const n of nums) {
        objections.push({ objection: supaks.get(n) ?? '', response: answerExtra })
      }
      answerExtra = ''
    } else {
      const nums = [...new Set([...supaks.keys(), ...tubaks.keys()])].sort((a, b) => +a - +b)
      for (const n of nums) {
        objections.push({
          objection: supaks.get(n) ?? '',
          response: tubaks.get(n) ?? '',
        })
      }
    }
    // Keep the templated Cebuano question — Supak paragraphs are prose
    // objections, not short questions, so they don't read well as `question`.
  } else if (/^\s*Pangutana:/.test(rest.trimStart())) {
    // Pattern 2: repeating Pangutana: ... Tubag: ... pairs — these ARE short
    // genuine questions, so the first one becomes the topic's `question`.
    for (const m of rest.matchAll(/Pangutana:\s*([\s\S]*?)\s*Tubag:\s*([\s\S]*?)(?=Pangutana:|$)/g)) {
      objections.push({ objection: clean(m[1]), response: clean(m[2]) })
    }
    if (objections[0]?.objection && objections[0].objection.length < 200) {
      question = objections[0].objection
    }
  } else {
    answerExtra = clean(rest)
  }

  const fullText = [teaching, answerExtra, ...objections.flatMap(o => [o.objection, o.response])].join(' ')
  const scriptureVerses = extractScripture(fullText)

  return {
    id: block.id,
    lang: 'ceb',
    category: block.category,
    title: block.title,
    question,
    // Concise tab: just the opening "Panudlo sa Sta. Iglesya" teaching
    // paragraph. Comprehensive tab: the full lesson (teaching + supporting
    // argument + objections/responses) — this is the bulk of the course
    // content and belongs on Comprehensive, not Concise.
    answer: teaching,
    answerFull: [teaching, answerExtra].filter(Boolean).join('\n\n'),
    objections,
    // Reference strings only — matches the live `topics.scripture` shape
    // (lib/content/database.ts resolves these against `scripture_verses` at
    // render time). Full quote text is collected separately below.
    scripture: scriptureVerses.map(v => v.reference),
    tags: [block.id.replace(/-/g, ' ')],
    difficulty: 'beginner',
    related_topics: [],
    last_updated: new Date().toISOString(),
    _verses: scriptureVerses, // dropped after global dedup, see below
  }
}

const parsedTopics = blocks.map(parseLesson)

// ── Dedup scripture_verses across the whole course ──────────────────────────
// Version 'CEB' — these are Cebuano prose quotes from this manual, not a
// canonical NABRE/RSV-CE/DR translation. The app's resolver prefers 'NABRE'
// when both exist for the same reference and falls back to whatever's
// available, so seeding these lets citations resolve immediately even where
// no English verse has been imported yet for that reference.
const verseMap = new Map()
for (const t of parsedTopics) {
  for (const v of t._verses) {
    if (!verseMap.has(v.reference)) {
      verseMap.set(v.reference, { reference: v.reference, version: 'CEB', text: v.text })
    }
  }
}
const scripture_verses = [...verseMap.values()]
const topics = parsedTopics.map(({ _verses, ...t }) => t)

// ── Output ───────────────────────────────────────────────────────────────────

const outDir = resolve(__dirname, 'output')
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, 'laymans-biblical-theology-course.json')
writeFileSync(outPath, JSON.stringify({ topics, scripture_verses }, null, 2), 'utf8')

console.log(`✓ Parsed ${topics.length} lessons, ${scripture_verses.length} unique scripture verses`)
for (const t of topics) {
  console.log(`  ${t.id.padEnd(28)} objections:${String(t.objections.length).padStart(2)}  scripture:${String(t.scripture.length).padStart(2)}  answer:${t.answer.length}ch`)
}
console.log(`\nOutput: ${outPath}`)
