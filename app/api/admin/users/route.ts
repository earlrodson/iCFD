import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// user_settings RLS only allows a user to read/write their own row, so
// toggling another user's is_cfd_member has to go through the service-role
// client — same reasoning as lib/supabase/admin.ts's other documented uses.
async function requireAdmin() {
  const client = await createServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client.from('admins').select('role').eq('user_id', user.id).maybeSingle()
  if (data?.role !== 'admin') return null
  return user
}

// PATCH /api/admin/users — set is_cfd_member for a given user
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { user_id, is_cfd_member } = body as { user_id?: string; is_cfd_member?: boolean }
  if (!user_id?.trim()) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  if (typeof is_cfd_member !== 'boolean') {
    return NextResponse.json({ error: 'is_cfd_member must be a boolean' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('user_settings').upsert(
    { user_id, is_cfd_member },
    { onConflict: 'user_id' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
