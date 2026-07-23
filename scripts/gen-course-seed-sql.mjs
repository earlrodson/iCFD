#!/usr/bin/env node
/**
 * One-off: converts scripts/output/laymans-biblical-theology-course.json and
 * public/data/content/paths.json's 'basic-apologetics-course' entry into raw
 * SQL, for execution via an authenticated DB connection (e.g. the Supabase
 * MCP execute_sql tool) when the REST API key in .env.local can't write
 * (sb_secret_* not yet accepted; anon JWT is RLS-restricted to read-only).
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function sqlStr(v) {
  if (v === null || v === undefined) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}
function sqlJson(v) {
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
}

const { topics, scripture_verses } = JSON.parse(
  readFileSync(resolve('scripts/output/laymans-biblical-theology-course.json'), 'utf8'),
)
const paths = JSON.parse(readFileSync(resolve('public/data/content/paths.json'), 'utf8')).paths
const course = paths.find((p) => p.slug === 'basic-apologetics-course')

let sql = ''

// ── scripture_verses ─────────────────────────────────────────────────────────
sql += '-- scripture_verses (CEB)\n'
sql += 'INSERT INTO scripture_verses (reference, version, text) VALUES\n'
sql += scripture_verses
  .map((v) => `  (${sqlStr(v.reference)}, ${sqlStr(v.version)}, ${sqlStr(v.text)})`)
  .join(',\n')
sql += '\nON CONFLICT (reference, version) DO NOTHING;\n\n'

// ── topics ───────────────────────────────────────────────────────────────────
// One file per topic — some answer/objections blobs are 30-40KB, too large
// to safely batch multiple topics into a single execute_sql call.
import { mkdirSync as mkdirSync2 } from 'fs'
mkdirSync2(resolve('scripts/output/topics'), { recursive: true })
sql += '-- topics (ceb) — see scripts/output/topics/*.sql, one file per topic\n'
for (const t of topics) {
  const stmt = `INSERT INTO topics (id, lang, category, title, question, answer, objections, scripture, tags, difficulty, related_topics, translation_source, last_updated)
VALUES (${sqlStr(t.id)}, ${sqlStr(t.lang)}, ${sqlStr(t.category)}, ${sqlStr(t.title)}, ${sqlStr(t.question)}, ${sqlJson(t.answer)}, ${sqlJson(t.objections)}, ${sqlJson(t.scripture)}, ${sqlJson(t.tags)}, ${sqlStr(t.difficulty)}, ${sqlJson(t.related_topics)}, 'manual', ${sqlStr(t.last_updated)})
ON CONFLICT (id, lang) DO UPDATE SET
  category = EXCLUDED.category, title = EXCLUDED.title, question = EXCLUDED.question,
  answer = EXCLUDED.answer, objections = EXCLUDED.objections, scripture = EXCLUDED.scripture,
  tags = EXCLUDED.tags, difficulty = EXCLUDED.difficulty, related_topics = EXCLUDED.related_topics,
  translation_source = 'manual', last_updated = EXCLUDED.last_updated;\n`
  writeFileSync(resolve(`scripts/output/topics/${t.id}.sql`), stmt, 'utf8')
  sql += stmt + '\n'
}

// ── paths / path_topics ──────────────────────────────────────────────────────
if (course) {
  sql += '-- paths\n'
  sql += `INSERT INTO paths (slug, title, description, audience, estimated_minutes, difficulty, icon)
VALUES (${sqlStr(course.slug)}, ${sqlStr(course.title)}, ${sqlStr(course.description)}, ${sqlStr(course.audience)}, ${course.estimatedMinutes}, 'beginner', ${sqlStr(course.icon)})
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, audience = EXCLUDED.audience,
  estimated_minutes = EXCLUDED.estimated_minutes, icon = EXCLUDED.icon;\n\n`

  sql += '-- path_topics\n'
  sql += 'INSERT INTO path_topics (path_slug, topic_id, position) VALUES\n'
  sql += course.topicIds
    .map((id, i) => `  (${sqlStr(course.slug)}, ${sqlStr(id)}, ${i})`)
    .join(',\n')
  sql += `\nON CONFLICT (path_slug, topic_id) DO UPDATE SET position = EXCLUDED.position;\n`
}

const outPath = resolve('scripts/output/course-seed.sql')
writeFileSync(outPath, sql, 'utf8')
console.log(`Wrote ${outPath} (${(sql.length / 1024).toFixed(0)} KB)`)

// Also split into per-section files — easier to execute in separate
// (smaller) statements against an MCP/SQL-editor connection.
const sections = sql.split(/(?=^-- )/m).filter(Boolean)
for (const section of sections) {
  const name = section.match(/^-- (\S+)/)?.[1] ?? 'section'
  writeFileSync(resolve(`scripts/output/course-seed.${name}.sql`), section, 'utf8')
}
console.log(`Split into: ${sections.map((s) => s.match(/^-- (\S+)/)?.[1]).join(', ')}`)
