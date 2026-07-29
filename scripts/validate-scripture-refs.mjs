/**
 * Validate (and optionally fix) topics.scripture references against scripture_verses.
 *
 * Problem: content-generation-prompt.md used to allow range citations
 * ("John 6:53-56"), but scripture_verses stores one row per single verse and
 * TopicContent resolves refs by exact string match — a range silently fails
 * to resolve and the verse disappears from the page with no error.
 *
 * This script finds every topics.scripture entry that doesn't resolve, tries
 * to auto-fix it (expand a range into its constituent single verses; correct
 * "Psalm N:V" -> "Psalms N:V" to match the DB's book-name convention), and
 * reports anything it can't fix automatically.
 *
 * Usage:
 *   node scripts/validate-scripture-refs.mjs             # report only
 *   node scripts/validate-scripture-refs.mjs --fix        # write corrected refs back
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const APPLY_FIX = process.argv.includes('--fix')

// ── Load .env.local ───────────────────────────────────────────────────────────

const envLines = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const val = trimmed.slice(eq + 1).trim()
  process.env[key] = val
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SECRET_KEY || SECRET_KEY.startsWith('your-')) {
  console.error('SUPABASE_SECRET_KEY not set in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Ref expansion helpers ──────────────────────────────────────────────────────

// "1 Corinthians 11:24-25" -> ["1 Corinthians 11:24", "1 Corinthians 11:25"]
// Only handles same-chapter ranges (the only kind the prompt ever produced).
function expandRange(ref) {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)\s*[-–]\s*(\d+)$/)
  if (!m) return null
  const [, book, chapter, startV, endV] = m
  const start = Number(startV)
  const end = Number(endV)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 30) return null
  const verses = []
  for (let v = start; v <= end; v++) verses.push(`${book} ${chapter}:${v}`)
  return verses
}

function normalizeBookName(ref) {
  if (/^Psalm \d/.test(ref)) return ref.replace(/^Psalm /, 'Psalms ')
  return ref
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { data: topics, error: topicsErr } = await supabase
    .from('topics')
    .select('id,lang,scripture')
    .not('scripture', 'is', null)
  if (topicsErr) throw topicsErr

  // Candidate set = every literal ref, plus its normalized and expanded forms —
  // otherwise we'd never learn whether the *fixed* reference actually resolves.
  const candidateRefs = new Set()
  for (const t of topics) {
    for (const r of t.scripture ?? []) {
      candidateRefs.add(r)
      const normalized = normalizeBookName(r)
      candidateRefs.add(normalized)
      const expanded = expandRange(normalized)
      if (expanded) for (const v of expanded) candidateRefs.add(v)
    }
  }

  const candidateList = [...candidateRefs]
  const knownRefs = new Set()
  const CHUNK = 500
  for (let i = 0; i < candidateList.length; i += CHUNK) {
    const chunk = candidateList.slice(i, i + CHUNK)
    const { data: verseRows, error: versesErr } = await supabase
      .from('scripture_verses')
      .select('reference')
      .in('reference', chunk)
    if (versesErr) throw versesErr
    for (const v of verseRows) knownRefs.add(v.reference)
  }

  let fixedTopics = 0
  let unfixable = 0

  for (const topic of topics) {
    const refs = topic.scripture ?? []
    const broken = refs.filter(r => !knownRefs.has(r))
    if (broken.length === 0) continue

    const nextRefs = []
    const notes = []
    let changed = false

    for (const ref of refs) {
      if (knownRefs.has(ref)) {
        nextRefs.push(ref)
        continue
      }

      const normalized = normalizeBookName(ref)
      if (knownRefs.has(normalized)) {
        nextRefs.push(normalized)
        changed = true
        notes.push(`${ref} -> ${normalized}`)
        continue
      }

      const expanded = expandRange(normalized)
      if (expanded) {
        const missing = expanded.filter(v => !knownRefs.has(v))
        if (missing.length === 0) {
          nextRefs.push(...expanded)
          changed = true
          notes.push(`${ref} -> [${expanded.join(', ')}]`)
          continue
        }
        console.log(`  UNFIXABLE range ${ref} (missing verses: ${missing.join(', ')})`)
        nextRefs.push(ref)
        unfixable++
        continue
      }

      console.log(`  UNFIXABLE ${topic.id}/${topic.lang}: "${ref}" — no matching verse, not a parseable range`)
      nextRefs.push(ref)
      unfixable++
    }

    if (changed) {
      console.log(`${topic.id} (${topic.lang}):`)
      for (const n of notes) console.log(`  ${n}`)
      fixedTopics++
      if (APPLY_FIX) {
        const { error } = await supabase
          .from('topics')
          .update({ scripture: nextRefs })
          .eq('id', topic.id)
          .eq('lang', topic.lang)
        if (error) throw error
      }
    }
  }

  console.log(`\n${fixedTopics} topics ${APPLY_FIX ? 'fixed' : 'fixable'}, ${unfixable} refs unfixable.`)
  if (!APPLY_FIX && fixedTopics > 0) console.log('Re-run with --fix to write changes.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
