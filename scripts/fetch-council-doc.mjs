#!/usr/bin/env node
/**
 * Fetches a Church Council document and converts to JSON for seeding.
 *
 * Usage:
 *   node scripts/fetch-council-doc.mjs newadvent <url> <slug>
 *   node scripts/fetch-council-doc.mjs trent <slug>
 *
 * Sources:
 *   newadvent   Single-page councils on newadvent.org/fathers/
 *               e.g. Nicaea I:     https://www.newadvent.org/fathers/3801.htm
 *                    Laodicea:     https://www.newadvent.org/fathers/3806.htm
 *                    Chalcedon:    https://www.newadvent.org/fathers/3811.htm
 *                    Constantinople I: https://www.newadvent.org/fathers/3808.htm
 *                    Ephesus:      https://www.newadvent.org/fathers/3810.htm
 *
 *   trent       Fetches all 25 sessions from papalencyclicals.net automatically
 *               No URL needed — session URLs are hardcoded below.
 *
 * Output: scripts/output/<slug>.json  (same format as fetch-vatican-doc.mjs)
 */

import { JSDOM } from 'jsdom'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

// ── Roman numeral helper ───────────────────────────────────────────────────────

const ROMAN = { I:1,V:5,X:10,L:50,C:100,D:500,M:1000 }
function fromRoman(s) {
  if (!s) return 0
  const str = s.trim().toUpperCase()
  let total = 0
  for (let i = 0; i < str.length; i++) {
    const cur = ROMAN[str[i]] ?? 0
    const nxt = ROMAN[str[i+1]] ?? 0
    total += cur < nxt ? -cur : cur
  }
  return total
}

// ── Fetch with retry ───────────────────────────────────────────────────────────

