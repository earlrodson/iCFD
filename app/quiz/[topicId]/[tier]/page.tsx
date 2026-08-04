import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { LanguageSchema } from '@/data/schema/topic.schema'
import { loadTopicFromDatabase } from '@/lib/content/database'
import { QuizClient } from './QuizClient'

interface QuizPageProps {
  params: Promise<{ topicId: string; tier: string }>
}

const VALID_TIERS = ['beginner', 'intermediate', 'advanced']

async function getPreferredLanguage() {
  const stored = (await cookies()).get('lang')?.value
  const parsed = LanguageSchema.safeParse(stored)
  return parsed.success ? parsed.data : 'en'
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { topicId, tier } = await params
  if (!VALID_TIERS.includes(tier)) notFound()

  const lang = await getPreferredLanguage()
  const topic = await loadTopicFromDatabase(topicId, lang).catch(() => null)
  if (!topic) notFound()

  return <QuizClient topicId={topicId} tier={tier} topicTitle={topic.title} lang={lang} />
}
