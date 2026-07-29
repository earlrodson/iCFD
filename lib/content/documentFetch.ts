import { cachedLibraryFetch } from '@/lib/libraryCache'

export interface DocMeta {
  slug: string
  title: string
  subtitle: string | null
  author: string | null
  year: number | null
  description: string | null
  free_access: boolean
  sort_order: number
}

export interface DocSection {
  section_num: number
  section_label: string | null
  text: string | null
  summary: string | null
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const DOCUMENT_BATCH = 50

export async function fetchDocMeta(slug: string): Promise<DocMeta | null> {
  try {
    const res = await cachedLibraryFetch(
      `${SUPABASE_URL}/rest/v1/church_document_meta?slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    )
    if (!res.ok) return null
    const rows: DocMeta[] = await res.json()
    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function fetchDocSections(slug: string, from: number, to: number): Promise<DocSection[]> {
  try {
    const params = new URLSearchParams({
      slug: `eq.${slug}`,
      section_num: `gte.${from}`,
      and: `(section_num.lte.${to})`,
      order: 'section_num.asc',
      select: 'section_num,section_label,text,summary',
      limit: String(DOCUMENT_BATCH),
    })
    const res = await cachedLibraryFetch(
      `${SUPABASE_URL}/rest/v1/church_documents?${params}`,
      { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function countDocSections(slug: string): Promise<number> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/church_documents?slug=eq.${encodeURIComponent(slug)}&select=section_num`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'count=exact',
          Range: '0-0',
        },
      },
    )
    const cr = res.headers.get('content-range')
    if (cr) {
      const total = parseInt(cr.split('/')[1] ?? '0', 10)
      if (!isNaN(total)) return total
    }
    return 0
  } catch {
    return 0
  }
}