async function fetchHtml(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CFD-Scraper/1.0; +https://codexdefensoris.app)' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      if (attempt === retries) throw err
      const delay = attempt * 1500
      process.stdout.write(`  ⚠ ${err.message} — retry in ${delay}ms…\r`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

// ── Text cleaner ───────────────────────────────────────────────────────────────

function cleanText(t) {
  return (t ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
}

// ── newadvent.org parser ───────────────────────────────────────────────────────
// Structure: h2 = major section (e.g. "The Canons"), h3 = individual canon/item

function parseNewAdvent(html, slug) {
  const { document } = new JSDOM(html).window

  // Title: <h1> or <title> stripped of "CHURCH FATHERS: " prefix
  const rawTitle = (
    document.querySelector('h1')?.textContent ??
    document.title
  ).replace(/^CHURCH FATHERS:\s*/i, '').trim()

  // Year: parenthetical like "(A.D. 325)" or "(4th Century)"
  const yearMatch = rawTitle.match(/\(A\.D\.\s*(\d{3,4})\)/i) ??
                    rawTitle.match(/(\d{3,4})\s*A\.D\./i)
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null

  // Find the main content area (skip nav, header, footer)
  // newadvent wraps article in <div class="content"> or similar
  const content =
    document.querySelector('div.content') ??
    document.querySelector('article') ??
    document.querySelector('main') ??
    document.body

  const sections = []
  let sectionNum  = 0
  let currentH2   = ''
  let currentH3   = ''
  let textBuffer  = []

  function flushBuffer() {
    const text = textBuffer.map(cleanText).filter(Boolean).join('\n\n')
    if (text && currentH3) {
      sectionNum++
      const label = currentH2
        ? `${currentH2} · ${currentH3}`
        : currentH3
      sections.push({ section_num: sectionNum, section_label: label, text, summary: null })
    }
    textBuffer = []
  }

  // Walk all direct children of content area
  const walker = document.createTreeWalker(
    content,
    0x1 | 0x4, // SHOW_ELEMENT | SHOW_TEXT
  )

  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.nodeType === 3) continue // text nodes handled via parent

    const tag = node.tagName?.toLowerCase()
    if (!tag) continue

    // Skip nav/header/footer/script/style
    if (['nav','header','footer','script','style','noscript'].includes(tag)) continue

    if (tag === 'h2') {
      flushBuffer()
      currentH2 = cleanText(node.textContent)
      currentH3 = ''
    } else if (tag === 'h3') {
      flushBuffer()
      currentH3 = cleanText(node.textContent)
    } else if (tag === 'p' && currentH3) {
      const t = cleanText(node.textContent)
      if (t) textBuffer.push(t)
    }
  }
  flushBuffer()

  // Build title without year suffix
  const title = rawTitle.replace(/\s*\(.*?\)\s*$/, '').trim()

  return {
    meta: {
      slug,
      title,
      subtitle: 'Canons and Decrees',
      author: 'ecumenical-council',
      year,
      description: null,
      free_access: true,
      sort_order: 50,
    },
    sections,
  }
}

// ── papalencyclicals.net / Trent parser ───────────────────────────────────────
// Structure (per session page):
//   h2  = "General Council of Trent: [Session Name]"
//   h3  = decree/chapter heading
//   p   = either prose paragraphs OR contains <strong>CANON [ROMAN].</strong>

const TRENT_SESSIONS = [
  { ord: 1,  url: 'https://www.papalencyclicals.net/councils/trent/firstsession.htm' },
  { ord: 2,  url: 'https://www.papalencyclicals.net/councils/trent/second-session.htm' },
  { ord: 3,  url: 'https://www.papalencyclicals.net/councils/trent/third-session.htm' },
  { ord: 4,  url: 'https://www.papalencyclicals.net/councils/trent/fourth-session.htm' },
  { ord: 5,  url: 'https://www.papalencyclicals.net/councils/trent/fifth-session.htm' },
  { ord: 6,  url: 'https://www.papalencyclicals.net/councils/trent/sixth-session.htm' },
  { ord: 7,  url: 'https://www.papalencyclicals.net/councils/trent/seventh-session.htm' },
  { ord: 8,  url: 'https://www.papalencyclicals.net/councils/trent/eighth-session.htm' },
  { ord: 9,  url: 'https://www.papalencyclicals.net/councils/trent/ninth-session.htm' },
  { ord: 10, url: 'https://www.papalencyclicals.net/councils/trent/tenth-session.htm' },
  { ord: 11, url: 'https://www.papalencyclicals.net/councils/trent/eleventh-session.htm' },
  { ord: 12, url: 'https://www.papalencyclicals.net/councils/trent/twelfth-session.htm' },
  { ord: 13, url: 'https://www.papalencyclicals.net/councils/trent/thirteenth-session.htm' },
  { ord: 14, url: 'https://www.papalencyclicals.net/councils/trent/fourteenth-session.htm' },
  { ord: 15, url: 'https://www.papalencyclicals.net/councils/trent/fifteenth-session.htm' },
  { ord: 16, url: 'https://www.papalencyclicals.net/councils/trent/sixteenth-session.htm' },
  { ord: 17, url: 'https://www.papalencyclicals.net/councils/trent/seventeenth-session.htm' },
  { ord: 18, url: 'https://www.papalencyclicals.net/councils/trent/eighteenth-session.htm' },
  { ord: 19, url: 'https://www.papalencyclicals.net/councils/trent/nineteenth-session.htm' },
  { ord: 20, url: 'https://www.papalencyclicals.net/councils/trent/twentieth-session.htm' },
  { ord: 21, url: 'https://www.papalencyclicals.net/councils/trent/twenty-first-session.htm' },
  { ord: 22, url: 'https://www.papalencyclicals.net/councils/trent/twenty-second-session.htm' },
  { ord: 23, url: 'https://www.papalencyclicals.net/councils/trent/twenty-third-session.htm' },
  { ord: 24, url: 'https://www.papalencyclicals.net/councils/trent/twenty-fourth-session.htm' },
  { ord: 25, url: 'https://www.papalencyclicals.net/councils/trent/twenty-fifth-session.htm' },
]

// Matches: "CANON I.-" or "CANON XIV." at the start of a paragraph
const CANON_RE = /^CANON\s+([IVXLCDM]+)\.?\s*[-–]?\s*/i

// Navigation/boilerplate text to skip
const SKIP_PREFIXES = ['Please help support', 'Search Tips', 'Sitemap', 'Menu']

function parseTrentSession(html, sessionOrd) {
  const { document } = new JSDOM(html).window

  // Find session title from h2
  const h2 = document.querySelector('h2')
  const sessionTitle = cleanText(h2?.textContent ?? `Session ${sessionOrd}`)
    .replace(/^General Council of Trent:\s*/i, '')
    .trim()

  const sessionLabel = `Session ${sessionOrd}: ${sessionTitle}`

  const sections = []
  const allNodes  = [...document.querySelectorAll('h3, p')]
  let currentDecree = sessionLabel
  let proseBuffer   = []

  function flushProse() {
    const text = proseBuffer.filter(Boolean).join('\n\n')
    if (text) sections.push({ label: currentDecree, text })
    proseBuffer = []
  }

  for (const node of allNodes) {
    const tag = node.tagName.toLowerCase()

    if (tag === 'h3') {
      const h3text = cleanText(node.textContent)
      flushProse()
      currentDecree = h3text ? `${sessionLabel} · ${h3text}` : sessionLabel
      continue
    }

    const t = cleanText(node.textContent)
    if (!t) continue
    if (SKIP_PREFIXES.some(p => t.startsWith(p))) continue

    // Strip inline page-number markers like "[Page 55]"
    const stripped = t.replace(/^\[Page\s+\d+\]\s*/i, '').trim()
    if (!stripped) continue

    // Detect canon paragraph: plain text starting with "CANON N.-"
    const canonMatch = stripped.match(CANON_RE)
    if (canonMatch) {
      flushProse()
      const canonNum = fromRoman(canonMatch[1])
      const label    = `${sessionLabel} · Canon ${canonNum}`
      const text     = stripped.replace(CANON_RE, '').replace(/^[-–]\s*/, '').trim()
      sections.push({ label, text })
      continue
    }

    proseBuffer.push(stripped)
  }
  flushProse()

  return sections
}

async function fetchTrent(slug) {
  console.log('Fetching Council of Trent (25 sessions)…\n')
  const allSections = []
  let sectionNum = 0

  for (const { ord, url } of TRENT_SESSIONS) {
    process.stdout.write(`  Session ${ord}/25…`)
    const html = await fetchHtml(url)
    const sessionSections = parseTrentSession(html, ord)
    for (const s of sessionSections) {
      sectionNum++
      allSections.push({
        section_num:   sectionNum,
        section_label: s.label,
        text:          s.text,
        summary:       null,
      })
    }
    console.log(` ${sessionSections.length} sections`)
    // Polite crawl delay
    await new Promise(r => setTimeout(r, 800))
  }

  return {
    meta: {
      slug,
      title:       'Council of Trent',
      subtitle:    'Canons and Decrees (1545–1563)',
      author:      'ecumenical-council',
      year:        1563,
      description: 'The nineteenth ecumenical council, defining Catholic doctrine on Scripture and Tradition, Justification, and the seven Sacraments in response to the Protestant Reformation.',
      free_access: true,
      sort_order:  40,
    },
    sections: allSections,
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────────

const [source, arg2, arg3] = process.argv.slice(2)

if (!source) {
  console.error(`Usage:
  node scripts/fetch-council-doc.mjs newadvent <url> <slug>
  node scripts/fetch-council-doc.mjs trent <slug>`)
  process.exit(1)
}

let result

if (source === 'trent') {
  const slug = arg2 ?? 'council-of-trent'
  result = await fetchTrent(slug)

} else if (source === 'newadvent') {
  const [url, slug] = [arg2, arg3]
  if (!url || !slug) {
    console.error('Usage: node scripts/fetch-council-doc.mjs newadvent <url> <slug>')
    process.exit(1)
  }
  console.log(`Fetching ${url}…`)
  const html = await fetchHtml(url)
  result = parseNewAdvent(html, slug)
  console.log(`Parsed ${result.sections.length} sections from "${result.meta.title}"`)

} else {
  console.error(`Unknown source "${source}". Use: newadvent | trent`)
  process.exit(1)
}

// ── Write output ───────────────────────────────────────────────────────────────

const outDir  = resolve(process.cwd(), 'scripts/output')
const outPath = resolve(outDir, `${result.meta.slug}.json`)
mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8')

console.log()
console.log(`✓ "${result.meta.title}" — ${result.sections.length} sections`)
console.log(`  Output: ${outPath}`)
console.log()
console.log(`Next steps:`)
console.log(`  Review: cat ${outPath} | head -80`)
console.log(`  Seed:   node scripts/seed-church-doc.mjs ${outPath}`)
