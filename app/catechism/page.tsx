import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CatechismClient } from '@/components/catechism/CatechismClient'
import { fetchParagraphs } from '@/lib/content/catechismFetch'
import { parseNumericRanges, formatNumericRanges } from '@/lib/numericRange'

interface CatechismPageProps {
  searchParams: Promise<{ p?: string }>
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

export async function generateMetadata({ searchParams }: CatechismPageProps): Promise<Metadata> {
  const { p } = await searchParams
  const ranges = p ? parseNumericRanges(p) : null

  if (!ranges) {
    const title = 'Catechism of the Catholic Church — Catholic Faith Defender'
    const description = 'Browse all 2,865 paragraphs of the Catechism of the Catholic Church, organized by part.'
    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { card: 'summary', title, description },
    }
  }

  const label = formatNumericRanges(ranges)
  const first = (await fetchParagraphs(ranges[0].start, ranges[0].start))[0]
  const plural = ranges.length > 1 || ranges[0].start !== ranges[0].end

  const title = `CCC ${label} — Catechism of the Catholic Church`
  const description = first?.text
    ? truncate(first.text, 160)
    : `Catechism of the Catholic Church, paragraph${plural ? 's' : ''} ${label}.`

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  }
}

export default function CatechismPage() {
  return (
    <Suspense>
      <CatechismClient />
    </Suspense>
  )
}
