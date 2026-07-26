import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGeoFromHeaders, getDeviceType } from '@/lib/analytics/geo'

const MAX_PATH_LEN = 512

// POST /api/analytics/track — logs one pageview. Public (guests included);
// the caller supplies only visitor_id/path, everything else (user, geo,
// device) is resolved server-side so it can't be spoofed from the client.
export async function POST(req: NextRequest) {
  let body: { visitorId?: string; path?: string; referrerPath?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { visitorId, path, referrerPath } = body
  if (typeof visitorId !== 'string' || !visitorId || typeof path !== 'string' || !path) {
    return NextResponse.json({ error: 'visitorId and path are required' }, { status: 400 })
  }

  let userId: string | null = null
  try {
    const sessionClient = await createServerClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // Unauthenticated / no session — treat as guest.
  }

  const { country, region } = getGeoFromHeaders(req.headers)
  const deviceType = getDeviceType(req.headers.get('user-agent'))

  const db = createAdminClient()
  const { data, error } = await db
    .from('page_views')
    .insert({
      visitor_id: visitorId,
      user_id: userId,
      path: path.slice(0, MAX_PATH_LEN),
      referrer_path: typeof referrerPath === 'string' ? referrerPath.slice(0, MAX_PATH_LEN) : null,
      country,
      region,
      device_type: deviceType,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
