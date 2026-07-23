import { notFound } from 'next/navigation'
import { loadTopicFromDatabase } from '@/lib/content/database'
import { QuizClient } from './QuizClient'

interface QuizPageProps {
  params: Promise<{ topicId: string; tier: string }>
}

const VALID_TIERS = ['beginner', 'intermediate', 'advanced']

export default async function QuizPage({ params }: QuizPageProps) {
  const { topicId, tier } = await params
  if (!VALID_TIERS.includes(tier)) notFound()

  const topic = await loadTopicFromDatabase(topicId, 'en').catch(() => null)
  if (!topic) notFound()

  return <QuizClient topicId={topicId} tier={tier} topicTitle={topic.title} />
}
