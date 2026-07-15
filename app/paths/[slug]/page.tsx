import { notFound } from 'next/navigation'
import pathsData from '@/public/data/content/paths.json'
import { PathDetailClient } from './PathDetailClient'

interface LearningPath {
  slug: string
  title: string
  description: string
  icon: string
  topicIds: string[]
}

interface PathDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return (pathsData.paths as LearningPath[]).map((p) => ({ slug: p.slug }))
}

export default async function PathDetailPage({ params }: PathDetailPageProps) {
  const { slug } = await params
  const path = (pathsData.paths as LearningPath[]).find((p) => p.slug === slug)
  if (!path) notFound()
  return <PathDetailClient path={path} />
}
