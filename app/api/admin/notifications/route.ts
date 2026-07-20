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

async function verifyAdmin(): Promise<boolean> {
  const user = await getUser()
  if (!user) return false
  const supabase = adminSupabase()
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return !!data
}

// GET — subscriber count + today's topic preview
export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = adminSupabase()

  const [{ count }, topicsResult] = await Promise.all([
    supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }),
    supabase
      .from('topics')
      .select('id, title, question, is_recommended')
      .eq('lang', 'en')
      .eq('published', true)
      .order('created_at'),
  ])

  const topics = topicsResult.data ?? []
  const recommended = topics.filter((t) => t.is_recommended)
  const pool = recommended.length >= 5 ? recommended : topics

  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const todayTopic = pool.length > 0 ? pool[dayOfYear % pool.length] : null

  return NextResponse.json({
    subscribers: count ?? 0,
    todayTopic,
    pool: pool.length,
    usingRecommended: recommended.length >= 5,
  })
}

// POST — trigger the edge function immediately
export async function POST() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SECRET_KEY!

  const res = await fetch(`${supabaseUrl}/functions/v1/send-daily-notification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json() as unknown
  if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
  return NextResponse.json(data)
}
