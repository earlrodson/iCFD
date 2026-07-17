import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// catechism.cc returns { paragraph: n, text: "...", ... }
const CCC_API = 'https://catechism.cc/api/paragraphs'

function getSection(n: number): string {
  if (n <= 1065) return 'Part One: The Profession of Faith'
  if (n <= 1690) return 'Part Two: The Celebration of the Christian Mystery'
  if (n <= 2557) return 'Part Three: Life in Christ'
  return 'Part Four: Christian Prayer'
}

function makeSummary(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/)
  let summary = sentences[0]
  if (summary.length < 80 && sentences.length > 1) summary += ' ' + sentences[1]
  return summary.slice(0, 220).trim()
}

Deno.serve(async (req: Request) => {
  // Called by Postgres trigger via pg_net, payload: { paragraphs: number[] }
  let body: { paragraphs?: number[] }
  try {
    body = await req.json()
  } catch {
    return new Response('invalid json', { status: 400 })
  }

  const requested: number[] = body.paragraphs ?? []
  if (requested.length === 0) {
    return new Response(JSON.stringify({ seeded: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Find which of the requested paragraphs are already in the table
  const { data: existing } = await supabase
    .from('ccc_paragraphs')
    .select('paragraph')
    .in('paragraph', requested)
    .not('text', 'is', null)

  const existingSet = new Set((existing ?? []).map((r: { paragraph: number }) => r.paragraph))
  const missing = requested.filter((n) => !existingSet.has(n))

  if (missing.length === 0) {
    return new Response(JSON.stringify({ seeded: 0, message: 'all present' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch each missing paragraph from catechism.cc
  const rows: { paragraph: number; text: string; summary: string; section: string }[] = []

  await Promise.all(
    missing.map(async (n) => {
      try {
        const res = await fetch(`${CCC_API}/${n}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) return
        const data = await res.json()
        const text: string = data?.text ?? data?.content ?? ''
        if (!text || text.length < 10) return
        rows.push({
          paragraph: n,
          text,
          summary: makeSummary(text),
          section: getSection(n),
        })
      } catch {
        // Skip paragraphs that fail — non-fatal
      }
    })
  )

  if (rows.length === 0) {
    return new Response(
      JSON.stringify({ seeded: 0, missing, message: 'API returned no usable text' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { error } = await supabase
    .from('ccc_paragraphs')
    .upsert(rows, { onConflict: 'paragraph' })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(
    JSON.stringify({ seeded: rows.length, paragraphs: rows.map((r) => r.paragraph) }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
