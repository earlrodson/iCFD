import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser } from '@/lib/supabase/auth'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

const LANG_NAMES: Record<string, string> = {
  tl: 'Filipino (Tagalog)',
  ceb: 'Cebuano (Bisaya)',
}

function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SECRET_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await adminSupabase()
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

function answerToString(answer: unknown): string {
  if (typeof answer === 'string') return answer
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    const a = answer as Record<string, unknown>
    if (typeof a.full === 'string') return a.full
    if (typeof a.summary === 'string') return a.summary
  }
  return ''
}

async function translateTopic(
  enTopic: Record<string, unknown>,
  targetLang: string,
  basePrompt: string,
): Promise<Record<string, unknown>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const langName = LANG_NAMES[targetLang] ?? targetLang
  const systemPrompt = basePrompt.replace('{lang}', langName)
  const notes = enTopic.translation_notes
    ? `\n\nTopic-specific translator notes:\n${enTopic.translation_notes}`
    : ''

  const objections = Array.isArray(enTopic.objections) ? enTopic.objections : []
  const churchFathers = Array.isArray(enTopic.church_fathers) ? enTopic.church_fathers : []

  const input = {
    title: enTopic.title,
    question: enTopic.question,
    answer: answerToString(enTopic.answer),
    ...(objections.length ? { objections } : {}),
    ...(churchFathers.length ? { churchFathers } : {}),
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Translate to ${langName}. Return ONLY valid JSON with the same structure. No explanation.${notes}\n\n${JSON.stringify(input, null, 2)}`,
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> }
  const text = data.content.find((b) => b.type === 'text')?.text ?? ''
  const jsonText = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  return JSON.parse(jsonText) as Record<string, unknown>
}

export async function POST(req: NextRequest) {
  // Auth check
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { topicId: string; lang: string }
  const { topicId, lang } = body
  if (!topicId || !lang) return NextResponse.json({ error: 'topicId and lang required' }, { status: 400 })
  if (!['tl', 'ceb'].includes(lang)) return NextResponse.json({ error: 'lang must be tl or ceb' }, { status: 400 })

  const supabase = adminSupabase()

  // Load translation prompt from site_config
  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value')
    .eq('key', 'translation_prompt')
  const basePrompt = configRows?.[0]?.value ??
    'Translate to {lang}. Preserve all CCC numbers, scripture references, and theological terms. Return only valid JSON with the same structure.'

  // Fetch EN source
  const { data: enTopic, error: fetchErr } = await supabase
    .from('topics')
    .select('*')
    .eq('id', topicId)
    .eq('lang', 'en')
    .single()
  if (fetchErr || !enTopic) return NextResponse.json({ error: 'EN topic not found' }, { status: 404 })

  try {
    const translated = await translateTopic(enTopic as Record<string, unknown>, lang, basePrompt)

    const row = {
      id: enTopic.id,
      lang,
      category: enTopic.category,
      difficulty: enTopic.difficulty,
      title: translated.title ?? enTopic.title,
      question: translated.question ?? enTopic.question,
      answer: translated.answer ?? answerToString(enTopic.answer),
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

    const { error: upsertErr } = await supabase
      .from('topics')
      .upsert(row, { onConflict: 'id,lang' })

    if (upsertErr) throw new Error(upsertErr.message)

    return NextResponse.json({ success: true, title: translated.title })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
