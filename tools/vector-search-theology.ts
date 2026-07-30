#!/usr/bin/env bun
/**
 * Semantic search over the theology corpus index (CCC, canons, GIRM, church
 * documents, Father quotes) — Phase 0 retrieval for content generation.
 * Usage: bun tools/vector-search-theology.ts "<query>" [--top N] [--json]
 */
import { Database } from 'bun:sqlite'
import { join } from 'path'
import { existsSync } from 'fs'

const ROOT    = join(import.meta.dir, '..')
const DB_PATH = join(ROOT, '.claude', 'vectors-theology.db')
const args    = process.argv.slice(2)
const jsonOut = args.includes('--json')
const topIdx  = args.indexOf('--top')
const TOP_K   = topIdx >= 0 ? parseInt(args[topIdx + 1] ?? '8') : 8
const skip    = new Set(topIdx >= 0 ? [topIdx, topIdx + 1] : [])
const query   = args.filter((a, i) => !skip.has(i) && !a.startsWith('--')).join(' ').trim()

if (!query) { console.error('Usage: bun tools/vector-search-theology.ts "<query>" [--top N] [--json]'); process.exit(1) }
if (!existsSync(DB_PATH)) { console.error('Index not built. Run: bun tools/vector-index-theology.ts'); process.exit(1) }

const embedRes = await fetch('http://localhost:11434/api/embed', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'nomic-embed-text', input: [query] }),
})
const queryVec = ((await embedRes.json()) as { embeddings: number[][] }).embeddings[0]

const db = new Database(DB_PATH, { readonly: true })
type Row = { source_table: string; source_id: string; reference_label: string; content: string; embedding: Uint8Array }
const rows = db.query<Row, []>('SELECT source_table,source_id,reference_label,content,embedding FROM chunks').all()

function cosine(a: number[], b: Uint8Array): number {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    const bv = view.getFloat32(i * 4, true)
    dot += a[i] * bv; na += a[i] * a[i]; nb += bv * bv
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

const scored = rows
  .map((r) => ({ ...r, score: cosine(queryVec, r.embedding) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, TOP_K)

if (jsonOut) {
  console.log(JSON.stringify(scored.map((r) => ({
    source_table: r.source_table,
    reference_label: r.reference_label,
    score: parseFloat(r.score.toFixed(4)),
    content: r.content,
  })), null, 2))
} else {
  console.log(`\nQuery: "${query}"  |  top ${scored.length} results\n`)
  for (const r of scored) {
    console.log(`[${r.source_table}] ${r.reference_label}  [${r.score.toFixed(3)}] ${'█'.repeat(Math.round(r.score * 20))}`)
    console.log(r.content.split('\n').slice(0, 6).join('\n'))
    console.log('…\n')
  }
}
