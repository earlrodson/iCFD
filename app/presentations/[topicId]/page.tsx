'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Spinner, Presentation } from '@phosphor-icons/react'
import { getUser, onAuthStateChange, type User } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import SlideViewer from '@/components/presentations/SlideViewer'

interface Slide {
  heading: string
  bullets: string[]
}

type Status = 'loading' | 'signed-out' | 'not-member' | 'not-found' | 'ok'

export default function PresentationPage() {
  const params = useParams<{ topicId: string }>()
  const topicId = params.topicId

  // undefined = resolving, null = guest, User = signed in
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [status, setStatus] = useState<Status>('loading')
  const [topicTitle, setTopicTitle] = useState('')
  const [slides, setSlides] = useState<Slide[]>([])

  useEffect(() => {
    getUser().then((u) => setUser(u ?? null))
    return onAuthStateChange((u) => setUser(u ?? null))
  }, [])

  useEffect(() => {
    if (user === undefined) return

    async function load() {
      const supabase = createClient()

      const { data: topic } = await supabase.from('topics').select('title').eq('id', topicId).eq('lang', 'en').maybeSingle()
      setTopicTitle(topic?.title ?? topicId)

      if (!user) { setStatus('signed-out'); return }

      const { data: settings } = await supabase.from('user_settings').select('is_cfd_member').eq('user_id', user.id).maybeSingle()
      if (!settings?.is_cfd_member) { setStatus('not-member'); return }

      // RLS enforces both the membership gate and published:true a second time here.
      const { data: presentation } = await supabase.from('presentations').select('slides').eq('topic_id', topicId).maybeSingle()
      if (!presentation) { setStatus('not-found'); return }

      setSlides(presentation.slides as unknown as Slide[])
      setStatus('ok')
    }
    load()
  }, [user, topicId])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner weight="light" size={28} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === 'signed-out') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock weight="light" size={40} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Sign in to view this presentation.</p>
        <Link href="/account" className="text-xs text-primary hover:underline">Sign in</Link>
      </div>
    )
  }

  if (status === 'not-member') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock weight="light" size={40} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Presentations are available to CFD members only.</p>
        <Link href="/account" className="text-xs text-primary hover:underline">Update your membership</Link>
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <Presentation weight="light" size={40} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No presentation is available for this topic yet.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5 flex items-center gap-2">
        <Presentation weight="light" size={20} className="text-muted-foreground shrink-0" />
        <h1 className="text-lg font-bold text-foreground truncate">{topicTitle}</h1>
      </div>
      <SlideViewer slides={slides} />
    </div>
  )
}
