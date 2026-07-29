import { cachedLibraryFetch } from '@/lib/libraryCache'

export interface Canon {
  canon: number
  text: string
  summary: string
  book: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function fetchCanons(from: number, to: number): Promise<Canon[]> {
  try {
    const params = new URLSearchParams({
      canon: `gte.${from}`,
      and: `(canon.lte.${to})`,
      lang: 'eq.en',
      text: 'not.is.null',
      order: 'canon.asc',
      select: 'canon,text,summary,book',
      limit: '600',
    })
    const res = await cachedLibraryFetch(
      `${SUPABASE_URL}/rest/v1/canons?${params}`,
      { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}
