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
  if (data?.role !== 'admin' && data?.role !== 'superadmin') return null
  return user
}

// PATCH /api/admin/users — set is_cfd_member and/or chapter_id for a given user
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { user_id, is_cfd_member, chapter_id } = body as {
    user_id?: string
    is_cfd_member?: boolean
    chapter_id?: string | null
  }
  if (!user_id?.trim()) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  if (is_cfd_member === undefined && chapter_id === undefined) {
    return NextResponse.json({ error: 'is_cfd_member or chapter_id is required' }, { status: 400 })
  }
  if (is_cfd_member !== undefined && typeof is_cfd_member !== 'boolean') {
    return NextResponse.json({ error: 'is_cfd_member must be a boolean' }, { status: 400 })
  }
  if (chapter_id !== undefined && chapter_id !== null && typeof chapter_id !== 'string') {
    return NextResponse.json({ error: 'chapter_id must be a string or null' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('user_settings').upsert(
    {
      user_id,
      ...(is_cfd_member !== undefined ? { is_cfd_member } : {}),
      ...(chapter_id !== undefined ? { chapter_id } : {}),
    },
    { onConflict: 'user_id' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

const GRANTABLE_ROLES = ['admin', 'editor', 'presenter'] as const
type GrantableRole = (typeof GRANTABLE_ROLES)[number]

function isGrantableRole(role: unknown): role is GrantableRole {
  return typeof role === 'string' && (GRANTABLE_ROLES as readonly string[]).includes(role)
}

// admins table has no client-writable RLS policy by design (see
// docs/specifications/admin-role-grant-rls-missing.md) — every role
// grant/edit/revoke has to go through this service-role route instead of
// the browser client, the same reasoning as the PATCH handler above.
// `superadmin` is deliberately excluded from GRANTABLE_ROLES so it can only
// ever be created by a direct migration, never through this endpoint.

// POST /api/admin/users — grant a role to a user who doesn't have one yet
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { user_id, email, role } = body as { user_id?: string; email?: string; role?: string }
  if (!user_id?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'user_id and email are required' }, { status: 400 })
  }
  if (!isGrantableRole(role)) {
    return NextResponse.json({ error: 'role must be admin, editor, or presenter' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('admins').insert({
    user_id,
    email,
    role,
    granted_by: admin.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PUT /api/admin/users — change an existing admin's role
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { user_id, role } = body as { user_id?: string; role?: string }
  if (!user_id?.trim()) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  if (!isGrantableRole(role)) {
    return NextResponse.json({ error: 'role must be admin, editor, or presenter' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('admins').update({ role }).eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/users — revoke a user's admin access
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { user_id } = body as { user_id?: string }
  if (!user_id?.trim()) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  if (user_id === admin.id) {
    return NextResponse.json({ error: "You can't remove your own access." }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('admins').delete().eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
