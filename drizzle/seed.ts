/**
 * Seed script: reads all JSON content files and inserts into Supabase via Drizzle.
 * Run with: pnpm db:seed
 *
 * Requires DATABASE_URL in environment (direct connection, not pooler).
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { topics, paths, pathTopics } from './schema'
import type { TopicInsert, PathInsert, PathTopicRow } from './schema'

const LANGUAGES = ['en', 'tl', 'ceb'] as const

function readJson<T>(relPath: string): T {
  const abs = join(process.cwd(), relPath)
  return JSON.parse(readFileSync(abs, 'utf-8')) as T
}

async function seed() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set in environment')

  // prepare: false required for Supabase transaction-mode pooler (pgBouncer)
  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client)

  // ── Topics ───────────────────────────────────────────────────────────────────

  console.log('\n📖  Seeding topics…')
  let topicCount = 0

  for (const lang of LANGUAGES) {
    const filePath = `public/data/content/${lang}/handbook.json`
    let data: { topics: Record<string, unknown>[] }
    try {
      data = readJson(filePath)
    } catch {
      console.warn(`  ⚠  No handbook.json found for lang=${lang}, skipping.`)
      continue
    }

    const rows: TopicInsert[] = data.topics.map((t) => ({
      id: t.id as string,
      lang,
      category: t.category as string,
      title: t.title as string,
      question: t.question as string,
      answer: t.answer as object,
      citations: (t.citations ?? []) as object[],
      scripture: (t.scripture ?? []) as object[],
      catechism: (t.catechism ?? []) as object[],
      church_fathers: (t.churchFathers ?? []) as object[],
      tags: (t.tags ?? []) as string[],
      difficulty: t.difficulty as string,
      related_topics: (t.relatedTopics ?? []) as string[],
      last_updated: new Date(t.lastUpdated as string),
      last_reviewed: null,
    }))

    await db
      .insert(topics)
      .values(rows)
      .onConflictDoUpdate({
        target: [topics.id, topics.lang],
        set: {
          title: topics.title,
          question: topics.question,
          answer: topics.answer,
          citations: topics.citations,
          scripture: topics.scripture,
          catechism: topics.catechism,
          church_fathers: topics.church_fathers,
          tags: topics.tags,
          difficulty: topics.difficulty,
          category: topics.category,
          related_topics: topics.related_topics,
          last_updated: topics.last_updated,
        },
      })

    console.log(`  ✓  ${lang}: ${rows.length} topics`)
    topicCount += rows.length
  }

  console.log(`  → ${topicCount} topic rows upserted`)

  // ── Paths ─────────────────────────────────────────────────────────────────────

  console.log('\n🗺️   Seeding paths…')
  const pathsData = readJson<Array<{
    slug: string
    title: string
    description: string
    audience: string
    estimatedMinutes: number
    difficulty: string
    icon: string
    topics: string[]
  }>>('public/data/paths.json')

  const pathRows: PathInsert[] = pathsData.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    audience: p.audience,
    estimated_minutes: p.estimatedMinutes,
    difficulty: p.difficulty,
    icon: p.icon,
  }))

  await db
    .insert(paths)
    .values(pathRows)
    .onConflictDoUpdate({
      target: paths.slug,
      set: {
        title: paths.title,
        description: paths.description,
        audience: paths.audience,
        estimated_minutes: paths.estimated_minutes,
        difficulty: paths.difficulty,
        icon: paths.icon,
      },
    })

  console.log(`  ✓  ${pathRows.length} paths upserted`)

  // ── Path topics ───────────────────────────────────────────────────────────────

  console.log('\n🔗  Seeding path_topics…')
  const pathTopicRows: Omit<PathTopicRow, never>[] = []

  for (const p of pathsData) {
    p.topics.forEach((topicId, idx) => {
      pathTopicRows.push({
        path_slug: p.slug,
        topic_id: topicId,
        position: idx,
      })
    })
  }

  // Delete and re-insert for clean ordering
  for (const p of pathsData) {
    await db
      .insert(pathTopics)
      .values(pathTopicRows.filter((r) => r.path_slug === p.slug))
      .onConflictDoUpdate({
        target: [pathTopics.path_slug, pathTopics.topic_id],
        set: { position: pathTopics.position },
      })
  }

  console.log(`  ✓  ${pathTopicRows.length} path_topic rows upserted`)

  // ── Done ───────────────────────────────────────────────────────────────────────

  console.log('\n✅  Seed complete.\n')
  await client.end()
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
