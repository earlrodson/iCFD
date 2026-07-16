/**
 * Batch translation script — translates all stub/missing TL and CEB topics from EN.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/translate.mjs
 *   node scripts/translate.mjs --lang tl         # only Tagalog
 *   node scripts/translate.mjs --lang ceb        # only Cebuano
 *   node scripts/translate.mjs --id sacred-images # single topic
 *   node scripts/translate.mjs --force           # re-translate even machine rows
 *   node scripts/translate.mjs --dry-run         # preview, no DB writes
 *
 * Requires in .env.local:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   SUPABASE_SECRET_KEY=sb_secret_...
 *   NEXT_PUBLIC_SUPABASE_URL=https://...
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Load .env.local ───────────────────────────────────────────────────────────
const envLines = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const val = trimmed.slice(eq + 1).trim()
  // Don't overwrite vars already set in the environment (allows CLI overrides)
  if (val && !process.env[key]) process.env[key] = val
}

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const targetLangArg = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null
const targetIdArg  = args.includes('--id')   ? args[args.indexOf('--id')   + 1] : null
const force        = args.includes('--force')
const dryRun       = args.includes('--dry-run')
const targetLangs  = targetLangArg ? [targetLangArg] : ['tl', 'ceb']

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SECRET_KEY    = process.env.SUPABASE_SECRET_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SECRET_KEY) { console.error('❌  Supabase keys missing in .env.local'); process.exit(1) }
if (!ANTHROPIC_KEY) { console.error('❌  ANTHROPIC_API_KEY missing in .env.local'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const LANG_NAMES = { tl: 'Filipino (Tagalog)', ceb: 'Cebuano (Bisaya)' }

// ── Load site_config translation settings ─────────────────────────────────────
async function loadTranslationConfig() {
  const { data } = await supabase
    .from('site_config')
    .select('key, value')
    .in('key', ['translation_prompt', 'translation_provider'])
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))
  return {
    provider: map.translation_provider ?? 'claude',
    prompt: map.translation_prompt ?? 'Translate to {lang}. Preserve all CCC numbers, scripture references, and theological terms (latria, dulia, hyperdulia, transubstantiation, ex cathedra, kecharitomene, theotokos). Return only valid JSON with the same structure.',
  }
}

// ── Fetch EN topics ───────────────────────────────────────────────────────────
async function fetchEnTopics() {
  let query = supabase
    .from('topics')
    .select('id, title, question, answer, objections, church_fathers, translation_notes, tags, related_topics, scripture, catechism, category, difficulty, last_updated')
    .eq('lang', 'en')
    .order('title')

  if (targetIdArg) query = query.eq('id', targetIdArg)

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch EN topics: ' + error.message)
  return data ?? []
}

// ── Fetch existing TL/CEB rows ────────────────────────────────────────────────
async function fetchExistingRows(ids) {
  const { data } = await supabase
    .from('topics')
    .select('id, lang, translation_source')
    .in('id', ids)
    .in('lang', targetLangs)
  return new Set((data ?? []).map((r) => `${r.id}:${r.lang}:${r.translation_source}`))
}

// ── Translate via Claude ───────────────────────────────────────────────────────
function answerToString(answer) {
  if (typeof answer === 'string') return answer
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    return answer.full ?? answer.summary ?? ''
  }
  return ''
}

async function translateWithClaude(topic, targetLang, basePrompt, translationNotes) {
  const langName = LANG_NAMES[targetLang]
  const systemPrompt = basePrompt.replace('{lang}', langName)

  const notes = translationNotes ? `\n\nTopic-specific translator notes:\n${translationNotes}` : ''

  const input = {
    title: topic.title,
    question: topic.question,
    answer: answerToString(topic.answer),
    ...(Array.isArray(topic.objections) && topic.objections.length ? { objections: topic.objections } : {}),
    ...(Array.isArray(topic.church_fathers) && topic.church_fathers.length ? { churchFathers: topic.church_fathers } : {}),
  }

  const userContent = `Translate the following Catholic apologetics topic to ${langName}.
Return ONLY valid JSON matching the exact structure of the input. No explanation, no markdown.${notes}

Input JSON:
${JSON.stringify(input, null, 2)}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.find((b) => b.type === 'text')?.text ?? ''
  const jsonText = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  return JSON.parse(jsonText)
}

// ── Upsert translated row ─────────────────────────────────────────────────────
async function upsertTranslation(enTopic, translated, targetLang) {
  const row = {
    id: enTopic.id,
    lang: targetLang,
    category: enTopic.category,
    difficulty: enTopic.difficulty,
    title: translated.title,
    question: translated.question,
    answer: translated.answer,
    objections: translated.objections ?? enTopic.objections,
    church_fathers: translated.churchFathers ?? enTopic.church_fathers,
    scripture: enTopic.scripture,
    catechism: enTopic.catechism,
    tags: enTopic.tags,
    related_topics: enTopic.related_topics,
    last_updated: enTopic.last_updated,
    translation_source: 'machine',
    translation_notes: enTopic.translation_notes,
  }

  const { error } = await supabase.from('topics').upsert(row, { onConflict: 'id,lang' })
  if (error) throw new Error(`Upsert failed for ${enTopic.id}/${targetLang}: ${error.message}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌐  Codex Defensoris — Batch Translation`)
  console.log(`    Provider: claude  |  Langs: ${targetLangs.join(', ')}  |  Dry run: ${dryRun}  |  Force: ${force}`)
  if (targetIdArg) console.log(`    Topic filter: ${targetIdArg}`)
  console.log()

  const [config, enTopics] = await Promise.all([loadTranslationConfig(), fetchEnTopics()])
  console.log(`✓  Loaded ${enTopics.length} EN topic(s)`)

  const existingKeys = await fetchExistingRows(enTopics.map((t) => t.id))

  let translated = 0, skipped = 0, errors = 0

  for (const topic of enTopics) {
    for (const lang of targetLangs) {
      const existingManual  = existingKeys.has(`${topic.id}:${lang}:manual`)
      const existingMachine = existingKeys.has(`${topic.id}:${lang}:machine`)

      if (existingManual) { console.log(`  ⏭  ${topic.id}/${lang} — manual, skipping`); skipped++; continue }
      if (existingMachine && !force) { console.log(`  ⏭  ${topic.id}/${lang} — already machine-translated (use --force to redo)`); skipped++; continue }

      process.stdout.write(`  🔄  ${topic.id}/${lang} — translating…`)

      if (dryRun) { console.log(' [dry-run]'); translated++; continue }

      try {
        const result = await translateWithClaude(topic, lang, config.prompt, topic.translation_notes)
        await upsertTranslation(topic, result, lang)
        console.log(' ✓')
        translated++
        // Gentle rate limit — avoid hammering the API
        await new Promise((r) => setTimeout(r, 500))
      } catch (err) {
        console.log(` ✗  ${err.message}`)
        errors++
      }
    }
  }

  console.log(`\n── Summary ─────────────────────────────────────────`)
  console.log(`   Translated : ${translated}`)
  console.log(`   Skipped    : ${skipped}`)
  console.log(`   Errors     : ${errors}`)
  if (dryRun) console.log('\n   (Dry run — no changes written to DB)')
}

main().catch((err) => { console.error('\n❌ ', err.message); process.exit(1) })
