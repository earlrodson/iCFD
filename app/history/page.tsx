'use client'

import { useEffect, useState } from 'react'
import { MapPin, Users, Buildings, BookOpen, Broadcast, Spinner } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

interface TimelineEntry {
  id: number
  year: string
  title: string
  body: string
  icon: string
}

interface President {
  id: number
  name: string
  years: string
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'map-pin': <MapPin weight="light" size={18} />,
  users: <Users weight="light" size={18} />,
  buildings: <Buildings weight="light" size={18} />,
  'book-open': <BookOpen weight="light" size={18} />,
  broadcast: <Broadcast weight="light" size={18} />,
}

export default function HistoryPage() {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [presidents, setPresidents] = useState<President[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from('history_timeline').select('id,year,title,body,icon').order('sort_order'),
        supabase.from('history_presidents').select('id,name,years').order('sort_order'),
      ])
      setTimeline((t ?? []) as TimelineEntry[])
      setPresidents((p ?? []) as President[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">Our History</h1>
        <p className="mt-1 text-sm text-muted-foreground">Catholic Faith Defenders, 1935–2026</p>

        <blockquote className="mt-6 border-l-4 border-primary pl-4 italic text-muted-foreground">
          &ldquo;Always be ready to give an explanation to anyone who asks you for a reason for
          your hope.&rdquo;
          <footer className="mt-1 text-sm not-italic">— 1 Peter 3:15</footer>
        </blockquote>

        <p className="mt-6 text-sm leading-7 text-foreground">
          What began as scattered parish gatherings in Cebu answering the door-to-door
          proselytism of the early twentieth century grew, over six decades, into a
          nationally recognized lay apostolate under the Catholic Bishops&rsquo; Conference of
          the Philippines. This is that story, told in order.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner weight="light" size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Timeline */}
            {timeline.length > 0 && (
              <div className="relative mt-10 space-y-8 border-l-2 border-border pl-6">
                {timeline.map((entry) => (
                  <div key={entry.id} className="relative">
                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-background">
                      {ICON_MAP[entry.icon] ?? <Users weight="light" size={18} />}
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {entry.year}
                    </p>
                    <h2 className="mt-0.5 text-sm font-semibold text-foreground">{entry.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* National Presidents */}
            {presidents.length > 0 && (
              <>
                <h2 className="mt-12 text-lg font-bold text-foreground">National Presidents</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Leadership of the organization across its history, as documented in the CFD archives.
                </p>
                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-2 font-semibold text-foreground">President</th>
                        <th className="px-4 py-2 font-semibold text-foreground">Years Served</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presidents.map((p, i) => (
                        <tr key={p.id} className={i > 0 ? 'border-t border-border' : ''}>
                          <td className="px-4 py-2 text-foreground">{p.name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{p.years}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        <p className="mt-8 text-sm leading-7 text-foreground">
          Today, the CFD is governed by a national Board of Governors under the ecclesiastical
          guidance of the CBCP Episcopal Commission for the Laity, with Most Rev. Alberto S. Uy,
          D.D., serving as Archbishop Protector for the 2025–2028 term. Local chapters carry the
          same mission forward at the parish level — equipping lay Catholics to know, defend, and
          live their faith.
        </p>

        <p className="mt-8 text-xs text-muted-foreground">
          Source: Jalbuna, J. M., &amp; Mejillano, R. (2026). <em>Catholic Faith Defenders,
          1960&ndash;2026</em>. Unpublished institutional history, Catholic Faith Defenders
          National Office.
        </p>
      </div>
    </div>
  )
}
