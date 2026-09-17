import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isQuizTier } from '@/lib/content/quizTiers'

async function requireAdmin() {
  const client = await createServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return false
  const { data } = await client.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return !!data
}

// PATCH /api/admin/quiz-settings — update a tier's time limit.
// quiz_settings' other columns (item_count, bank_size, pass_percent) are
// seeded by migration and not yet admin-editable — out of scope here.
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { tier, time_limit_minutes } = body as { tier?: string; time_limit_minutes?: number }
  if (!isQuizTier(tier)) return NextResponse.json({ error: 'A valid tier is required' }, { status: 400 })
  if (typeof time_limit_minutes !== 'number' || !Number.isInteger(time_limit_minutes) || time_limit_minutes < 1 || time_limit_minutes > 180) {
    return NextResponse.json({ error: 'time_limit_minutes must be an integer between 1 and 180' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('quiz_settings').update({ time_limit_minutes, updated_at: new Date().toISOString() }).eq('tier', tier)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
