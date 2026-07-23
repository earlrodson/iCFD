import { notFound } from 'next/navigation'
import { fetchPathBySlug } from '@/lib/content/paths'
import { PathDetailClient } from './PathDetailClient'

interface PathDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function PathDetailPage({ params }: PathDetailPageProps) {
  const { slug } = await params
  const path = await fetchPathBySlug(slug)
  if (!path) notFound()
  return <PathDetailClient path={path} />
}
