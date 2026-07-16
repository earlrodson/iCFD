import { use } from 'react'
import PathEditor from './PathEditor'

export default function PathEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  return <PathEditor slug={slug} />
}
