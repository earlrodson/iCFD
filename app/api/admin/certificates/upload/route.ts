import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { isQuizTier } from '@/lib/content/quizTiers'
import { DEFAULT_NAME_PLACEHOLDER } from '@/lib/content/certificateTemplate'
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

const DEFAULT_PLACEHOLDERS = [DEFAULT_NAME_PLACEHOLDER] as unknown as Json

// Kept below Vercel's ~4.5MB serverless function request body limit — above
// that, the platform itself rejects the request with a plain-text 413 before
// this handler (and its own size check) ever runs.
const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

// POST /api/admin/certificates/upload — replace a (path, tier) certificate background image
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  const pathSlug = formData.get('path_slug')
  const tier = formData.get('tier')

  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (typeof pathSlug !== 'string' || !pathSlug) return NextResponse.json({ error: 'path_slug required' }, { status: 400 })
  if (!isQuizTier(tier)) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Image must be PNG, JPEG, or WebP' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 4 MB' }, { status: 400 })
  }

  const db = adminSupabase()

  const { data: path } = await db.from('paths').select('slug').eq('slug', pathSlug).maybeSingle()
  if (!path) return NextResponse.json({ error: 'Unknown path' }, { status: 400 })

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${pathSlug}/${tier}/${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage
    .from('certificate-templates')
    .upload(storagePath, file, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: publicUrlData } = db.storage.from('certificate-templates').getPublicUrl(storagePath)

  const { data: existing } = await db
    .from('certificate_templates')
    .select('placeholders')
    .eq('path_slug', pathSlug)
    .eq('tier', tier)
    .maybeSingle()

  const { data, error } = await db
    .from('certificate_templates')
    .upsert(
      {
        path_slug: pathSlug,
        tier,
        base_image_url: publicUrlData.publicUrl,
        placeholders: existing?.placeholders ?? DEFAULT_PLACEHOLDERS,
      },
      { onConflict: 'path_slug,tier' },
    )
    .select('base_image_url, placeholders')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
