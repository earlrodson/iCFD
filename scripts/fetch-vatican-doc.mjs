#!/usr/bin/env node
/**
 * Fetches a Vatican.va document and converts it to structured JSON.
 *
 * Usage:
 *   node scripts/fetch-vatican-doc.mjs <url> <slug>
 *
 * Example:
 *   node scripts/fetch-vatican-doc.mjs \
 *     https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html \
 *     magnifica-humanitas
 *
 * Output: scripts/output/<slug>.json
 */

import { JSDOM } from 'jsdom'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const [url, slug] = process.argv.slice(2)
if (!url || !slug) {
  console.error('Usage: node scripts/fetch-vatican-doc.mjs <url> <slug>')
  process.exit(1)
}

// ── Fetch ────────────────────────────────────────────────────────────────────

console.log(`Fetching ${url} …`)
const res = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; iCFD-scraper/1.0)' },
})
if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`)
  process.exit(1)
}
const html = await res.text()

// ── Parse ────────────────────────────────────────────────────────────────────

const dom = new JSDOM(html)
const doc = dom.window.document

function text(el) {
  return el?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

// ── Extract metadata ─────────────────────────────────────────────────────────

// Title: try og:title, then <title>, then first h1/h2
const ogTitle   = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? ''
const pageTitle = doc.querySelector('title')?.textContent ?? ''
const h1Title   = text(doc.querySelector('h1, h2'))

// Vatican page titles are often "Encyclical Letter ... Title (date)" — extract just the document name
let rawTitle = (ogTitle || h1Title || pageTitle).replace(/\s*[\|\-–].*$/, '').trim()
// Strip Vatican boilerplate: "Encyclical Letter of His Holiness Leo XIV Magnifica Humanitas (15 May 2026)"
// → "Magnifica Humanitas"
// Detect pope from URL early so title-stripping only applies to papal documents
const popeInUrl = url.match(/\/content\/([^/]+)\//)

rawTitle = rawTitle
  .replace(/\s*\(\w+\s+\d{1,2},?\s+\d{4}\)\s*$/, '')                     // strip "(July 25, 1968)"
  .replace(/\s*\(\d{1,2}\s+\w+\s+\d{4}\)\s*$/, '')                       // strip "(15 May 2026)"
  .replace(/^(Apostolic\s+)?(Dogmatic\s+)?(Pastoral\s+)?(Encyclical|Exhortation|Constitution|Letter|Bull)\s+(Letter\s+)?/i, '')
  .replace(/^of\s+(His|Her)\s+(Holiness|Eminence|Excellency)\s+/i, '')     // "of His Holiness"
  .replace(/^(Pope|Cardinal|Bishop|Archbishop)\s+/i, '')                    // leading title
  .trim()

// Only strip "Leo XIV " style name prefix on actual papal documents (URL has /content/<pope>/)
if (popeInUrl) {
  rawTitle = rawTitle.replace(/^[A-Z][a-z]+(\s+[A-Z]+)?\s+/, '').trim()
}

// Fallback: use slug converted to title case
if (!rawTitle || rawTitle.length > 80) {
  rawTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Subtitle: try to extract "On ..." phrase from og:description or h2
const ogDesc = doc.querySelector('meta[name="description"], meta[property="og:description"]')?.getAttribute('content') ?? ''
const onMatch = ogDesc.match(/\bON\s+(.+?)(?:\s*\[|\s*$)/i)
const subtitleEl = doc.querySelector('.sottotitolo, .subtitle')
let subtitle = subtitleEl
  ? text(subtitleEl)
  : onMatch
    ? 'On ' + onMatch[1].charAt(0).toUpperCase() + onMatch[1].slice(1).toLowerCase()
    : ''

// Author: look for papal signature or infer from URL /content/<pope>/
const authorEl = doc.querySelector('.firma, .autore, [class*="author"]')
let author = authorEl ? text(authorEl) : ''
if (!author) {
  const pMatch = url.match(/\/content\/([^/]+)\//)
  if (pMatch) {
    // e.g. "leo-xiv" → "Pope Leo XIV" (roman numerals uppercased)
    author = 'Pope ' + pMatch[1]
      .replace(/-/g, ' ')
      .replace(/\b([ivxlcdm]+)\b/gi, (m) => m.toUpperCase())
      .replace(/\b\w/g, c => c.toUpperCase())
  }
}

// Year: from URL — look for YYYYMMDD pattern, or a standalone 19xx/20xx year
const yearMatch = url.match(/[_\/]((?:19|20)\d{2})\d{4}[_\-]/)   // YYYYMMDD block
               || url.match(/[_\/]((?:19|20)\d{2})[_\-]/)          // standalone year
               || url.match(/((?:19|20)\d{2})/)                     // anywhere in URL
const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

// ── Extract sections ─────────────────────────────────────────────────────────

// Vatican documents use several content container selectors
const contentSelectors = [
  '.contesto',        // most common
  '#contesto',
  '.content-text',
  '[class*="corpo"]',
  'article',
  '.text-body',
  'main',
]
let contentEl = null
for (const sel of contentSelectors) {
  contentEl = doc.querySelector(sel)
  if (contentEl) break
}
if (!contentEl) contentEl = doc.body

// Remove navigation, footnotes, header, footer noise
for (const noise of contentEl.querySelectorAll('nav, header, footer, .footnote, .note, script, style, .breadcrumb, .share, .social')) {
  noise.remove()
}

const sections = []
let currentSectionNum = null
let currentLabel = null
let currentParts = []

// Walk all block-level elements in order
const blocks = contentEl.querySelectorAll('p, h2, h3, h4, li')

for (const block of blocks) {
  const raw = text(block)
  if (!raw) continue

  const tag = block.tagName.toLowerCase()

  // Detect a heading (h2/h3/h4) — becomes section_label for next numbered section
  if (['h2', 'h3', 'h4'].includes(tag)) {
    // If we have an open section, flush it
    if (currentSectionNum !== null) {
      sections.push({
        section_num:   currentSectionNum,
        section_label: currentLabel,
        text:          currentParts.join('\n\n').trim(),
        summary:       null,
      })
      currentSectionNum = null
      currentParts = []
    }
    currentLabel = raw
    continue
  }

  // Detect numbered paragraph: starts with digit(s) followed by . or )
  // Handles: "1.", "1)", "1. ", "§1", bold "1." at start
  const numMatch = raw.match(/^(?:§\s*)?(\d+)[.)\s]\s*(.+)/)
  if (numMatch) {
    const num = parseInt(numMatch[1])
    const rest = numMatch[2].trim()

    // Only treat as a new section if the number is sequential (±2 tolerance)
    // This avoids treating scripture references like "John 3:16" as section markers
    const isLikelySection = currentSectionNum === null
      ? (num >= 1 && num <= 5)                           // must start low
      : (num === currentSectionNum + 1 || num === currentSectionNum + 2)

    if (isLikelySection) {
      // Flush previous
      if (currentSectionNum !== null) {
        sections.push({
          section_num:   currentSectionNum,
          section_label: currentLabel,
          text:          currentParts.join('\n\n').trim(),
          summary:       null,
        })
        currentLabel = null
        currentParts = []
      }
      currentSectionNum = num
      if (rest) currentParts.push(rest)
      continue
    }
  }

  // Otherwise append to current section
  if (currentSectionNum !== null) {
    currentParts.push(raw)
  }
}

// Flush last section
if (currentSectionNum !== null && currentParts.length > 0) {
  sections.push({
    section_num:   currentSectionNum,
    section_label: currentLabel,
    text:          currentParts.join('\n\n').trim(),
    summary:       null,
  })
}

// ── Output ───────────────────────────────────────────────────────────────────

const output = {
  meta: {
    slug,
    title:       rawTitle,
    subtitle:    subtitle || null,
    author:      author || null,
    year,
    description: ogDesc || null,
    free_access: true,
    sort_order:  100,
  },
  sections,
}

const outDir = join(__dirname, 'output')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${slug}.json`)
writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8')

console.log(`✓ ${sections.length} sections extracted`)
console.log(`  Title:    ${rawTitle}`)
console.log(`  Author:   ${author}`)
console.log(`  Year:     ${year}`)
console.log(`  Output:   ${outPath}`)
console.log()
console.log('Review the JSON, then seed with:')
console.log(`  node scripts/seed-church-doc.mjs scripts/output/${slug}.json`)
