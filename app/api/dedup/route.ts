import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser } from '@/lib/supabase/auth'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

interface TopicRow {
  id: string
  title: string
  question: string
  category: string
  answer: string | null
  published: boolean
}

interface DedupGroup {
  confidence: number
  reason: string
  winner: string
  topics: Array<{ id: string; title: string; score: number; notes: string }>
}

interface ClaudeResponse {
  groups: DedupGroup[]
}

async function detectDuplicates(topics: TopicRow[]): Promise<DedupGroup[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const slim = topics.map((t) => ({
    id: t.id,
    title: t.title,
    question: t.question,
    category: t.category,
    answer_preview: typeof t.answer === 'string'
      ? t.answer.slice(0, 200)
      : '',
  }))

  const prompt = `You are auditing a Catholic apologetics app for duplicate topics.

Goal of the app: help Filipino Catholics defend their faith through clear, well-sourced apologetics on doctrine, scripture, tradition, and practice.

Below are all English topics. Find groups of topics that cover the SAME apologetics question or doctrine — even if worded differently or in different categories.

For each duplicate group:
1. Score each topic 0–100 on: title clarity, question sharpness, answer preview quality, and apologetics value
2. Pick the winner (highest score)
3. Give a confidence score (0–100) of how sure you are they are genuine duplicates (not just related)

Only flag genuine duplicates. Related-but-distinct topics (e.g. "Why confess to a priest?" vs "What is the Sacrament of Reconciliation?") are NOT duplicates unless they would produce near-identical articles.

Return ONLY valid JSON, no explanation:
{
  "groups": [
    {
      "confidence": 95,
      "reason": "one sentence explaining why these are duplicates",
      "winner": "topic-id-of-best",
      "topics": [
        { "id": "topic-id", "title": "...", "score": 88, "notes": "one-line quality note" }
      ]
    }
  ]
}

Topics:
${JSON.stringify(slim, null, 2)}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`)

  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  const text = data.content.find((b) => b.type === 'text')?.text ?? ''
  const jsonText = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  const parsed = JSON.parse(jsonText) as ClaudeResponse
  return parsed.groups ?? []
}

export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = adminSupabase()
  const { data: adminRow } = await supabase
    .from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch all EN topics
  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, title, question, category, answer, published')
    .eq('lang', 'en')
    .order('title')

  if (error || !topics) return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })

  let groups: DedupGroup[]
  try {
    groups = await detectDuplicates(topics as TopicRow[])
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Claude error' }, { status: 500 })
  }

  if (groups.length === 0) {
    return NextResponse.json({ groups: [], hidden: 0, message: 'No duplicates found.' })
  }

  // Apply: hide all losers regardless of confidence — confidence just explains certainty
  const hiddenIds: string[] = []
  for (const group of groups) {
    const loserIds = group.topics
      .map((t) => t.id)
      .filter((id) => id !== group.winner)

    if (loserIds.length === 0) continue

    const { error: updateErr } = await supabase
      .from('topics')
      .update({ published: false })
      .in('id', loserIds)
      .eq('lang', 'en')

    if (!updateErr) hiddenIds.push(...loserIds)
  }

  return NextResponse.json({ groups, hidden: hiddenIds.length, hiddenIds })
}
