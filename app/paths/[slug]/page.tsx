import { Suspense } from 'react'
import PathDetailClient from './PathDetailClient'

export function generateStaticParams() {
  return ['new-catholic', 'defend-the-faith', 'marian-apologetics'].map(slug => ({ slug }))
}

export default function PathDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>}>
      <PathDetailClient params={params} />
    </Suspense>
  )
}
