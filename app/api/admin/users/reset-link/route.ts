import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Same admin gate as app/api/admin/users/route.ts.
async function requireAdmin() {
  const client = await createServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client.from('admins').select('role').eq('user_id', user.id).maybeSingle()
  if (data?.role !== 'admin' && data?.role !== 'superadmin') return null
  return user
}

// POST /api/admin/users/reset-link — generate a password-recovery link for
// an admin to copy and hand-deliver, instead of Supabase emailing it.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email } = body as { email?: string }
  if (!email?.trim()) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${req.nextUrl.origin}/reset-password` },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data.properties.action_link })
}
