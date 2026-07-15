import { use } from 'react'
import { TopicEditor } from './TopicEditor'

export default function TopicEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { id } = use(params)
  const { lang } = use(searchParams)
  return <TopicEditor topicId={id} lang={lang ?? 'en'} />
}
