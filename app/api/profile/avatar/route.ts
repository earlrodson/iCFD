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

// POST /api/profile/avatar — replace the signed-in user's own profile picture
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
    .from('avatars')
    .upload(storagePath, file, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: publicUrlData } = db.storage.from('avatars').getPublicUrl(storagePath)

  const { error } = await db
    .from('user_settings')
    .upsert({ user_id: user.id, avatar_url: publicUrlData.publicUrl })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ avatar_url: publicUrlData.publicUrl })
}
