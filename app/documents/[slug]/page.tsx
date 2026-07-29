import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DocumentClient } from '@/components/documents/DocumentClient'
import { fetchDocMeta, fetchDocSections } from '@/lib/content/documentFetch'
import { parseNumericRanges, formatNumericRanges } from '@/lib/numericRange'

interface DocumentPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ s?: string }>
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

export async function generateMetadata({ params, searchParams }: DocumentPageProps): Promise<Metadata> {
  const { slug } = await params
  const { s } = await searchParams

  const meta = await fetchDocMeta(slug)
  if (!meta) return { title: 'Document Not Found' }

  const ranges = s ? parseNumericRanges(s) : null
  if (!ranges) {
    const title = `${meta.title} — Catholic Faith Defender`
    const description = meta.description ?? meta.subtitle ?? `Read ${meta.title} in full.`
    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { card: 'summary', title, description },
    }
  }

  const label = formatNumericRanges(ranges)
  const first = (await fetchDocSections(slug, ranges[0].start, ranges[0].start))[0]

  const title = `${meta.title} §${label}`
  const description = first?.text ? truncate(first.text, 160) : meta.description ?? meta.subtitle ?? meta.title

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  }
}

export default function DocumentPage() {
  return (
    <Suspense>
      <DocumentClient />
    </Suspense>
  )
}
