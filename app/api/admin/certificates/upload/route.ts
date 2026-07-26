import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { isQuizTier } from '@/lib/content/quizTiers'
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

const DEFAULT_PLACEHOLDERS: Json = [
  { field: 'name', x: 50, y: 58, font_size: 34, font_family: 'Georgia, serif', color: '#1a1a1a', align: 'center' },
] as unknown as Json

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

// POST /api/admin/certificates/upload — replace a tier's certificate background image
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  const tier = formData.get('tier')

  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (!isQuizTier(tier)) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Image must be PNG, JPEG, or WebP' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 })
  }

  const db = adminSupabase()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${tier}/${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage
    .from('certificate-templates')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: publicUrlData } = db.storage.from('certificate-templates').getPublicUrl(path)

  const { data: existing } = await db
    .from('certificate_templates')
    .select('placeholders')
    .eq('tier', tier)
    .maybeSingle()

  const { data, error } = await db
    .from('certificate_templates')
    .upsert(
      {
        tier,
        base_image_url: publicUrlData.publicUrl,
        placeholders: existing?.placeholders ?? DEFAULT_PLACEHOLDERS,
      },
      { onConflict: 'tier' },
    )
    .select('base_image_url, placeholders')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
