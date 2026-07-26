import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// A tab left open in the background shouldn't inflate "time on page" —
// anything longer than this is almost certainly an idle/backgrounded tab.
const MAX_DURATION_MS = 24 * 60 * 60 * 1000

// POST /api/analytics/duration — reports time-on-page for a pageview logged
// by /api/analytics/track, sent via navigator.sendBeacon on navigation/unload.
export async function POST(req: NextRequest) {
  let body: { id?: number; durationMs?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { id, durationMs } = body
  if (typeof id !== 'number' || !Number.isFinite(id) || typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) {
    return NextResponse.json({ error: 'id and durationMs are required' }, { status: 400 })
  }

  const clamped = Math.min(durationMs, MAX_DURATION_MS)
  const db = createAdminClient()
  const { error } = await db
    .from('page_views')
    .update({ duration_ms: Math.round(clamped) })
    .eq('id', id)
    .is('duration_ms', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
