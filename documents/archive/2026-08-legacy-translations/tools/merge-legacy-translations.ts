#!/usr/bin/env bun
/**
 * Merges validated staged translations (content/legacy-translations/needs-review/
 * or validated/) into public/data/content/<lang>/handbook.json, replacing the
 * existing entry for the same topic id in place. Run after
 * validate-translation-legacy.ts confirms PASS (or REVIEW judged acceptable)
 * for each file — this does no validation itself.
 *
 * Usage: bun tools/merge-legacy-translations.ts <ceb|tl> <file1.json> [file2.json ...]
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dir, '..')

const [, , langArg, ...files] = process.argv
const lang = langArg as 'ceb' | 'tl'
if (!['ceb', 'tl'].includes(lang) || files.length === 0) {
  console.error('Usage: bun tools/merge-legacy-translations.ts <ceb|tl> <file1.json> [file2.json ...]')
  process.exit(1)
}

const handbookPath = join(ROOT, 'public/data/content', lang, 'handbook.json')
const handbook = JSON.parse(readFileSync(handbookPath, 'utf8'))
const topicsById = new Map(handbook.topics.map((t: { id: string }) => [t.id, t]))

let merged = 0
for (const file of files) {
  const translated = JSON.parse(readFileSync(file, 'utf8'))
  if (!topicsById.has(translated.id)) {
    console.error(`  ✗ ${translated.id}: no existing entry in ${handbookPath} to replace — skipping`)
    continue
  }
  topicsById.set(translated.id, translated)
  merged++
  console.log(`  ✓ ${translated.id}`)
}

handbook.topics = [...topicsById.values()]
writeFileSync(handbookPath, JSON.stringify(handbook, null, 2))
console.log(`\nMerged ${merged}/${files.length} topic(s) into ${handbookPath}`)
