import type { Topic } from '@/data/schema/topic.schema'
import { TopicCard } from '@/components/topic/TopicCard'

interface TopicGridProps {
  topics: Topic[]
  emptyMessage?: string
}

export function TopicGrid({
  topics,
  emptyMessage = 'No topics found.',
}: TopicGridProps) {
  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic) => (
        <TopicCard key={topic.id} topic={topic} />
      ))}
    </div>
  )
}
