import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// Kept below Vercel's ~4.5MB serverless function request body limit — above
// that, the platform itself rejects the request with a plain-text 413 before
// this handler (and its own size check) ever runs.
const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const SIGNED_URL_TTL_SECONDS = 60 * 5

// POST /api/profile/cfd-id — replace the signed-in user's own CFD ID card image.
// Stored in a private bucket (personal ID document) — never a public URL.
export async function POST(req: NextRequest) {
  const session = await createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Image must be PNG, JPEG, or WebP' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 4 MB' }, { status: 400 })
  }

  const db = adminSupabase()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage
    .from('cfd-id-cards')
    .upload(storagePath, file, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { error } = await db
    .from('user_settings')
    .upsert({ user_id: user.id, cfd_id_image_path: storagePath })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: signed } = await db.storage
    .from('cfd-id-cards')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  return NextResponse.json({ signed_url: signed?.signedUrl ?? null })
}

// GET /api/profile/cfd-id — a short-lived signed URL for the signed-in user's
// own CFD ID card image (or null if none uploaded yet).
export async function GET() {
  const session = await createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = adminSupabase()
  const { data: row } = await db
    .from('user_settings')
    .select('cfd_id_image_path')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row?.cfd_id_image_path) return NextResponse.json({ signed_url: null })

  const { data: signed, error } = await db.storage
    .from('cfd-id-cards')
    .createSignedUrl(row.cfd_id_image_path, SIGNED_URL_TTL_SECONDS)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ signed_url: signed.signedUrl })
}
