#!/usr/bin/env bun
/**
 * Builds .claude/vectors-theology.db — semantic search index over the theology
 * corpus (CCC, canons, GIRM, church documents, Father quotes) for retrieval-
 * grounded content generation. See documents/VerifyArchitecture/content-generation-architecture-proposal.md
 * Run: bun tools/vector-index-theology.ts
 */
import { Database } from 'bun:sqlite'
import { join } from 'path'
import { createHash } from 'crypto'
import { getSupabaseAdmin, fetchAll } from '../scripts/lib/supabase-admin.mjs'

const ROOT      = join(import.meta.dir, '..')
const DB_PATH   = join(ROOT, '.claude', 'vectors-theology.db')
const EMBED_URL = 'http://localhost:11434/api/embed'
const MODEL     = 'nomic-embed-text'
const BATCH_SIZE = 20

type SourceRow = { sourceTable: string; sourceId: string; referenceLabel: string; content: string }

// English-only: content generation drafts in English first, translation is a
// separate downstream step (pnpm db:translate) — no reason to embed TL/CEB rows.
async function loadCccParagraphs(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<SourceRow[]> {
  const rows = await fetchAll(supabase, 'ccc_paragraphs', 'paragraph,text,summary,lang')
  return rows
    .filter((r: any) => r.lang === 'en' && (r.text || r.summary))
    .map((r: any) => ({
      sourceTable: 'ccc_paragraphs',
      sourceId: `${r.paragraph}:en`,
      referenceLabel: `CCC ${r.paragraph}`,
      content: `CCC ${r.paragraph}\n${r.text ?? r.summary}`,
    }))
}

async function loadCanons(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<SourceRow[]> {
  const rows = await fetchAll(supabase, 'canons', 'canon,text,summary,book,lang')
  return rows
    .filter((r: any) => r.lang === 'en' && (r.text || r.summary))
    .map((r: any) => ({
      sourceTable: 'canons',
      sourceId: `${r.canon}:en`,
      referenceLabel: `Canon ${r.canon}`,
      content: `Canon ${r.canon}${r.book ? ` (${r.book})` : ''}\n${r.text ?? r.summary}`,
    }))
}

async function loadGirmArticles(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<SourceRow[]> {
  const rows = await fetchAll(supabase, 'girm_articles', 'article,text,summary,section,lang')
  return rows
    .filter((r: any) => r.lang === 'en' && (r.text || r.summary))
    .map((r: any) => ({
      sourceTable: 'girm_articles',
      sourceId: `${r.article}:en`,
      referenceLabel: `GIRM ${r.article}`,
      content: `GIRM ${r.article}${r.section ? ` (${r.section})` : ''}\n${r.text ?? r.summary}`,
    }))
}

async function loadChurchDocuments(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<SourceRow[]> {
  const rows = await fetchAll(supabase, 'church_documents', 'id,slug,section_num,section_label,text,summary')
  return rows
    .filter((r: any) => r.text || r.summary)
    .map((r: any) => ({
      sourceTable: 'church_documents',
      sourceId: String(r.id),
      referenceLabel: `${r.slug} §${r.section_num}${r.section_label ? ` (${r.section_label})` : ''}`,
      content: `${r.slug} §${r.section_num} ${r.section_label ?? ''}\n${r.text ?? r.summary}`,
    }))
}

async function loadChurchFatherQuotes(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<SourceRow[]> {
  const rows = await fetchAll(supabase, 'church_father_quotes', 'id,author,quote,source')
  return rows.map((r: any) => ({
    sourceTable: 'church_father_quotes',
    sourceId: String(r.id),
    referenceLabel: `${r.author} — ${r.source}`,
    content: `${r.author}: "${r.quote}" — ${r.source}`,
  }))
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(EMBED_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, input: texts }) })
  return ((await res.json()) as { embeddings: number[][] }).embeddings
}

function toBlob(vec: number[]): Buffer {
  const buf = Buffer.allocUnsafe(vec.length * 4)
  vec.forEach((v, i) => buf.writeFloatLE(v, i * 4))
  return buf
}

const db = new Database(DB_PATH)
db.run(`PRAGMA journal_mode = WAL`)
db.run(`CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_table TEXT NOT NULL, source_id TEXT NOT NULL,
  reference_label TEXT NOT NULL, content TEXT NOT NULL,
  embedding BLOB NOT NULL, row_hash TEXT NOT NULL, indexed_at INTEGER NOT NULL,
  UNIQUE(source_table, source_id)
)`)
db.run(`CREATE INDEX IF NOT EXISTS idx_source ON chunks(source_table)`)

console.log('Building theology vector index...')
const t0 = Date.now()
const supabase = getSupabaseAdmin()

const allRows: SourceRow[] = (
  await Promise.all([
    loadCccParagraphs(supabase),
    loadCanons(supabase),
    loadGirmArticles(supabase),
    loadChurchDocuments(supabase),
    loadChurchFatherQuotes(supabase),
  ])
).flat()
console.log(`  ${allRows.length} source rows fetched`)

const getHash = db.query<{ row_hash: string }, [string, string]>(
  'SELECT row_hash FROM chunks WHERE source_table = ? AND source_id = ?'
)
const toIndex = allRows
  .map((r) => ({ ...r, hash: createHash('sha256').update(r.content).digest('hex') }))
  .filter((r) => getHash.get(r.sourceTable, r.sourceId)?.row_hash !== r.hash)

console.log(`  ${toIndex.length} need indexing · ${allRows.length - toIndex.length} unchanged`)
if (toIndex.length === 0) {
  console.log(`✓ Index up to date (${(db.query<{ n: number }, []>('SELECT COUNT(*) as n FROM chunks').get())!.n} chunks)`)
  process.exit(0)
}

const upsert = db.prepare(`INSERT OR REPLACE INTO chunks
  (source_table,source_id,reference_label,content,embedding,row_hash,indexed_at)
  VALUES (?,?,?,?,?,?,?)`)
const upsertBatch = db.transaction((rows: typeof toIndex, vecs: number[][]) => {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    upsert.run(r.sourceTable, r.sourceId, r.referenceLabel, r.content, toBlob(vecs[i]), r.hash, Date.now())
  }
})

let done = 0
for (let i = 0; i < toIndex.length; i += BATCH_SIZE) {
  const batch = toIndex.slice(i, i + BATCH_SIZE)
  upsertBatch(batch, await embedBatch(batch.map((r) => r.content)))
  done += batch.length
  process.stdout.write(`\r  ${done}/${toIndex.length} chunks embedded`)
}
const total = (db.query<{ n: number }, []>('SELECT COUNT(*) as n FROM chunks').get())!.n
console.log(`\n✓ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${toIndex.length} chunks added · ${total} total`)
