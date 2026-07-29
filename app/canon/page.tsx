import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CanonClient } from '@/components/canon/CanonClient'
import { fetchCanons } from '@/lib/content/canonFetch'
import { parseNumericRanges, formatNumericRanges } from '@/lib/numericRange'

interface CanonPageProps {
  searchParams: Promise<{ canon?: string }>
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

export async function generateMetadata({ searchParams }: CanonPageProps): Promise<Metadata> {
  const { canon } = await searchParams
  const ranges = canon ? parseNumericRanges(canon) : null

  if (!ranges) {
    const title = 'Code of Canon Law — Catholic Faith Defender'
    const description = 'Browse all 1,752 canons of the 1983 Code of Canon Law, organized by book.'
    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { card: 'summary', title, description },
    }
  }

  const label = formatNumericRanges(ranges)
  const first = (await fetchCanons(ranges[0].start, ranges[0].start))[0]
  const plural = ranges.length > 1 || ranges[0].start !== ranges[0].end

  const title = `Canon ${label} — Code of Canon Law`
  const description = first?.text
    ? truncate(first.text, 160)
    : `Code of Canon Law, canon${plural ? 's' : ''} ${label}.`

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  }
}

export default function CanonPage() {
  return (
    <Suspense>
      <CanonClient />
    </Suspense>
  )
}
