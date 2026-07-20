'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { TopicContent } from '@/components/topic/TopicContent'
import type { Topic } from '@/data/schema/topic.schema'

interface TopicPageProps {
  params: Promise<{ topic: string }>
}

export default function TopicPage({ params }: TopicPageProps) {
  const { topic: topicId } = use(params)
  const router = useRouter()
  const { availableTopics, initialize, loading: storeLoading } = useAppStore()
  const [topic, setTopic]   = useState<Topic | null>(null)
  const [ready, setReady]   = useState(false)

  useEffect(() => {
    async function load() {
      let topics = useAppStore.getState().availableTopics
      if (topics.length === 0) {
        await initialize()
        topics = useAppStore.getState().availableTopics
      }
      const found = topics.find((t) => t.id === topicId)
      setTopic(found ?? null)
      setReady(true)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId])

  if (!ready || storeLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={32} weight="light" className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">Topic not found.</p>
        <button onClick={() => router.back()} className="text-xs text-primary hover:underline">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopicContent topic={topic} />
    </div>
  )
}
