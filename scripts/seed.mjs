/**
 * Seed script — uses Supabase admin client (SUPABASE_SECRET_KEY).
 * Upserts topics, paths, path_topics, and site_config into the live DB.
 *
 * Run with: node scripts/seed.mjs
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
  process.env[key] = val
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SECRET_KEY   = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SECRET_KEY || SECRET_KEY.startsWith('your-')) {
  console.error('❌  SUPABASE_SECRET_KEY not set in .env.local')
  process.exit(1)
}

// Admin client — bypasses RLS via secret key
const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function readJson(relPath) {
  return JSON.parse(readFileSync(resolve(process.cwd(), relPath), 'utf8'))
}

// ── Migration check: site_config ──────────────────────────────────────────────

async function ensureSiteConfig() {
  console.log('\n── site_config migration ────────────────')
  const { error } = await supabase.from('site_config').select('key').limit(1)

  if (error?.code === 'PGRST205') {
    console.log('⚠  Table not found — run migration manually in Supabase SQL Editor:')
    console.log('   Supabase Dashboard → SQL Editor → paste drizzle/migrations/003_site_config.sql')
    return false
  }

  const rows = [
    { key: 'appName',      value: 'Codex Defensoris', description: 'Full product name' },
    { key: 'appShortName', value: 'iCFD',             description: 'Home screen label (max 12 chars)' },
    { key: 'appId',        value: 'codex-defensoris', description: 'URL-safe identifier' },
    { key: 'description',  value: 'Offline-first Catholic apologetics app', description: 'PWA install prompt' },
    { key: 'version',      value: '3.0.0',            description: 'Current app version' },
  ]

  const { error: upsertErr } = await supabase
    .from('site_config')
    .upsert(rows, { onConflict: 'key' })

  if (upsertErr) {
    console.error('✗ site_config upsert failed:', upsertErr.message)
    return false
  }

  console.log(`✓  ${rows.length} config rows upserted`)
  return true
}

// ── Topics ────────────────────────────────────────────────────────────────────

async function seedTopics() {
  console.log('\n── topics ───────────────────────────────')
  const LANGS = ['en', 'tl', 'ceb']
  let total = 0

  for (const lang of LANGS) {
    let handbook
    try {
      handbook = readJson(`public/data/content/${lang}/handbook.json`)
    } catch {
      console.warn(`  ⚠  No handbook.json for lang=${lang}, skipping`)
      continue
    }

    const rows = handbook.topics.map((t) => ({
      id:             t.id,
      lang,
      category:       t.category,
      title:          t.title,
      question:       t.question,
      answer:         t.answer,
      citations:      t.citations      ?? [],
      scripture:      t.scripture      ?? [],
      catechism:      t.catechism      ?? [],
      church_fathers: t.churchFathers  ?? [],
      tags:           t.tags           ?? [],
      difficulty:     t.difficulty,
      related_topics: t.relatedTopics  ?? [],
      last_updated:   t.lastUpdated,
    }))

    const { error } = await supabase
      .from('topics')
      .upsert(rows, { onConflict: 'id,lang' })

    if (error) {
      console.error(`  ✗ ${lang}: ${error.message}`)
    } else {
      console.log(`  ✓ ${lang}: ${rows.length} topics upserted`)
      total += rows.length
    }
  }

  console.log(`  → ${total} total topic rows`)
}

// ── Paths ─────────────────────────────────────────────────────────────────────

async function seedPaths() {
  console.log('\n── paths ────────────────────────────────')
  const { paths } = readJson('public/data/content/paths.json')

  const pathRows = paths.map((p) => ({
    slug:              p.slug,
    title:             p.title,
    description:       p.description,
    audience:          p.audience ?? '',
    estimated_minutes: p.estimatedMinutes ?? 0,
    difficulty:        p.difficulty ?? 'beginner',
    icon:              p.icon,
  }))

  const { error } = await supabase
    .from('paths')
    .upsert(pathRows, { onConflict: 'slug' })

  if (error) {
    console.error('  ✗ paths:', error.message)
    return
  }
  console.log(`  ✓ ${pathRows.length} paths upserted`)

  // path_topics
  const ptRows = paths.flatMap((p) =>
    p.topicIds.map((topicId, idx) => ({
      path_slug: p.slug,
      topic_id:  topicId,
      position:  idx,
    }))
  )

  const { error: ptErr } = await supabase
    .from('path_topics')
    .upsert(ptRows, { onConflict: 'path_slug,topic_id' })

  if (ptErr) {
    console.error('  ✗ path_topics:', ptErr.message)
  } else {
    console.log(`  ✓ ${ptRows.length} path_topic rows upserted`)
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log('🌱  Codex Defensoris — DB seed')
console.log(`    ${SUPABASE_URL}`)

await ensureSiteConfig()
await seedTopics()
await seedPaths()

console.log('\n✅  Done\n')
