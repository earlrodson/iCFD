import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { isQuizTier } from '@/lib/content/quizTiers'
import { DEFAULT_BASE_IMAGE_URL, type CertificatePlaceholder } from '@/lib/content/certificateTemplate'
import type { Json } from '@/lib/supabase/database.types'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function verifyAdmin(): Promise<boolean> {
  const session = await createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return false
  const { data } = await adminSupabase().from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return !!data
}

function isPlaceholderArray(value: unknown): value is CertificatePlaceholder[] {
  return Array.isArray(value) && value.every((p) => p && typeof p === 'object' && typeof p.field === 'string' && typeof p.x === 'number' && typeof p.y === 'number')
}

// PATCH /api/admin/certificates/placeholders — save dragged field positions for a (path, tier) template
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const pathSlug = body?.path_slug
  const tier = body?.tier
  const placeholders = body?.placeholders

  if (typeof pathSlug !== 'string' || !pathSlug) return NextResponse.json({ error: 'path_slug required' }, { status: 400 })
  if (!isQuizTier(tier)) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  if (!isPlaceholderArray(placeholders)) return NextResponse.json({ error: 'placeholders must be an array of {field, x, y}' }, { status: 400 })

  const db = adminSupabase()

  const { data: path } = await db.from('paths').select('slug').eq('slug', pathSlug).maybeSingle()
  if (!path) return NextResponse.json({ error: 'Unknown path' }, { status: 400 })

  const { data: existing } = await db
    .from('certificate_templates')
    .select('base_image_url')
    .eq('path_slug', pathSlug)
    .eq('tier', tier)
    .maybeSingle()

  const { data, error } = await db
    .from('certificate_templates')
    .upsert(
      {
        path_slug: pathSlug,
        tier,
        base_image_url: existing?.base_image_url ?? DEFAULT_BASE_IMAGE_URL,
        placeholders: placeholders as unknown as Json,
      },
      { onConflict: 'path_slug,tier' },
    )
    .select('base_image_url, placeholders')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
